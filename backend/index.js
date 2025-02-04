const express = require('express');
const config = require('./configuration/config');
const app = express();
const PORT = config.PORT;
const userRoutes = require('./routes/user');
const walletRoutes = require('./routes/wallet');
const zkpRoutes = require("./routes/zkp");

app.use(express.json());

// Connect to MongoDB
config.connectDB();

// Set up routes
app.use('/api/auth', userRoutes);
app.use('/api/wallet', walletRoutes);
app.use("/api/zkp", zkpRoutes);

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
