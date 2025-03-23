const { buildPoseidon } = require('circomlibjs');

// Initialize Poseidon hasher
let poseidonHasher = null;

// Load poseidon asynchronously
(async () => {
  try {
    poseidonHasher = await buildPoseidon();
    console.log("Poseidon hasher initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Poseidon hasher:", error);
  }
})();

/**
 * Converts various input types to field elements suitable for Poseidon
 * @param {*} input - The input to convert
 * @param {Object} poseidon - Poseidon hasher
 * @returns {BigInt} The input as a field element
 */
function toFieldElement(input, poseidon) {
  const FIELD_SIZE = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
  
  if (typeof input === 'string') {
    // Handle hex strings
    if (input.startsWith('0x')) {
      return poseidon.F.e(BigInt(input));
    }
    
    // Handle regular strings by converting to bytes then to a field element
    const encoder = new TextEncoder();
    const bytes = encoder.encode(input);
    let num = BigInt(0);
    
    for (let i = 0; i < bytes.length; i++) {
      num = (num << BigInt(8)) + BigInt(bytes[i]);
    }
    
    return poseidon.F.e(num % FIELD_SIZE);
  }
  
  // Handle numbers
  if (typeof input === 'number') {
    return poseidon.F.e(BigInt(input));
  }
  
  // Handle BigInts
  if (typeof input === 'bigint') {
    return poseidon.F.e(input);
  }
  
  throw new Error(`Unsupported input type: ${typeof input}`);
}

/**
 * Calculate Poseidon hash of the given inputs
 * @param {Array} inputs - Array of values to hash
 * @returns {Promise<string>} The resulting hash as a hex string
 */
async function calculateHash(inputs) {
  if (!poseidonHasher) {
    throw new Error('Poseidon hasher not initialized yet, please try again later');
  }
  
  // Convert all inputs to field elements
  const fieldElements = inputs.map(input => toFieldElement(input, poseidonHasher));
  
  // Calculate the hash
  const hash = poseidonHasher(fieldElements);
  
  // Convert to hex string
  const hashHex = "0x" + poseidonHasher.F.toString(hash);
  
  return hashHex;
}

module.exports = {
  calculateHash
};