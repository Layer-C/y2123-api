const apiResponses = require('./common/apiResponses.js');
const AWS = require('aws-sdk');

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event) => {
  const id = event.queryStringParameters.id;
  if (!id) {
    return apiResponses._400({ message: 'invalid id' });
  }

  const params = {
    TableName: process.env.METADATA_TABLE,
    Key: {
      name: `Y2123#${id}`,
    },
  };
  const results = await dynamoDb.get(params).promise();

  return apiResponses._200(results.Item);
};