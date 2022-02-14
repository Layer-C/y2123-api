const { ethers } = require("ethers");
const apiResponses = require("./common/apiHelper.js").apiResponses;
const CLANS_ABI = require("../contract/Clans.json");

module.exports.handler = async (event) => {
  const id = event.queryStringParameters.id;
  if (!id || parseInt(id) < 1 || parseInt(id) > 3) {
    return apiResponses._400({ message: "invalid id" });
  }

  const provider = new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_API);
  const clansContract = new ethers.Contract(process.env.CLANS_CONTRACT, CLANS_ABI.abi, provider);

  try {
    var accounts = await clansContract.getAccountsInClan(id);
  } catch (e) {
    apiError._400(e);
  }

  let totalStaked = 0;
  try {
    await Promise.all(
      accounts.map(async (element) => {
        const stakedTokens = await clansContract.stakedTokensOfOwner(process.env.Y2123_CONTRACT, String(element));
        //console.log(stakedTokens);
        totalStaked += stakedTokens.length;
      }),
    );
  } catch (e) {
    apiError._400(e);
  }

  // clans total NFT staked and unique wallet, clan leader
  return apiResponses._200({
    uniqueAccount: accounts.length.toString(),
    totalStaked: totalStaked.toString(),
  });
};
