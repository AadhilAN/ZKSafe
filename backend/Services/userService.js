const jwt = require('jsonwebtoken');
const config = require('../configuration/config');

const generateToken = (userId) => {
    return jwt.sign({ id: userId }, config.JWT_SECRET, { expiresIn: '1h' });
};

module.exports = { generateToken };