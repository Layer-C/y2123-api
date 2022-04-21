const apiResponses = require('./common/apiHelper.js').apiResponses;
const AWS = require('aws-sdk');

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event) => {
  const id = event.queryStringParameters.id;
  if (!id) {
    return apiResponses._400({ message: 'invalid id' });
  }

  /*
  const params = {
    TableName: 'land-metadata',
    Key: {
      name: `LAND#${id}`,
    },
  };
  const results = await dynamoDb.get(params).promise();

  return apiResponses._200(results.Item);
  */

  return apiResponses._200({
    attributes: [
      {
        value: "Land Token",
        trait_type: "Type"
      }
    ],
    description: "[Y2123](https://www.y2123.com)",
    name: `LAND#${id}`,
    image: "https://img-land.y2123.io/0.png",
    animation_url: "https://babylon1.s3.amazonaws.com/index.html?id=2"
  });
};