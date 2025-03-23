const poseidonService = require('../Services/poseidonService');

/**
 * Controller for calculating Poseidon hash
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function calculatePoseidonHash(req, res) {
  try {
    const { inputs } = req.body;
    
    if (!Array.isArray(inputs)) {
      return res.status(400).json({ 
        success: false,
        error: 'Inputs must be an array'
      });
    }
    
    const hashResult = await poseidonService.calculateHash(inputs);
    
    res.json({
      success: true,
      hash: hashResult
    });
  } catch (error) {
    console.error('Error in poseidon controller:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to calculate Poseidon hash',
      message: error.message
    });
  }
}

module.exports = {
  calculatePoseidonHash
};