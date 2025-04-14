const express = require('express');
const { register, initiateLogin, completeLogin } = require('../controllers/userController');
const router = express.Router();

router.post('/register', register);
router.post('/initiate-login', initiateLogin);
router.post('/complete-login', completeLogin);

module.exports = router;