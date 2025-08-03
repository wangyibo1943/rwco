import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import OrderTable from "../components/OrderTable";
import OrderArtifact from "../abis/OrderContract.json";
import RCOArtifact from "../abis/RCO.json";

const RCO_ADDRESS   = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const ORDER_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
const RPC_URL       = "http://127.0.0.1:8545";

const TEST_PRIVATE_KEY = "0x59c6995e998f97a5a004497e5daee94d32b4c3cfb2715c0d9522cfc6b8b7e7a9";

const OrderAbi = OrderArtifact.abi;
const RCOAbi = RCOArtifact.abi;
const rpcProvider = new ethers.JsonRpcProvider(RPC_URL);

export default function PlatformApp() {
  const [account, setAccount] = useState("");
  const [busy, setBusy] = useState(false);
  const [rcoBalance, setRcoBalance] = useState("0");
  const [orders, setOrders] = useState([]);
  const [platformAddress, setPlatformAddress] = useState("");

  // 自动连接钱包或用本地测试号
  useEffect(() => {
    const autoConnect = async () => {
      let signer;
      if (window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accs = await provider.send("eth_requestAccounts", []);
          if (accs.length === 0) return;
          const net = await provider.getNetwork();
          if (Number(net.chainId) !== 31337) {
            alert("请切换钱包到本地 Hardhat 网络 (chainId=31337)");
            return;
          }
          signer = await provider.getSigner();
          setAccount(await signer.getAddress());
        } catch (e) {
          const provider = new ethers.JsonRpcProvider(RPC_URL);
          signer = new ethers.Wallet(TEST_PRIVATE_KEY, provider);
          setAccount(await signer.getAddress());
        }
      } else {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        signer = new ethers.Wallet(TEST_PRIVATE_KEY, provider);
        setAccount(await signer.getAddress());
      }
      // 拉取平台分账地址
      const orderRead = new ethers.Contract(ORDER_ADDRESS, OrderAbi, rpcProvider);
      const platAddr = await orderRead.platformAddress();
      setPlatformAddress(platAddr);
    };
    autoConnect();
  }, []);

  // 查询平台RCO余额
  const fetchBalance = async () => {
    if (!platformAddress) return;
    try {
      const rcoRead = new ethers.Contract(RCO_ADDRESS, RCOAbi, rpcProvider);
      const bal = await rcoRead.balanceOf(platformAddress);
      setRcoBalance(ethers.formatUnits(bal, 18));
    } catch (e) {
      console.error("查询平台余额失败", e);
    }
  };

  // 拉取所有订单（含平台抽成）
  const fetchOrders = async () => {
    try {
      const orderRead = new ethers.Contract(ORDER_ADDRESS, OrderAbi, rpcProvider);
      const count = Number(await orderRead.getOrderCount());
      if (count === 0) {
        setOrders([]);
        return;
      }
      const list = [];
      for (let i = 0; i < count; i++) {
        const o = await orderRead.orders(i);
        list.push({
          id: i,
          customer: o.customer,
          dish: o.item,
          amount: ethers.formatUnits(o.amount, 18),
          merchant: o.merchant,
          rider: o.rider,
          accepted: o.accepted,
          picked: o.picked,
          fulfilled: o.fulfilled,
          platformFee: o.platformFee ? ethers.formatUnits(o.platformFee, 18) : "0",
        });
      }
      setOrders(list);
    } catch (e) {
      console.error("查询订单失败", e);
    }
  };

  useEffect(() => {
    fetchBalance();
    fetchOrders();
  }, [platformAddress]);

  return (
    <div
      style={{
        width: "100vw",
        maxWidth: 430,
        minHeight: "100vh",
        margin: "0 auto",
        padding: "4vw",
        boxSizing: "border-box",
        background: "#fff",
        fontFamily: "sans-serif",
      }}
    >
      <h2 style={{ fontSize: 22 }}>平台端（管理后台）</h2>
      <div style={{ margin: "12px 0" }}>
        <strong>平台RCO余额：</strong> {rcoBalance}
        <span style={{ marginLeft: 24, fontSize: 13, color: "#888" }}>
          平台分账地址：{platformAddress
            ? (platformAddress.substring(0, 8) + "..." + platformAddress.slice(-4))
            : "加载中..."}
        </span>
      </div>
      <div style={{ marginTop: 24 }}>
        <h3>所有订单流水（平台抽成明细）</h3>
        <OrderTable
          orders={orders}
          highlightPlatform={platformAddress}
          showPlatformFee
        />
      </div>
    </div>
  );
}
