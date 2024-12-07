const path = require("path");
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Define required environment variables
const requiredVariables = [
    'PORT',
    'MONGO_USERNAME',
    'MONGO_PASSWORD',
    'MONGO_STRING',
    'JWT_SECRET'
];

const missingVariables = requiredVariables.filter(variable => !(process.env[variable]));
if (missingVariables.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVariables.join(', ')}`);
}

// Stores all the environment variables in the config object
const config = {
    PORT: process.env.PORT,
    MONGO_USERNAME: process.env.MONGO_USERNAME,
    MONGO_PASSWORD: process.env.MONGO_PASSWORD,
    MONGO_STRING: process.env.MONGO_STRING,
    JWT_SECRET: process.env.JWT_SECRET
};

// Generate MongoDB URI
function generateMongoURI() {
    if (config.MONGO_USERNAME && config.MONGO_PASSWORD && config.MONGO_STRING) {
        return `mongodb+srv://${config.MONGO_USERNAME}:${config.MONGO_PASSWORD}@${config.MONGO_STRING}`;
    } else {
        throw new Error('Error when generating MongoURI');
    }
}

config.MONGO_URI = generateMongoURI();

// Function to connect to MongoDB
config.connectDB = async () => {
    try {
        await mongoose.connect(config.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected');
    } catch (err) {
        console.error('Database connection failed:', err.message);
        process.exit(1);
    }
};

module.exports = config;