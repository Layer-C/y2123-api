"use strict";

const axios = require("axios");
const { InteractionResponseType, InteractionType, verifyKey } = require("discord-interactions");
const getDiscordSecrets = require("./common/secretsManager.js").getDiscordSecrets;
const apiKeyName = require("./common/secretsManager.js").apiKeyName;
const { SQS } = require("aws-sdk");
const sqs = new SQS();

module.exports.discordHandler = async (event, ctx, callback) => {
  // TODO: clean up later when confident about event structure
  console.log("event: " + JSON.stringify(event, null, 2));

  // get discord secrets
  const discordSecrets = await getDiscordSecrets();

  // Verify the request
  const signature = event.headers["x-signature-ed25519"];
  const timestamp = event.headers["x-signature-timestamp"];

  const rawBody = event.body;
  const isValidRequest = await verifyKey(rawBody, signature, timestamp, discordSecrets.CLIENT_PUBLIC_KEY);
  if (!isValidRequest) {
    console.error("Invalid request, return 401.");
    return callback(null, {
      statusCode: 401,
      body: "Bad request signature",
    });
  }

  // Handle the payload
  // TODO: safeguard json parse?
  const interaction = JSON.parse(event.body);
  if (interaction && interaction.type === InteractionType.APPLICATION_COMMAND) {
    console.log("Identified incoming command. Assuming it is /dadjoke.");

    // Fetch icanhazdadjoke from API
    console.log("Fetching joke from API.");
    const jokeApiResponse = await axios.get("https://icanhazdadjoke.com/", {
      headers: {
        Accept: "application/json",
        "User-Agent": "axios 0.23.0",
      },
    });

    let joke = "Yeah... Not funny, but something didn't quite work.";
    if (jokeApiResponse && jokeApiResponse.data && jokeApiResponse.data.joke) {
      console.log("Successfully fetched joke from API.");
      joke = jokeApiResponse.data.joke;
    } else {
      console.error("Failed to fetch joke from API.");
    }

    const responseBody = JSON.stringify({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        tts: false,
        content: joke,
        embeds: [],
        allowed_mentions: [],
      },
    });

    return responseBody;
  } else {
    console.log("Not application command, assuming a ping. Return pong.");

    callback(null, {
      statusCode: 200,
      body: JSON.stringify({
        type: InteractionResponseType.PONG,
      }),
    });
  }
};

module.exports.endpoint = async (event, ctx, callback) => {
  // TODO: clean up later when confident about event structure
  console.log("event: " + JSON.stringify(event, null, 2));

  // get discord secrets
  const discordSecrets = await getDiscordSecrets();

  // Verify the request
  const signature = event.headers["x-signature-ed25519"];
  const timestamp = event.headers["x-signature-timestamp"];

  const rawBody = event.body;
  const isValidRequest = await verifyKey(rawBody, signature, timestamp, discordSecrets.CLIENT_PUBLIC_KEY);
  if (!isValidRequest) {
    console.error("Invalid request, return 401.");
    return callback(null, {
      statusCode: 401,
      body: "Bad request signature",
    });
  }

  // Handle the payload
  // TODO: safeguard json parse?
  const interaction = JSON.parse(event.body);

  if (interaction && interaction.type === InteractionType.APPLICATION_COMMAND) {
    // got a command, assuming it is /dadjoke
    console.log("Identified incoming command. Queuing it up to be consumed by sender method.");
    let statusCode = 200;

    try {
      await sqs
        .sendMessage({
          QueueUrl: process.env.QUEUE_URL,
          MessageBody: event.body,
          MessageAttributes: {
            AttributeName: {
              StringValue: "Attribute Value",
              DataType: "String",
            },
          },
        })
        .promise();
    } catch (error) {
      console.log(error);
      statusCode = 500;
    }

    return {
      statusCode,
      body: JSON.stringify({
        type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
      }),
    };
  } else {
    console.log("Not an application command, assuming a ping. Return pong.");

    return {
      statusCode: 200,
      body: JSON.stringify({
        type: InteractionResponseType.PONG,
      }),
    };
  }
};

module.exports.sender = async (event) => {
  for (const record of event.Records) {
    const messageAttributes = record.messageAttributes;
    console.log("Message Attribute: ", messageAttributes.AttributeName.stringValue);
    console.log("Message Body: ", record.body);

    // grab the token and interaction id
    // TODO: beware of risky parsing and assuming the token will be there. make more resilient.
    const jsonBody = JSON.parse(record.body);
    const interactionToken = jsonBody.token;
    const interactionId = jsonBody.id;

    // fetch joke from api
    console.log("Fetching joke from API.");
    const jokeApiResponse = await axios.get("https://icanhazdadjoke.com/", {
      headers: {
        Accept: "application/json",
        "User-Agent": "axios 0.23.0",
      },
    });

    // parse response
    let joke = "Yeah... Not funny, but something didn't quite work.";
    if (jokeApiResponse && jokeApiResponse.data && jokeApiResponse.data.joke) {
      console.log("Successfully fetched joke from API.");
      joke = jokeApiResponse.data.joke;
    } else {
      console.error("Failed to fetch joke from API.");
    }

    // send response to discord
    const responseBody = {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: joke,
      },
    };

    const url = `https://discord.com/api/v8/interactions/${interactionId}/${interactionToken}/callback`;

    const response = await axios
      .post(url, responseBody, {
        headers: {
          "Content-Type": "application/json",
        },
      })
      .catch((err) => {
        console.log("error ->" + JSON.stringify(err, null, 2));
      });
  }
};
