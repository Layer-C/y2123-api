import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { ethers } from 'ethers';
import ABI from '../contract/Y2123.json';
import apiResponses from './common/apiResponses';
import AWS from 'aws-sdk';

const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.ALCHEMY_API
  );
  const contract = new ethers.Contract(
    process.env.Y2123_CONTRACT!,
    ABI.abi,
    provider
  );

  const id = event.queryStringParameters?.id;
  if (!id) {
    return apiResponses._400({ message: 'empty account id' });
  }

  const amount = 11;
  const accountNonce = 1;

  return apiResponses._200({id});
};
