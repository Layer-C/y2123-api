import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ethers, utils } from "ethers";
import Y2123_ABI from "../contract/Y2123.json";
import CLANS_ABI from "../contract/Clans.json";
import apiResponses from "./common/apiResponses";
import AWS from "aws-sdk";
import { generateEip712Hash } from "./common/eip712signature";
const getClaimSecrets = require("./common/discordSecret.js").getClaimSecrets;

const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const provider = new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_API);
  const y2123Contract = new ethers.Contract(process.env.Y2123_CONTRACT!, Y2123_ABI.abi, provider);
  const clansContract = new ethers.Contract(process.env.CLANS_CONTRACT!, CLANS_ABI.abi, provider);
  
  const addr = event.queryStringParameters?.addr;
  if (!addr) {
    return apiResponses._400({ message: "empty account id" });
  }
  
  let amount = 100;

  let donate = 0;
  let donateParam = event.queryStringParameters?.donate;
  if (!donateParam) {
    donate = 0;
  } else {
    let donatePercentage = parseInt(donateParam);
    if (donatePercentage > 100 || donatePercentage < 0) {
      return apiResponses._400({ message: "donate percentage should range 0 to 100" });
    }
    donate = amount * donatePercentage / 100;
    amount = amount - donate;
  }

  let accountNonce: number = 0;
  try {
    accountNonce = await clansContract.accountNonce(addr);
  } catch (e) {
    if (typeof e === 'string') {
      return apiResponses._400({ message: e.toUpperCase() });
    } else if (e instanceof Error) {
      return apiResponses._400({ message: e.message });
    }
  }

  let domain = [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
    { name: "verifyingContract", type: "address" },
  ];

  //Claim(address account,uint256 oxgnTokenClaim,uint256 oxgnTokenDonate,uint256 clanTokenClaim,address benificiaryOfTax,uint256 oxgnTokenTax,uint256 nonce)
  let claim = [
    { name: "account", type: "address" },
    { name: "oxgnTokenClaim", type: "uint256" },
    { name: "oxgnTokenDonate", type: "uint256" },
    { name: "clanTokenClaim", type: "uint256" },
    { name: "benificiaryOfTax", type: "uint256" },
    { name: "oxgnTokenTax", type: "uint256" },
    { name: "nonce", type: "uint256" },
  ];

  let domainData = {
    name: "y2123",
    version: "1.0",
    chainId: parseInt(process.env.CHAIN_ID!, 10),
    verifyingContract: process.env.CLANS_CONTRACT!,
  };

  let claimData = {
    account: addr,
    oxgnTokenClaim: amount,
    oxgnTokenDonate: donate,
    clanTokenClaim: 1,
    benificiaryOfTax: "0x32bAD1fB90f2193854E3AC8EfCc39fc87d8A4Ce4",
    oxgnTokenTax: 1,
    nonce: accountNonce,
  };

  let eip712TypedData = {
    types: {
      EIP712Domain: domain,
      Claim: claim,
    },
    domain: domainData,
    primaryType: "Claim",
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
