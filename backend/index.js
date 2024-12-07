// // Importing required libraries
// const mongoose = require("mongoose");
// const express = require("express");
// const cors = require("cors");
// const cookieParser = require("cookie-parser");
// const requireAuth = require("./middlewares/requireAuth");

// // Getting the configuration values
// const config = require("./configuration/config");

// // Importing the routes
// const userRoute = require("./routes/user");
// //const demoRoute = require("./routes/demoRoute");
// const walletRoutes = require('./routes/wallet');

// // Importing Controllers and creating instance
// const UserController = require("./controllers/userController");
// // Initiating Express
// const app = express();

// app.use(cookieParser());
// app.use(
//   cors({
//     origin: [
//       "http://localhost:4200" 
//     ],
//   })
// );

// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // These route section doesn't require token authentication
// //app.use("/auth", authRouter);
// app.post("/user/registration", UserController.userRegistration);

// // Main route and the sub routes
// app.use("/user", userRoute);
// //app.use(requireAuth);

// app.use('/api/wallet', walletRoutes);


// // Verifying the connection to database and starting the server
// mongoose
//   .connect(config.MONGO_URI)
//   .then(() => {
//     app.listen(config.PORT, () => {
//       console.log(`Server running on port ${config.PORT}`);
//     });
//   })
//   .catch((error) => {
//     console.log(error);
//   });



// app.listen(config.PORT, () => {
//   console.log(`Server running on port ${config.PORT}`);
// });


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