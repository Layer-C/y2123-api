const SecretsManager = require("aws-sdk").SecretsManager;

const discordBotAPIKeyName = 'dev/y2123_bot';
const claimKey = 'dev/claim';
const secretsManager = new SecretsManager();

/**
 * Cached Discord secrets so we can reduce warm start times.
 */
let __discordSecrets = undefined;
let __claimSecrets = undefined;

/**
 * Gets the Discord secrets (public key, client ID, etc.) for use in our lambdas.
 * <p>The code assumes the returned secrets object has the following fields:
 * <ul>
 * <li>CLIENT_ID</li>
 * <li>CLIENT_PUBLIC_KEY</li>
 * <li>GUILD_ID</li>
 * <li>DISCORD_TOKEN</li>
 * </ul>
 * </p>
 * 
 * @returns The Discord secrets to be used.
 */
module.exports.getDiscordSecrets = async () => {
  if (!__discordSecrets) {
    try {
      const discordApiKeys = await secretsManager.getSecretValue({
        SecretId: discordBotAPIKeyName,
      }).promise();
      if (discordApiKeys.SecretString) {
        __discordSecrets = JSON.parse(discordApiKeys.SecretString);
      }
    } catch (exception) {
      console.log(`Unable to get Discord secrets: ${exception}`);
    }
  }
  return __discordSecrets;
};

module.exports.apiKeyName = discordBotAPIKeyName;

module.exports.getClaimSecrets = async () => {
  if (!__claimSecrets) {
    try {
      const keys = await secretsManager.getSecretValue({
        SecretId: claimKey,
      }).promise();
      if (keys.SecretString) {
        __claimSecrets = JSON.parse(keys.SecretString);
      }
    } catch (exception) {
      console.log(`Unable to get claim secrets: ${exception}`);
    }
  }
  return __claimSecrets;
};