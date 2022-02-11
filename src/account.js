const { ethers, utils } = require("ethers");
const apiResponses = require("./common/apiHelper.js").apiResponses;
const apiError = require("./common/apiHelper").apiError;
const AWS = require("aws-sdk");
const Y2123_ABI = require("../contract/Y2123.json");

const dynamoDb = new AWS.DynamoDB.DocumentClient();

const dailyRewardCalculator = (id) => {
  if (parseInt(id) < 500) {
    return "438";
  } else if (parseInt(id) < 3000) {
    return "197";
  } else if (parseInt(id) < 10000) {
    return "99";
  }
  return "0";
};

module.exports.handler = async (event) => {
  const provider = new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_API);
  const y2123Contract = new ethers.Contract(process.env.Y2123_CONTRACT, Y2123_ABI.abi, provider);

  const addr = event.queryStringParameters.addr;
  if (!addr) {
    return apiResponses._400({ message: "empty account id" });
  }

  let tokens = [];
  try {
    tokens = await y2123Contract.getTokenIDs(addr);
    if (tokens.length < 1) {
      return apiResponses._200({});
    }
  } catch (e) {
    apiError._400(e);
  }

  let keys = [];
  let links = [];
  let dailyRewards = [];
  tokens.forEach((element) => {
    keys.push({ name: `Y2123#${String(element)}` });
    links.push(`https://opensea.io/assets/${process.env.Y2123_CONTRACT}/` + String(element));
    dailyRewards.push(dailyRewardCalculator(String(element)));
  });
  console.log(keys);

  const tableName = process.env.METADATA_TABLE;
  const params = {
    RequestItems: {
      [tableName]: {
        Keys: keys,
        ProjectionExpression: "#n, image",
        ExpressionAttributeNames: { "#n": "name" },
      },
    },
  };
  const results = await dynamoDb.batchGet(params).promise();
  let [first] = Object.keys(results.Responses);
  const resultArray = results.Responses[first];
  console.log(resultArray);

  let unstakedNft = [];
  resultArray.forEach((element, i) => {
    unstakedNft.push({
      name: element.name,
      image: element.image,
      link: links[i],
      dailyReward: dailyRewards[i],
    });
  });
  //console.log(unstakedNft);

  return apiResponses._200({ unstakedNft: unstakedNft });
};
