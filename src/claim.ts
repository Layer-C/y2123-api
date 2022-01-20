import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ethers, utils } from "ethers";
import ABI from "../contract/Y2123.json";
import apiResponses from "./common/apiResponses";
import AWS from "aws-sdk";
import { generateEip712Hash } from "./common/eip712signature";
const getClaimSecrets = require("./common/discordSecret.js").getClaimSecrets;

const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const provider = new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_API);
  const contract = new ethers.Contract(process.env.Y2123_CONTRACT!, ABI.abi, provider);

  const id = event.queryStringParameters?.id;
  if (!id) {
    return apiResponses._400({ message: "empty account id" });
  }

  const amount = 11;
  const accountNonce = 1;

  let domain = [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
    { name: "verifyingContract", type: "address" },
  ];

  //MyGoldz(uint256 amount,address account,uint256 nonce)
  let claim = [
    { name: "amount", type: "uint256" },
    { name: "account", type: "address" },
    { name: "nonce", type: "uint256" },
  ];

  let domainData = {
    name: "y2123",
    version: "1.0",
    chainId: parseInt(process.env.CHAIN_ID!, 10),
    verifyingContract: process.env.CLANS_CONTRACT!,
  };

  let claimData = {
    amount: amount,
    account: id,
    nonce: accountNonce,
  };

  let eip712TypedData = {
    types: {
      EIP712Domain: domain,
      MyGoldz: claim,
    },
    domain: domainData,
    primaryType: "MyGoldz",
    message: claimData,
  };

  const eip712TypedDataHashed = generateEip712Hash(eip712TypedData);
  const claimSecrets = await getClaimSecrets();
  const signingKey = new utils.SigningKey("0x" + claimSecrets.key3);

  // Sign the message with the private key
  const signature = signingKey.signDigest(eip712TypedDataHashed);
  const joinSignature = utils.joinSignature(signature);

  return apiResponses._200({ joinSignature });
};
