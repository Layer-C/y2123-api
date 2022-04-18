const { ethers } = require("ethers");
const apiResponses = require("./common/apiHelper.js").apiResponses;
const apiError = require("./common/apiHelper").apiError;
const getClaimable = require("./common/claimable").getClaimable;
const AWS = require("aws-sdk");
const Y2123_ABI = require("../contract/Y2123.json");
const CLANS_ABI = require("../contract/Clans.json");
const LAND_ABI = require("../contract/Land.json");
//const dynamoDb = new AWS.DynamoDB.DocumentClient();

const dailyRewardCalculator = (id) => {
  if (parseInt(id) < 500) {
    return "24";
  } else if (parseInt(id) < 3000) {
    return "20";
  } else if (parseInt(id) < 10000) {
    return "16";
  }
  return "0";
};

module.exports.handler = async (event) => {
  const provider = new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_API);
  const y2123Contract = new ethers.Contract(process.env.Y2123_CONTRACT, Y2123_ABI.abi, provider);
  const clansContract = new ethers.Contract(process.env.CLANS_CONTRACT, CLANS_ABI.abi, provider);
  const landContract = new ethers.Contract(process.env.LAND_CONTRACT, LAND_ABI.abi, provider);

  const addr = event.queryStringParameters.addr;
  if (!addr) {
    return apiResponses._400({ message: "empty account id" });
  }

  try {
    var tokens = await y2123Contract.getTokenIDs(addr);
  } catch (e) {
    return apiError._400(e);
  }
  let unstakedNft = [];
  if (tokens !== undefined && tokens.length > 0) {
    tokens.forEach((element) => {
      unstakedNft.push({
        name: `Y2123#${String(element)}`,
        image: `https://img-cs.y2123.io/${String(element)}.png`,
        link: `https://opensea.io/assets/${process.env.Y2123_CONTRACT}/${String(element)}`,
        dailyReward: dailyRewardCalculator(String(element)),
      });
    });
  }

  try {
    var stakedTokens = await clansContract.stakedTokensOfOwner(process.env.Y2123_CONTRACT, addr);
  } catch (e) {
    return apiError._400(e);
  }
  let stakedNft = [];
  if (stakedTokens !== undefined && stakedTokens.length > 0) {
    stakedTokens.forEach((element) => {
      stakedNft.push({
        name: `Y2123#${String(element)}`,
        image: `https://img-cs.y2123.io/${String(element)}.png`,
        link: `https://opensea.io/assets/${process.env.Y2123_CONTRACT}/${String(element)}`,
        dailyReward: dailyRewardCalculator(String(element)),
      });
    });
  }

  const totalCS = unstakedNft.length + stakedNft.length;

  try {
    var landTokens = await landContract.getTokenIDs(addr);
  } catch (e) {
    return apiError._400(e);
  }
  let landNft = [];
  if (landTokens !== undefined && landTokens.length > 0) {
    landTokens.forEach((element) => {
      landNft.push({
        name: `LAND#${String(element)}`,
        image: `https://img-land.y2123.io/${String(element)}.png`,
        link: `https://opensea.io/assets/${process.env.LAND_CONTRACT}/${String(element)}`,
      });
    });
  }

  try {
    var totalClaim = await clansContract.accountTotalClaim(addr);
    var totalDonate = await clansContract.accountTotalDonate(addr);
    var totalClanClaim = await clansContract.accountTotalClanClaim(addr);
    const accountToLastClaim = await clansContract.accountToLastClaim(addr);
    var lastClaim = accountToLastClaim[0];
    var lastDonate = accountToLastClaim[1];
    const clan = await clansContract.clanStructs(addr);
    var clanId = clan[0];
  } catch (e) {
    return apiError._400(e);
  }

  try {
    var [amount, tankCap, serverTimestamp] = await getClaimable(clansContract, addr);
  } catch (e) {
    return apiError._400(e);
  }

  // Total CS nft, total OXGN earned, total Donated, Last claim earned, clanID, vault pending amount, vault cap(hardcode),
  try {
    return apiResponses._200({
      claimable: amount.toString(),
      tankCap: tankCap.toString(),
      totalCS: totalCS.toString(),
      clanId: clanId.toString(),
      lastClaim: lastClaim.toString(),
      lastDonate: lastDonate.toString(),
      totalClaim: totalClaim.toString(),
      totalDonate: totalDonate.toString(),
      totalClanClaim: totalClanClaim.toString(),
      stakedNft: stakedNft,
      unstakedNft: unstakedNft,
      landNft: landNft,
    });
  } catch (e) {
    return apiError._400(e);
  }
};
