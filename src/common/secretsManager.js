const SecretsManager = require("aws-sdk").SecretsManager;

const claimKey = "dev/claim";
const secretsManager = new SecretsManager();

/**
 * Cached secrets so we can reduce warm start times.
 */
let __claimSecrets = undefined;

module.exports.getClaimSecrets = async () => {
  if (!__claimSecrets) {
    try {
      const keys = await secretsManager
        .getSecretValue({
          SecretId: claimKey,
        })
        .promise();
      if (keys.SecretString) {
        __claimSecrets = JSON.parse(keys.SecretString);
      }
    } catch (exception) {
      console.log(`Unable to get claim secrets: ${exception}`);
    }
  }
  return __claimSecrets;
};
