const { ethers, utils } = require("ethers");
const apiResponses = require("./common/apiResponses");
const AWS = require("aws-sdk");
const generateEip712Hash = require("./common/eip712signature.js").generateEip712Hash;
const getClaimSecrets = require("./common/secretsManager.js").getClaimSecrets;

const Y2123_ABI = require("../contract/Y2123.json");
const CLANS_ABI = require("../contract/Clans.json");

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event) => {
  const provider = new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_API);
  const y2123Contract = new ethers.Contract(process.env.Y2123_CONTRACT, Y2123_ABI.abi, provider);
  const clansContract = new ethers.Contract(process.env.CLANS_CONTRACT, CLANS_ABI.abi, provider);

  const addr = event.queryStringParameters.addr;
  if (!addr) {
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "empty account id" }, null, 2),
    };
  }

  let amount = 100;

  let donate = 0;
  let donateParam = event.queryStringParameters.donate;
  if (!donateParam) {
    donate = 0;
  } else {
    let donatePercentage = parseInt(donateParam);
    if (donatePercentage > 100 || donatePercentage < 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "donate percentage should range 0 to 100" }, null, 2),
      };
    }
    donate = (amount * donatePercentage) / 100;
    amount = amount - donate;
  }

  let accountNonce = 0;
  try {
    accountNonce = await clansContract.accountNonce(addr);
  } catch (e) {
    if (typeof e === "string") {
      //return apiResponses._400({ message: e.toUpperCase() });
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "donate percentage should range 0 to 100" }, null, 2),
      };
    } else if (e instanceof Error) {
      //return apiResponses._400({ message: e.message });
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "donate percentage should range 0 to 100" }, null, 2),
      };
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
    chainId: parseInt(process.env.CHAIN_ID, 10),
    verifyingContract: process.env.CLANS_CONTRACT,
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

  //return apiResponses._200({ joinSignature, amount: amount, donate: donate });
  return {
    statusCode: 200,
    body: JSON.stringify({ joinSignature, amount: amount, donate: donate }, null, 2),
  };
};
