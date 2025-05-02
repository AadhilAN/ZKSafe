require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const INFURA_KEY = process.env.INFURA_KEY || "151e8b37d18b4b8ebbadc74f189ddf2e";

module.exports = {
  solidity: "0.8.28",
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${INFURA_KEY}`,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : []
    }
  }
};
