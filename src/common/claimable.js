const tankCap = 10000;

const getClaimable = async (clansContract, addr) => {
  const [staked, claimable] = await clansContract.claimableOfOwner(process.env.Y2123_CONTRACT, addr);
  let totalClaimableSeconds = 0;
  const ratePerSeconds = 0.005;
  const serverTimestamp = seconds_since_epoch();
  let amount = 0;

  if (claimable !== undefined && claimable.length > 0) {
    claimable.forEach((element) => {
      const diff = serverTimestamp - element.toNumber();
      if (diff > 0) {
        totalClaimableSeconds += diff;
      }
      //console.log(diff);
    });
    amount = Math.floor(totalClaimableSeconds * ratePerSeconds);
    if (amount > tankCap) {
      amount = tankCap;
    }
  }
  return [amount, tankCap, serverTimestamp];
};

const seconds_since_epoch = () => {
  return Math.floor(Date.now() / 1000);
};

module.exports = {
  tankCap,
  getClaimable,
};
