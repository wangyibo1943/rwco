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
    // 内置的 Hardhat 本地网络
    hardhat: {
      chainId: 31337,
    },
    // 本地节点（如果你用 `npx hardhat node` 启动了一个独立进程）
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    // 已移除 Sepolia 配置，只保留本地测试
  },
  paths: {
    sources: "./contracts",
    tests:   "./test",
    cache:   "./cache",
    artifacts: "./artifacts",
  },
};
