// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice 声誉 NFT 接口
interface IReputationNFT {
    function mint(address to, uint256 tokenId) external;
}

contract OrderContract {
    IERC20 public rcoToken;
    IReputationNFT public reputationNFT;
    address public platformAddress;
    address public owner;

    struct Order {
        address customer;
        address merchant;
        address rider;
        uint256 amount;      // 顾客支付总额
        uint256 platformFee; // 平台抽成（固定）
        bool accepted;
        bool picked;
        bool fulfilled;
    }

    Order[] public orders;
    /// @notice 每个订单对应的菜品 ID 列表
    mapping(uint256 => uint256[]) public orderDishIds;
    /// @notice 每个订单对应的菜品数量列表
    mapping(uint256 => uint256[]) public orderQtys;

    uint256 public constant USER_REWARD     = 2 ether;
    uint256 public constant MERCHANT_REWARD = 3 ether;
    uint256 public constant RIDER_REWARD    = 5 ether;
    uint256 public constant PLATFORM_FEE    = 1 ether;

    /// @notice 多品项下单事件
    event OrderCreated(
        uint256 indexed orderId,
        address indexed customer,
        uint256 merchantId,
        uint256[] dishIds,
        uint256[] qtys,
        uint256 amount
    );
    event OrderAccepted(uint256 indexed orderId, address indexed merchant);
    event OrderPicked(uint256 indexed orderId, address indexed rider);
    event OrderFulfilled(
        uint256 indexed orderId,
        address indexed customer,
        address indexed merchant,
        address rider,
        uint256 amount,
        uint256 platformFee,
        uint256 userReward,
        uint256 merchantReward,
        uint256 riderReward,
        address platform
    );
    event FeeCharged(
        uint256 indexed orderId,
        address indexed platform,
        uint256 platformFee
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _rco, address _nft, address _platform) {
        rcoToken        = IERC20(_rco);
        reputationNFT   = IReputationNFT(_nft);
        platformAddress = _platform;
        owner           = msg.sender;
    }

    /// @notice 更新平台地址
    function setPlatformAddress(address _platform) external onlyOwner {
        platformAddress = _platform;
    }

    /// @notice 顾客下单：指定商家 ID + 多菜品 ID 列表 + 数量列表，支付 ETH/Token
    /// @param merchantId 商家索引或 ID，前端保持一致
    /// @param dishIds    菜品 ID 数组
    /// @param qtys       与 dishIds 等长的数量数组
    /// @return orderId   新订单在数组中的索引
    function createOrder(
        uint256 merchantId,
        uint256[] calldata dishIds,
        uint256[] calldata qtys
    )
        external
        payable
        returns (uint256 orderId)
    {
        require(dishIds.length == qtys.length, "Mismatched arrays");

        orderId = orders.length;
        // 存储订单基础信息
        orders.push(Order({
            customer:    msg.sender,
            merchant:    address(0),
            rider:       address(0),
            amount:      msg.value,
            platformFee: PLATFORM_FEE,
            accepted:    false,
            picked:      false,
            fulfilled:   false
        }));
        // 存储菜品明细
        orderDishIds[orderId] = dishIds;
        orderQtys[orderId]    = qtys;

        emit OrderCreated(orderId, msg.sender, merchantId, dishIds, qtys, msg.value);
    }

    /// @notice 商家接单
    function acceptOrder(uint256 orderId) external {
        require(orderId < orders.length, "Invalid orderId");
        Order storage order = orders[orderId];
        require(!order.accepted && !order.fulfilled, "Already handled");
        order.merchant = msg.sender;
        order.accepted = true;
        emit OrderAccepted(orderId, msg.sender);
    }

    /// @notice 骑手抢单
    function pickOrder(uint256 orderId) external {
        require(orderId < orders.length, "Invalid orderId");
        Order storage order = orders[orderId];
        require(order.accepted && !order.picked && !order.fulfilled, "Not ready to pick");
        order.rider  = msg.sender;
        order.picked = true;
        emit OrderPicked(orderId, msg.sender);
    }

    /// @notice 骑手完成履约，分账并铸 NFT
    function fulfillOrder(uint256 orderId) external {
        require(orderId < orders.length, "Invalid orderId");
        Order storage order = orders[orderId];
        require(order.picked && !order.fulfilled, "Not picked or already fulfilled");
        require(order.rider == msg.sender, "Only rider can fulfill");

        order.fulfilled = true;

        // 分账
        require(rcoToken.transfer(order.customer,    USER_REWARD),     "User reward failed");
        require(rcoToken.transfer(order.merchant,    MERCHANT_REWARD), "Merchant reward failed");
        require(rcoToken.transfer(order.rider,       RIDER_REWARD),    "Rider reward failed");
        require(rcoToken.transfer(platformAddress,   PLATFORM_FEE),    "Platform fee failed");

        // 铸声誉 NFT
        reputationNFT.mint(order.customer, orderId * 10 + 1);
        reputationNFT.mint(order.merchant, orderId * 10 + 2);
        reputationNFT.mint(order.rider,    orderId * 10 + 3);

        emit OrderFulfilled(
            orderId,
            order.customer,
            order.merchant,
            order.rider,
            order.amount,
            PLATFORM_FEE,
            USER_REWARD,
            MERCHANT_REWARD,
            RIDER_REWARD,
            platformAddress
        );
        emit FeeCharged(orderId, platformAddress, PLATFORM_FEE);
    }

    /// @notice 查询某笔订单
    function getOrder(uint256 id) external view returns (Order memory) {
        return orders[id];
    }

    /// @notice 查询订单总数
    function getOrderCount() external view returns (uint256) {
        return orders.length;
    }

    /// @notice 查询某笔订单的菜品 ID 列表
    function getOrderDishIds(uint256 orderId) external view returns (uint256[] memory) {
        return orderDishIds[orderId];
    }

    /// @notice 查询某笔订单的菜品数量列表
    function getOrderQtys(uint256 orderId) external view returns (uint256[] memory) {
        return orderQtys[orderId];
    }
}
