const axios = require('axios');
const crypto = require('crypto');
const IPFSShare = require('../models/ipfsModel');
const User = require('../models/userModel');
require('dotenv').config();

// Pinata API endpoints
const PINATA_API_URL = 'https://api.pinata.cloud';

// Configuration
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_API_SECRET = process.env.PINATA_API_SECRET;
const ENCRYPTION_KEY = process.env.IPFS_ENCRYPTION_KEY;

// Encrypt data before uploading to IPFS
function encryptData(data) {
  const iv = crypto.randomBytes(16);
  const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted
  };
}

// Decrypt data from IPFS
function decryptData(encryptedData, ivHex) {
  const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

//encryptCID with password
function encryptCID(cid, password) {
    const salt = crypto.randomBytes(16);
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha512');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let encrypted = cipher.update(cid, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encryptedCID: encrypted,
      iv: iv.toString('hex'),
      salt: salt.toString('hex')
    };
  }

// Upload a share to IPFS via Pinata
async function uploadShareToIPFS(base64Share, shareIndex) {
  try {
    // Encrypt the share before uploading
    const { iv, encryptedData } = encryptData(base64Share);
    
    // Create metadata for the share
    const metadata = {
      encryptedShare: encryptedData,
      iv: iv,
      shareIndex: shareIndex,
      timestamp: Date.now(),
      version: '1.0'
    };
    
    // Prepare the request body for Pinata
    const pinataBody = {
      pinataContent: metadata,
      pinataMetadata: {
        name: `Share_${shareIndex}_${Date.now()}`,
        keyvalues: {
          type: 'sss-shard',
          shareIndex: shareIndex.toString()
        }
      }
    };
    
    // Upload to Pinata
    const response = await axios.post(
      `${PINATA_API_URL}/pinning/pinJSONToIPFS`,
      pinataBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_API_SECRET
        }
      }
    );
    
    console.log(`Share ${shareIndex} uploaded with CID: ${response.data.IpfsHash}`);
    return response.data.IpfsHash; // This is the CID
  } catch (error) {
    console.error(`Error uploading share ${shareIndex} to IPFS:`, error.message);
    throw error;
  }
}

// Download a share from IPFS via Pinata
async function downloadShareFromIPFS(cid) {
  try {
    // Get content from IPFS gateway
    const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${cid}`);
    
    if (!response.data || !response.data.encryptedShare || !response.data.iv) {
      throw new Error('Invalid data format from IPFS');
    }
    
    // Decrypt the share
    const decryptedShare = decryptData(response.data.encryptedShare, response.data.iv);
    
    return decryptedShare;
  } catch (error) {
    console.error('Error downloading share from IPFS:', error.message);
    throw error;
  }
}

// Upload multiple shares to IPFS
// async function uploadSharesToIPFS(base64Shares, startIndex = 0) {
//   const cidPromises = base64Shares.map((share, index) => 
//     uploadShareToIPFS(share, startIndex + index)
//   );
  
//   return Promise.all(cidPromises);
// }

// async function uploadSharesToIPFS(base64Shares, startIndex = 0, maxRetries = 5) {
//     const uploadWithRetry = async (share, shareIndex, retries = 0) => {
//       try {
//         return await uploadShareToIPFS(share, shareIndex);
//       } catch (error) {
//         if (retries < maxRetries) {
//           console.log(`Retry ${retries + 1}/${maxRetries} for share ${shareIndex}`);
//           await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1))); // Exponential backoff
//           return uploadWithRetry(share, shareIndex, retries + 1);
//         }
//         throw error;
//       }
//     };
  
//     const uploadPromises = base64Shares.map((share, index) => 
//       uploadWithRetry(share, startIndex + index)
//         .then(cid => ({ success: true, shareIndex: startIndex + index, cid }))
//         .catch(error => ({ success: false, shareIndex: startIndex + index, error: error.message }))
//     );
  
//     const results = await Promise.all(uploadPromises);
    
//     const errors = results.filter(r => !r.success);
    
//     if (errors.length > 0) {
//       throw new Error(`Failed to upload shares: ${JSON.stringify(errors)}`);
//     }
  
//     return results.map(r => r.cid);
//   }

async function uploadSharesToIPFS(userId, base64Shares, password, startIndex = 0, maxRetries = 3) {
    const uploadWithRetry = async (share, shareIndex, retries = 0) => {
      try {
        return await uploadShareToIPFS(share, shareIndex);
      } catch (error) {
        if (retries < maxRetries) {
          console.log(`Retry ${retries + 1}/${maxRetries} for share ${shareIndex}`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1)));
          return uploadWithRetry(share, shareIndex, retries + 1);
        }
        throw error;
      }
    };
  
    const uploadAndSavePromises = base64Shares.map(async (share, index) => {
        const shareIndex = startIndex + index;
        
        try {
          // Upload to IPFS
          const cid = await uploadWithRetry(share, shareIndex);
          
          // Encrypt the CID
          const { encryptedCID, iv, salt } = encryptCID(cid, password); // Get all three values
          
          // Save to database
          const ipfsShare = new IPFSShare({
            shareIndex: shareIndex,
            encryptedCID: encryptedCID,
            iv: iv,
            salt: salt,
            userId: userId
          });
          
          const savedShare = await ipfsShare.save();
          
          return { 
            success: true, 
            shareIndex: shareIndex, 
            cid: cid,
            dbId: savedShare._id 
          };
        } catch (error) {
          return { 
            success: false, 
            shareIndex: shareIndex, 
            error: error.message 
          };
        }
      });
    
  
    const results = await Promise.all(uploadAndSavePromises);
    
    const errors = results.filter(r => !r.success);
    
    if (errors.length > 0) {
      throw new Error(`Failed to upload shares: ${JSON.stringify(errors)}`);
    }
  
    // Update user with IPFS share references
    const user = await User.findById(userId);
    user.ipfsSharesID = results.map(r => r.dbId);
    await user.save();
  
    return results.map(r => ({ shareIndex: r.shareIndex, cid: r.cid }));
  }

module.exports = {
  uploadShareToIPFS,
  downloadShareFromIPFS,
  uploadSharesToIPFS
};