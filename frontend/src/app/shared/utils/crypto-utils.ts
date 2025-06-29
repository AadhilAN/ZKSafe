//import * as snarkjs from 'snarkjs';
// import * as crypto from 'crypto';
import * as CryptoJS from 'crypto-js';
import { groth16 } from 'snarkjs';
import * as sss from 'shamirs-secret-sharing';
import { Buffer } from 'buffer';
import { ethers, Wallet } from 'ethers';
/**
 * Generates a device fingerprint using browser information
 * @returns A hex string hash uniquely identifying the device
 */
export async function getDeviceFingerprint(): Promise<string> {
    const screenInfo = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const language = navigator.language;
    const userAgent = navigator.userAgent;
    
    // Combine fingerprint data
    const deviceFingerprintData = `${screenInfo}-${timeZone}-${language}-${userAgent}`;
    
    // Hash using browser's native crypto API
    return await hashValue(deviceFingerprintData);
}
  
// Hash value using browser's native crypto API
export async function hashValue(value: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(value);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return '0x' + hashHex;
}

/**
 * Converts a string to a field element using a consistent algorithm
 * across frontend and backend
 * @param str The string to convert
 * @returns A bigint representing the field element
 */
export function stringToFieldElement(str: string): bigint {
    // This must match exactly the algorithm used on the server
    const FIELD_SIZE = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
    
    // Convert string to bytes
    const bytes = new TextEncoder().encode(str);
    
    // Combine bytes into a single number
    let result = BigInt(0);
    for (let i = 0; i < bytes.length; i++) {
        result = (result << BigInt(8)) | BigInt(bytes[i]);
    }
    
    // Ensure it's within the field size using the exact same modulus as server
    return result % FIELD_SIZE;
}

export async function convertInputToField(input: string): Promise<string> {
    if (typeof input === 'string') {
      // Case 1: input is a hex string
      if (input.startsWith('0x')) {
        return BigInt(input).toString();
      }
  
      // Case 2: base64-like or very long (AES ciphertext etc.)
      if (/[+/=]/.test(input) || input.length > 100) {
        const hash = await hashValue(input); // browser SHA-256
        return BigInt(hash).toString();
      }
    }
  
    // Case 3: number or plain string
    return input.toString();
  }

// // Use the server-side API for poseidon hashing instead of trying to run it in browser
export async function poseidonHash(inputs: any[]): Promise<string> {
    try {
        // Always use the API for poseidon hashing
        const response = await fetch('http://localhost:5010/api/hash/poseidon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inputs })
        });
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const result = await response.json();
        return result.hash;
    } catch (apiError) {
        console.error("Poseidon hash API failed:", apiError);
        
        // Fallback to SHA-256 with clear warning
        console.warn("WARNING: Using SHA-256 instead of Poseidon - NOT secure for production!");
        if (inputs.length === 1) {
            return await hashValue(inputs[0].toString());
        } else {
            return await hashValue(inputs.join("_"));
        }
    }
}

export async function calculateHash(inputs: string[]): Promise<string> {
    try {
      if (inputs.length === 0 || inputs.length > 3) {
        throw new Error('Only 1 to 3 inputs are supported');
      }
      console.log("Inputs for ZKP hash:", inputs);
  
      const circuitMap: Record<number, string> = {
        1: 'hash/hash.wasm',
        2: 'hash/hash2.wasm',
        3: 'hash/hash3.wasm'
      };
  
      const zkeyMap: Record<number, string> = {
        1: 'hash/hash_0000.zkey',
        2: 'hash/hash2_0000.zkey',
        3: 'hash/hash3_0000.zkey'
      };
  
      const wasmPath = `assets/${circuitMap[inputs.length]}`;
      const zkeyPath = `assets/${zkeyMap[inputs.length]}`;
  
      const plainText = await Promise.all(inputs.map(convertInputToField));
      const circuitInput = { plainText };
      console.log("Circuit Input:", circuitInput);

      const [wasmBuffer, zkeyBuffer] = await Promise.all([
        fetch(wasmPath).then(res => res.arrayBuffer()),
        fetch(zkeyPath).then(res => res.arrayBuffer())
      ]);
  
      //https://github.com/iden3/snarkjs#in-the-browser
      const { proof, publicSignals } = await groth16.fullProve(
        circuitInput,
        new Uint8Array(wasmBuffer),
        new Uint8Array(zkeyBuffer)
      );
      console.log("Public Signals:", publicSignals);
  
      const hash = publicSignals[0];
      console.log("Hash:", hash);
      // Convert to hex string
      const hashHex = BigInt(hash).toString(16);
      console.log("Sending: ", hashHex);
      return '0x' + BigInt(hash).toString(16);
  
    } catch (err) {
      console.error("Error calculating ZKP hash in browser:", err);
      throw err;
    }
  }

  /**
 * Combines Shamir's Secret Sharing shares to reconstruct the original secret
 * @param shares The shares as Uint8Array[]
 * @returns The reconstructed secret as a string
 */
export async function combineShares(shares: Uint8Array[]): Promise<string> {
  // Combine the shares to reconstruct the secret
  const recoveredBuffer = sss.combine(shares);
  
  // Convert Buffer back to string
  return recoveredBuffer.toString('utf8');
}

/**
* Reconstructs and decrypts a private key from Shamir's Secret Sharing shares
 * @param sharesBase64 Array of base64-encoded shares
 * @param password Password to decrypt the wallet
 * @returns The decrypted private key
 */
export async function reconstructAndDecryptPrivateKey(
  encryptedUserShard: string,
  otherSharesBase64: string[],
  password: string
): Promise<string> {
  try {
    // Step 1: Decrypt the AES-encrypted user shard using password
    const decryptedShard = CryptoJS.AES.decrypt(encryptedUserShard, password).toString(CryptoJS.enc.Utf8);

    if (!decryptedShard) {
      throw new Error('Failed to decrypt user shard. Password may be incorrect.');
    }

    // Step 2: Combine it with other base64-encoded shares
    const allSharesBase64 = [decryptedShard, ...otherSharesBase64];
    const shares: Uint8Array[] = allSharesBase64.map(share => Buffer.from(share, 'base64'));

    // Step 3: Reconstruct encrypted wallet JSON
    const encryptedJson = sss.combine(shares).toString('utf8');

    // Step 4: Decrypt the encrypted wallet using ethers
    const wallet = await Wallet.fromEncryptedJson(encryptedJson, password);

    return wallet.privateKey;
  } catch (error) {
    console.error('Error reconstructing or decrypting private key:', error);
    throw new Error('Failed to reconstruct or decrypt private key');
  }
}
  