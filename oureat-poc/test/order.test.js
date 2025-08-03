const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OrderContract", function () {
  async function deployFixture() {
    const [owner, user1, merchant] = await ethers.getSigners();

    const rco = await ethers.deployContract("RCO");
    const nft = await ethers.deployContract("ReputationNFT");
    const orderContract = await ethers.deployContract("OrderContract", [
      rco.target,
      nft.target,
    ]);

    // 💰 给订单合约转 100 RCO，确保其能发奖励
    await rco.transfer(orderContract.target, ethers.parseUnits("100", 18));

    return { rco, nft, orderContract, owner, user1, merchant };
  }

  it("should deploy contracts correctly", async function () {
    const { rco, nft, orderContract } = await loadFixture(deployFixture);

    expect(await rco.name()).to.equal("RCO Token");
    expect(await nft.name()).to.equal("Reputation NFT");
    expect(await orderContract.rcoToken()).to.equal(rco.target);
  });

  it("should create an order", async function () {
    const { orderContract, user1 } = await loadFixture(deployFixture);

    const tx = await orderContract.connect(user1).createOrder("sushi", 100);
    await tx.wait();

    const order = await orderContract.getOrder(0);
    expect(order.customer).to.equal(user1.address);
    expect(order.item).to.equal("sushi");
    expect(order.amount).to.equal(100);
    expect(order.fulfilled).to.equal(false);
  });

  it("should fulfill an order and reward user", async function () {
    const { orderContract, rco, nft, user1, merchant } = await loadFixture(deployFixture);

    // 用户创建订单
    await orderContract.connect(user1).createOrder("ramen", 120);

    // 商家履约（给 user1 发奖励 + 声誉NFT）
    const tx = await orderContract.connect(merchant).fulfillOrder(0, user1.address);
    await tx.wait();

    // 检查订单状态
    const order = await orderContract.getOrder(0);
    expect(order.fulfilled).to.equal(true);

    // 检查 RCO 奖励到账
    const balance = await rco.balanceOf(user1.address);
    expect(balance).to.equal(ethers.parseUnits("10", 18));

    // 检查 NFT 铸造
    const nftOwner = await nft.ownerOf(0);
    expect(nftOwner).to.equal(user1.address);
  });
});
