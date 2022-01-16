/**
 * Javascript module to construct and hash EIP-712 typed messages to be signed by private key.
 * [EIP712]{@link https://github.com/ethereum/EIPs/blob/master/EIPS/eip-712.md} standard
 *
 * @author Ashwin Yardi
 * @module eip712Signature
 */

 const { padLeft, sha3 } = require("web3-utils");
 const web3EthAbi = require("web3-eth-abi");
 
 function keccak256Hash(data) {
   return padLeft(sha3(data).slice(2), 64);
 }
 
 /**
  * Create 'type' component of a struct
  *
  * @method encodeStruct
  * @param {string} primaryType the top-level type of the struct
  * @param {Object} types set of all types encompassed by struct
  * @param {string} types.name name
  * @param {string} types.type type
  * @returns {string} encoded type string
  */
 function encodeStruct(primaryType, types) {
   const findTypes = (type) =>
     [type].concat(
       types[type].reduce((acc, { type: typeKey }) => {
         if (types[typeKey] && acc.indexOf(typeKey) === -1) {
           return [...acc, ...findTypes(typeKey)];
         }
         return acc;
       }, [])
     );
   return [primaryType]
     .concat(
       findTypes(primaryType)
         .sort((a, b) => a.localeCompare(b))
         .filter((a) => a !== primaryType)
     )
     .reduce(
       (acc, key) =>
         `${acc}${key}(${types[key]
           .reduce((iacc, { name, type }) => `${iacc}${type} ${name},`, "")
           .slice(0, -1)})`,
       ""
     );
 }
 
 /**
  * Recursively encode a struct's data into a unique string
  *
  * @method encodeMessageData
  * @param {Object} types set of all types encompassed by struct
  * @param {string} types.name name
  * @param {string} types.type type
  * @param {string} primaryType the top-level type of the struct
  * @param {Object} message the struct instance's data
  * @returns {string} encoded message data string
  */
 function encodeMessageData(types, primaryType, message) {
   return types[primaryType].reduce((acc, { name, type }) => {
     if (types[type]) {
       return `${acc}${keccak256Hash(
         `0x${encodeMessageData(types, type, message[name])}`
       )}`;
     }
     if (type === "string" || type === "bytes") {
       return `${acc}${keccak256Hash(message[name])}`;
     }
     if (type.includes("[")) {
       return `${acc}${keccak256Hash(
         web3EthAbi.encodeParameter(type, message[name])
       )}`;
     }
     return `${acc}${web3EthAbi
       .encodeParameters([type], [message[name]])
       .slice(2)}`;
   }, keccak256Hash(encodeStruct(primaryType, types)));
 }
 
 /**
  * Construct EIP-712 standardised message hash to be signed.
  *
  * @method generateEip712Hash
  * @param {Object} typedData the EIP712 typed object
  * @returns {string} encoded message string
  */
 function generateEip712Hash(typedData) {
   const domainHash = keccak256Hash(
     `0x${encodeMessageData(typedData.types, "EIP712Domain", typedData.domain)}`
   );
   const structHash = keccak256Hash(
     `0x${encodeMessageData(
       typedData.types,
       typedData.primaryType,
       typedData.message
     )}`
   );
   return `0x${keccak256Hash(`0x1901${domainHash}${structHash}`)}`;
 }
 
 module.exports = {
   generateEip712Hash,
   encodeMessageData,
   encodeStruct,
 };