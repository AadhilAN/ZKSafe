const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/authMiddleware');
const { uploadShareToIPFS, downloadShareFromIPFS, uploadSharesToIPFS } = require('../Services/ipfsService');
const User = require('../models/userModel');
const crypto = require('crypto');

// Upload a single share to IPFS
router.post('/upload-share', async (req, res) => {
  try {
    const { base64Share, shareIndex } = req.body;
    
    if (!base64Share || shareIndex === undefined) {
      return res.status(400).json({ success: false, message: 'Missing required parameters' });
    }
    
    const cid = await uploadShareToIPFS(base64Share, shareIndex);
    
    res.status(200).json({
      success: true,
      cid: cid,
      shareIndex: shareIndex
    });
  } catch (error) {
    console.error('Error uploading share to IPFS:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload share to IPFS',
      error: error.message
    });
  }
});

// Upload multiple shares to IPFS
router.post('/upload-shares', async (req, res) => {
    try {
      const { base64Shares, password, userId } = req.body;
      
      if (!Array.isArray(base64Shares) || base64Shares.length === 0) {
        return res.status(400).json({ success: false, message: 'Missing or invalid shares array' });
      }
      
      if (!password) {
        return res.status(400).json({ success: false, message: 'Password required for encryption' });
      }
      
      const results = await uploadSharesToIPFS(
        userId, 
        base64Shares, 
        password, 
        1  // Start from index 1
      );
      
      res.status(200).json({
        success: true,
        results: results
      });
    } catch (error) {
      console.error('Error uploading shares to IPFS and saving to DB:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload shares to IPFS and save to DB',
        error: error.message
      });
    }
  });

// Download a share from IPFS
// router.get('/download-share/:cid', authenticate, async (req, res) => {
//   try {
//     const { cid } = req.params;
    
//     if (!cid) {
//       return res.status(400).json({ success: false, message: 'Missing CID parameter' });
//     }
    
//     const base64Share = await downloadShareFromIPFS(cid);
    
//     res.status(200).json({
//       success: true,
//       base64Share: base64Share
//     });
//   } catch (error) {
//     console.error('Error downloading share from IPFS:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to download share from IPFS',
//       error: error.message
//     });
//   }
// });

router.post('/get-shards', authenticate, async (req, res) => {
    try {
      const { password } = req.body;
      const userId = req.user._id;
      
      if (!password) {
        return res.status(400).json({ success: false, message: 'Password required' });
      }
      
      // Get user's IPFS shares from database
      const user = await User.findById(userId).populate('ipfsSharesID');
      
      if (!user || !user.ipfsSharesID) {
        return res.status(404).json({ success: false, message: 'No IPFS shares found' });
      }
      
      const shares = [];
      
      for (const ipfsShare of user.ipfsSharesID) {
        try {
          // Decrypt the CID using user's password
          const salt = Buffer.from(ipfsShare.salt, 'hex');
          const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha512');
          const iv = Buffer.from(ipfsShare.iv, 'hex');
          const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
          
          let decryptedCID = decipher.update(ipfsShare.encryptedCID, 'hex', 'utf8');
          decryptedCID += decipher.final('utf8');
          
          // Download the share from IPFS
          const base64Share = await downloadShareFromIPFS(decryptedCID);
          
          shares.push({
            shareIndex: ipfsShare.shareIndex,
            base64Share: base64Share
          });
        } catch (error) {
          console.error(`Error processing share ${ipfsShare.shareIndex}:`, error);
          // Continue with other shares even if one fails
        }
      }
      
      // Sort shares by index to maintain order
      shares.sort((a, b) => a.shareIndex - b.shareIndex);
      
      res.status(200).json({
        success: true,
        shares: shares
      });
    } catch (error) {
      console.error('Error getting user shares from IPFS:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve shares from IPFS',
        error: error.message
      });
    }
  });

module.exports = router;