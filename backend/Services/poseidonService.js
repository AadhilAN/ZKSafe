const snarkjs = require('snarkjs');
const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const crypto = require('crypto');

async function calculateHash(inputs) {
  try {
    console.log("Calculating hash for inputs:", inputs);

    if (!Array.isArray(inputs)) {
      throw new Error('Inputs must be an array');
    }

    if (inputs.length <= 0) {
      throw new Error('Input array must not be empty');
    }

    const circuitConfig = {
      1: 'hash_js/hash.wasm',
      2: 'hash2_js/hash2.wasm',
      3: 'hash3_js/hash3.wasm'
    };

    const inputCount = inputs.length;
    if (!(inputCount in circuitConfig)) {
      throw new Error(`Unsupported input count: ${inputCount}`);
    }

    const wasmSubpath = circuitConfig[inputCount];
    const wasmPath = path.join(__dirname, `../../ZKP/circuits/${wasmSubpath}`);

    if (!fs.existsSync(wasmPath)) {
      throw new Error(`WASM file not found at path: ${wasmPath}. Ensure the file exists and the path is correct.`);
    }

    // Create a temp directory for our files
    const tempDir = tmpdir();
    const sessionId = crypto.randomBytes(8).toString('hex');
    
    // Prepare input JSON file
    const circuitInputs = {
      plainText: inputs.map(input => {
        if (typeof input === 'string') {
          // Handle hex inputs
          if (input.startsWith('0x')) {
            return BigInt(input).toString();
          }
          
          // Check if the input looks like base64 (contains characters that wouldn't be in a number)
          if (/[+/=]/.test(input) || input.length > 100) {
            // For base64 or other non-numeric strings, hash them first to get a numeric representation
            const crypto = require('crypto');
            const hash = crypto.createHash('sha256').update(input).digest('hex');
            return BigInt('0x' + hash).toString();
          }
        }
        
        // If it's a number or looks like a number string, use it directly
        return input.toString();
      })
    };
    
    // console.log(`Processing ${inputCount} inputs:`, circuitInputs.plainText);
    
    // Write input to a temporary JSON file
    const inputJsonPath = path.join(tempDir, `input_${sessionId}.json`);
    const inputJson = JSON.stringify(circuitInputs, null, 2);
    // console.log("Generated input JSON:", inputJson);
    fs.writeFileSync(inputJsonPath, inputJson);
    
    // Define output witness file path
    const witnessPath = path.join(tempDir, `witness_${sessionId}.wtns`);
    
    // Generate witness using the command line approach but via the API
    await snarkjs.wtns.calculate(circuitInputs, wasmPath, witnessPath);
    
    // Export witness to JSON
    const witnessJson = await snarkjs.wtns.exportJson(witnessPath);
    
    // The hash is the last element in the witness array
    const hashValue = witnessJson[1];
    console.log("Extracted hash value:", hashValue);
    
    // Clean up temporary files
    try {
      fs.unlinkSync(inputJsonPath);
      fs.unlinkSync(witnessPath);
    } catch (err) {
      console.warn("Error cleaning up temporary files:", err.message);
    }

    if (!hashValue) {
      throw new Error('Failed to extract hash value from witness data');
    }

    return '0x' + BigInt(hashValue).toString(16);

  } catch (error) {
    console.error("Hash calculation failed:", error.message);
    throw error;
  }
}

module.exports = {
  calculateHash
};