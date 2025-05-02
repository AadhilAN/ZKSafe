const express = require('express');
const { register, initiateLogin, completeLogin, completeLoginOnchainverfication } = require('../controllers/userController');
const router = express.Router();

router.post('/register', register);
router.post('/initiate-login', initiateLogin);
router.post('/complete-login', completeLogin);
router.post('/complete-login-onchain', completeLoginOnchainverfication);

module.exports = router;