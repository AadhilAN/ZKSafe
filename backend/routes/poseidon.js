const express = require('express');
const router = express.Router();
const poseidonController = require('../controllers/poseidonController');

// POST /api/hash/poseidon - Calculate poseidon hash
router.post('/poseidon', poseidonController.calculatePoseidonHash);

module.exports = router;