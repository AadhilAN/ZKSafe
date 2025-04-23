const { calculateHash } = require('../Services/poseidonService');

async function calculatePoseidonHash(req, res) {
  try {
    // Validate request body
    if (!req.body || !req.body.inputs) {
      return res.status(400).json({
        success: false,
        error: 'Request body must contain "inputs" array'
      });
    }

    const { inputs } = req.body;
    
    if (!Array.isArray(inputs)) {
      return res.status(400).json({ 
        success: false,
        error: 'Inputs must be an array'
      });
    }

    const hashResult = await calculateHash(inputs);
    
    res.json({
      success: true,
      hash: hashResult
    });
  } catch (error) {
    console.error('Error in poseidon controller:', error);
    
    const statusCode = error.message.includes('Unsupported input count') ? 400 : 500;
    
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  calculatePoseidonHash
};