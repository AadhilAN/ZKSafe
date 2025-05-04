const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/authMiddleware');
const { uploadShareToIPFS, downloadShareFromIPFS, uploadSharesToIPFS } = require('../Services/ipfsService');

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
router.get('/download-share/:cid', authenticate, async (req, res) => {
  try {
    const { cid } = req.params;
    
    if (!cid) {
      return res.status(400).json({ success: false, message: 'Missing CID parameter' });
    }
    
    const base64Share = await downloadShareFromIPFS(cid);
    
    res.status(200).json({
      success: true,
      base64Share: base64Share
    });
  } catch (error) {
    console.error('Error downloading share from IPFS:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download share from IPFS',
      error: error.message
    });
  }
});

module.exports = router;