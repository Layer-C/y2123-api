const apiResponses = require('./common/apiHelper.js').apiResponses;
const AWS = require('aws-sdk');

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event) => {
  const id = event.queryStringParameters.id;
  if (!id) {
    return apiResponses._400({ message: 'invalid id' });
  }

  const params = {
    TableName: process.env.CLANS_METADATA_TABLE,
    Key: {
      name: `CLAN#${id}`,
    },
  };
  const results = await dynamoDb.get(params).promise();

  return apiResponses._200(results.Item);
};