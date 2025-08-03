// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  // 1. 部署 RCO 代币
  const RCO = await hre.ethers.getContractFactory("RCO");
  const rco = await RCO.deploy();
  await rco.waitForDeployment();

  // 2. 部署声誉NFT合约
  const ReputationNFT = await hre.ethers.getContractFactory("ReputationNFT");
  const nft = await ReputationNFT.deploy();
  await nft.waitForDeployment();

  // 3. 部署 OrderContract，平台地址用部署者地址
  const platformAddr = deployer.address;
  const OrderContract = await hre.ethers.getContractFactory("OrderContract");
  const order = await OrderContract.deploy(await rco.getAddress(), await nft.getAddress(), platformAddr);
  await order.waitForDeployment();

  // 4. 授权 OrderContract 为 NFT minter
  await nft.setMinter(await order.getAddress());

  // 5. 给 OrderContract 打奖励池资金
  await rco.transfer(await order.getAddress(), hre.ethers.parseEther("100000"));

  console.log("RCO deployed:        ", await rco.getAddress());
  console.log("NFT deployed:        ", await nft.getAddress());
  console.log("OrderContract deployed:", await order.getAddress());
  console.log("平台分账地址（平台收入会进入此账户）:", platformAddr);
}

main();
