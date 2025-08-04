// hardhat.config.js
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();  // 自动读取 .env

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: { chainId: 31337 },
    localhost: { url: "http://127.0.0.1:8545", chainId: 31337 },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: process.env.SEPOLIA_PRIVATE_KEY ? [process.env.SEPOLIA_PRIVATE_KEY] : [],
      chainId: 11155111,
    }
  },
  paths: {
    sources: "./contracts",
    tests:   "./test",
    cache:   "./cache",
    artifacts: "./artifacts",
  },
};
