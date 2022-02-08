const { ethers, utils } = require("ethers");
const apiResponses = require("./common/apiHelper").apiResponses;
const apiError = require("./common/apiHelper").apiError;
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
    return apiResponses._400({ message: "empty account id" });
  }

  let amount = 100;
  let clanTokenClaimVal = 1;
  let benificiaryOfTaxVal = "0x32bAD1fB90f2193854E3AC8EfCc39fc87d8A4Ce4";
  let oxgnTokenTaxVal = 1;

  let donate = 0;
  let donateParam = event.queryStringParameters.donate;
  if (!donateParam) {
    donate = 0;
  } else {
    let donatePercentage = parseInt(donateParam);
    if (donatePercentage > 100 || donatePercentage < 0) {
      return apiResponses._400({ message: "donate percentage should range 0 to 100" });
    }
    donate = (amount * donatePercentage) / 100;
    amount = amount - donate;
  }

  let accountNonce = 0;
  try {
    accountNonce = await clansContract.accountNonce(addr);
  } catch (e) {
    apiError._400(e);
  }

  let stakedTokens;
  try {
    stakedTokens = await clansContract.stakedTokensOfOwner(process.env.Y2123_CONTRACT, addr);
  } catch (e) {
    apiError._400(e);
  }
  console.log(stakedTokens);

  let claimable;
  try {
    claimable = await clansContract.claimableOfOwner(process.env.Y2123_CONTRACT, addr);
  } catch (e) {
    apiError._400(e);
  }
  console.log(claimable[1]);

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
    { name: "benificiaryOfTax", type: "address" },
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
    clanTokenClaim: clanTokenClaimVal,
    benificiaryOfTax: benificiaryOfTaxVal,
    oxgnTokenTax: oxgnTokenTaxVal,
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

  return apiResponses._200({
    oxgnTokenClaim:amount, 
    oxgnTokenDonate:donate,
    clanTokenClaim:clanTokenClaimVal,
    benificiaryOfTax:benificiaryOfTaxVal,
    oxgnTokenTax:oxgnTokenTaxVal,
    joinSignature,
    nonce:accountNonce.toString(),
  });
};
