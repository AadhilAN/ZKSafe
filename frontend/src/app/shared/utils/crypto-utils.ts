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
    const encoder = new TextEncoder();
    const data = encoder.encode(deviceFingerprintData);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    
    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return '0x' + hashHex;
  }
  
  // You can also add other shared crypto utilities here
  export async function hashValue(value: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(value);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return '0x' + hashHex;
  }


  export async function poseidonHash(inputs: any[]): Promise<string> {
    try {
      const circomlibjs = await import('circomlibjs');
      const poseidon = await circomlibjs.buildPoseidon();
      
      // Convert inputs to field elements
      const fieldElements = inputs.map(input => {
        if (typeof input === 'string') {
          // If input is a hex string (starts with 0x)
          if (input.startsWith('0x')) {
            return poseidon.F.e(BigInt(input));
          } 
          // If input is a regular string, convert to bytes then to field element
          const fieldPrime = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
          const encoder = new TextEncoder();
          const bytes = encoder.encode(input);
          let hexStr = '0x';
          for (const byte of bytes) {
            hexStr += byte.toString(16).padStart(2, '0');
          }
          return poseidon.F.e(BigInt(hexStr) % fieldPrime);
        }
        // If input is a number
        return poseidon.F.e(input);
      });
      
      // Calculate the hash
      const hash = poseidon(fieldElements);
      
      // Convert to hex string
      return "0x" + poseidon.F.toString(hash);
    } catch (error) {
      console.error("Error in Poseidon hash calculation:", error);
      
      // Fallback to API if available
      try {
        const response = await fetch('http://localhost:5010/api/hash/poseidon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputs })
        });
        
        const result = await response.json();
        return result.hash;
      } catch (apiError) {
        console.error("API fallback also failed:", apiError);
        
        // Last resort fallback to SHA-256 (NOT secure for production)
        console.warn("WARNING: Using SHA-256 instead of Poseidon - NOT secure for production!");
        if (inputs.length === 1) {
          return await hashValue(inputs[0].toString());
        } else {
          return await hashValue(inputs.join("_"));
        }
      }
    }
  }