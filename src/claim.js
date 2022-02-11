const { ethers, utils } = require("ethers");
const apiResponses = require("./common/apiHelper").apiResponses;
const apiError = require("./common/apiHelper").apiError;
//const AWS = require("aws-sdk");
const generateEip712Hash = require("./common/eip712signature").generateEip712Hash;
const getClaimSecrets = require("./common/secretsManager").getClaimSecrets;

//const Y2123_ABI = require("../contract/Y2123.json");
const CLANS_ABI = require("../contract/Clans.json");

//const dynamoDb = new AWS.DynamoDB.DocumentClient();

const seconds_since_epoch = () => {
  return Math.floor(Date.now() / 1000);
};

module.exports.handler = async (event) => {
  const provider = new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_API);
  //const y2123Contract = new ethers.Contract(process.env.Y2123_CONTRACT, Y2123_ABI.abi, provider);
  const clansContract = new ethers.Contract(process.env.CLANS_CONTRACT, CLANS_ABI.abi, provider);

  const addr = event.queryStringParameters.addr;
  if (!addr) {
    return apiResponses._400({ message: "empty account id" });
  }

  let clanTokenClaimVal = 0;
  let benificiaryOfTaxVal = "0x0000000000000000000000000000000000000000";
  let oxgnTokenTaxVal = 0;

  let accountNonce = 0;
  try {
    accountNonce = await clansContract.accountNonce(addr);
  } catch (e) {
    apiError._400(e);
  }

  try {
    var stakedTokens = await clansContract.stakedTokensOfOwner(process.env.Y2123_CONTRACT, addr);
  } catch (e) {
    apiError._400(e);
  }
  stakedTokens.forEach((element) => console.log(element.toNumber()));

  const tankCap = 10000;
  try {
    var [staked, claimable] = await clansContract.claimableOfOwner(process.env.Y2123_CONTRACT, addr);
    var serverTimestamp = seconds_since_epoch();
    //console.log(serverTimestamp);
    let totalClaimableSeconds = 0;
    const ratePerSeconds = 0.005;
    claimable.forEach((element) => {
      const diff = serverTimestamp - element.toNumber();
      if (diff > 0) {
        totalClaimableSeconds += diff;
      }
      console.log(diff);
    });
    var amount = Math.floor(totalClaimableSeconds * ratePerSeconds);
    if (amount > tankCap) {
      amount = tankCap;
    }
  } catch (e) {
    apiError._400(e);
  }

  let donate = 0;
  let donateParam = event.queryStringParameters.donate;
  if (!donateParam) {
    donate = 0;
  } else {
    if (parseInt(donateParam) > amount || parseInt(donateParam) < 0) {
      return apiResponses._400({ message: "donate should be lesser then claim" });
    }
    donate = parseInt(donateParam);
    amount = amount - donate;
  }

  let domain = [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
    { name: "verifyingContract", type: "address" },
  ];

  //Claim(address account,uint256 oxgnTokenClaim,uint256 oxgnTokenDonate,uint256 clanTokenClaim,address benificiaryOfTax,uint256 oxgnTokenTax,uint256 nonce,uint256 timestamp)
  let claim = [
    { name: "account", type: "address" },
    { name: "oxgnTokenClaim", type: "uint256" },
    { name: "oxgnTokenDonate", type: "uint256" },
    { name: "clanTokenClaim", type: "uint256" },
    { name: "benificiaryOfTax", type: "address" },
    { name: "oxgnTokenTax", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "timestamp", type: "uint256" },
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
    timestamp: serverTimestamp,
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
    oxgnTokenClaim: amount,
    oxgnTokenDonate: donate,
    clanTokenClaim: clanTokenClaimVal,
    benificiaryOfTax: benificiaryOfTaxVal,
    oxgnTokenTax: oxgnTokenTaxVal,
    timestamp: serverTimestamp,
    joinSignature,
  });
};
