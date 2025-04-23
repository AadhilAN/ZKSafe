const express = require('express');
const cors = require('cors');
const config = require('./configuration/config');
const app = express();
const PORT = config.PORT;
const userRoutes = require('./routes/user');
const walletRoutes = require('./routes/wallet');
const zkpRoutes = require("./routes/zkp");
const poseidonRoutes = require('./routes/poseidon');

app.use(express.json());

app.use(cors({
    origin: 'http://localhost:4200', // Allow Angular frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

// Connect to MongoDB
config.connectDB();

// Set up routes
app.use('/api/auth', userRoutes);
app.use('/api/wallet', walletRoutes);
app.use("/api/zkp", zkpRoutes);
app.use("/api/hash", poseidonRoutes);

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
