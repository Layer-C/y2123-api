import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import apiResponses from './common/apiResponses';
import AWS from 'aws-sdk';

const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const id = event.queryStringParameters?.id;
  if (!id) {
    return apiResponses._400({ message: 'invalid id' });
  }

  const params: AWS.DynamoDB.DocumentClient.GetItemInput = {
    TableName: process.env.METADATA_TABLE!,
    Key: {
      name: `Y2123#${id}`,
    },
  };
  const results = await dynamoDb.get(params).promise();

  return apiResponses._200(results.Item!);
};