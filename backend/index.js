const express = require('express');
const config = require('./configuration/config');
const app = express();
const PORT = config.PORT;
const userRoutes = require('./routes/user');
const walletRoutes = require('./routes/wallet');

app.use(express.json());

// Connect to MongoDB
config.connectDB();

// Set up routes
app.use('/api/auth', userRoutes);

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

app.use('/api/wallet', walletRoutes);