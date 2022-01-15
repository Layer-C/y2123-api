import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { ethers } from 'ethers';
import ABI from '../contract/Y2123.json';
import apiResponses from './common/apiResponses';
import AWS from 'aws-sdk';

const dynamoDb = new AWS.DynamoDB.DocumentClient();

interface UnstakedNft {
  name: string;
  image: string;
  link?: string;
  dailyReward?: string;
}

interface Key {
  name: string;
}

const dailyRewardCalculator = (id: string): string => {
  if (parseInt(id) < 500) {
    return '4';
  } else if (parseInt(id) < 3000) {
    return '3';
  } else if (parseInt(id) < 10000) {
    return '2';
  }

  return '1';
};

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

  let tokens: any = [];
  try {
    tokens = await contract.getTokenIDs(id);
  } catch (e) {
    if (typeof e === 'string') {
      return apiResponses._400({ message: e.toUpperCase() });
    } else if (e instanceof Error) {
      return apiResponses._400({ message: e.message });
    }
  }

  if (tokens.length < 1) {
    return apiResponses._200({});
  }

  let keys: Key[] = [];
  let links: string[] = [];
  let dailyRewards: string[] = [];
  tokens.forEach((element: any) => {
    keys.push(<Key>{ name: `#${String(element)}` });
    links.push(
      `https://opensea.io/assets/${process.env.Y2123_CONTRACT!}/` +
        String(element)
    );
    dailyRewards.push(dailyRewardCalculator(String(element)));
  });
  console.log(keys);

  const tableName = process.env.METADATA_TABLE!;
  const params: AWS.DynamoDB.DocumentClient.BatchGetItemInput = {
    RequestItems: {
      [tableName!]: {
        Keys: keys,
        ProjectionExpression: '#n, image',
        ExpressionAttributeNames: { '#n': 'name' },
      },
    },
  };
  const results = await dynamoDb.batchGet(params).promise();
  let [first] = Object.keys(results.Responses!);
  const resultArray = results.Responses![first];
  console.log(resultArray);

  let unstakedNft: UnstakedNft[] = [];
  resultArray.forEach((element: any, i: number) => {
    unstakedNft.push(<UnstakedNft>{
      name: element.name,
      image: element.image,
      link: links[i],
      dailyReward: dailyRewards[i],
    });
  });
  console.log(unstakedNft);

  return apiResponses._200(unstakedNft);
};
