import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import OrderArtifact from "../abis/OrderContract.json";

const ORDER_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
const TEST_PRIVATE_KEY = "0x59c6995e998f97a5a0044975daee94d32b4c3cfb2715c0d9522cfc6b8b7e7a9";
const RPC_URL = "http://127.0.0.1:8545";

// 地址缩略函数
function shortAddr(addr) {
  if (!addr) return "--";
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

export default function RiderApp() {
  const [orders, setOrders] = useState([]);
  const [busyIds, setBusyIds] = useState([]);
  const [account, setAccount] = useState("");
  const [orderContract, setOrderContract] = useState(null);

  useEffect(() => {
    let provider, signer;
    const connect = async () => {
      try {
        if (window.ethereum) {
          provider = new ethers.BrowserProvider(window.ethereum);
          await provider.send("eth_requestAccounts", []);
          signer = await provider.getSigner();
          setAccount(await signer.getAddress());
          setOrderContract(new ethers.Contract(ORDER_ADDRESS, OrderArtifact.abi, signer));
          window.ethereum.on("accountsChanged", async (accounts) => {
            setAccount(accounts[0]);
            const newSigner = await provider.getSigner();
            setOrderContract(new ethers.Contract(ORDER_ADDRESS, OrderArtifact.abi, newSigner));
          });
        } else {
          provider = new ethers.JsonRpcProvider(RPC_URL);
          signer = new ethers.Wallet(TEST_PRIVATE_KEY, provider);
          setAccount(await signer.getAddress());
          setOrderContract(new ethers.Contract(ORDER_ADDRESS, OrderArtifact.abi, signer));
        }
      } catch (e) {
        alert("钱包连接失败：" + e.message);
      }
    };
    connect();
  }, []);

  const fetchOrders = async () => {
    if (!orderContract) return;
    try {
      const count = await orderContract.getOrderCount();
      const arr = [];
      for (let i = 0; i < count; ++i) {
        const o = await orderContract.getOrder(i);
        arr.push({
          id: i,
          customer: o[0],
          merchant: o[1],
          rider: o[2],
          amount: o[3],
          platformFee: o[4],
          accepted: o[5],
          picked: o[6],
          fulfilled: o[7],
        });
      }
      setOrders(arr);
    } catch (e) {
      console.error("fetchOrders error", e);
    }
  };

  useEffect(() => {
    if (!orderContract) return;
    fetchOrders();
    const timer = setInterval(fetchOrders, 2000);
    return () => clearInterval(timer);
  }, [orderContract]);

  const handleForceRefresh = () => fetchOrders();

  useEffect(() => {
    // 调试
    console.log("当前账户 account:", account);
    console.log("全部订单:", orders.map(o => ({
      id: o.id, rider: o.rider, picked: o.picked, fulfilled: o.fulfilled,
    })));
  }, [orders, account]);

  function getStatus(o) {
    if (!o.accepted) return "待商家接单";
    if (!o.picked) return "待骑手接单";
    if (!o.fulfilled) return "配送中";
    return "已完成";
  }

  const handleAccept = async (id) => {
    if (busyIds.includes(id)) return;
    setBusyIds(ids => [...ids, id]);
    try {
      await orderContract.pickOrder(id);
      await fetchOrders();
      alert("接单成功！");
    } catch (e) {
      alert("接单失败：" + (e.message || e));
    }
    setBusyIds(ids => ids.filter(x => x !== id));
  };

  const handleFulfill = async (id) => {
    if (busyIds.includes(id)) return;
    if (!window.confirm("请确认已拍照、地址正确，将订单标记为完成？")) return;
    setBusyIds(ids => [...ids, id]);
    try {
      await orderContract.fulfillOrder(id);
      await fetchOrders();
      alert("订单已完成！");
    } catch (e) {
      alert("送达失败：" + (e.message || e));
    }
    setBusyIds(ids => ids.filter(x => x !== id));
  };

  const availableOrders = orders.filter(
    o => o.accepted && !o.picked && !o.fulfilled
  );
  const pickedOrders = orders.filter(
    o => o.picked && !o.fulfilled && o.rider && o.rider.toLowerCase() === account.toLowerCase()
  );
  const completedOrders = orders.filter(
    o => o.picked && o.fulfilled && o.rider && o.rider.toLowerCase() === account.toLowerCase()
  );

  return (
    <div style={{ padding: 20, maxWidth: 650, margin: "0 auto", fontFamily: "system-ui" }}>
      <h2 style={{ fontSize: 20, marginBottom: 10 }}>骑手端 · 订单管理</h2>
      <div style={{ fontSize: 14, color: "#555", marginBottom: 8 }}>
        钱包：<b>{shortAddr(account)}</b>
        <button onClick={handleForceRefresh} style={{ marginLeft: 16, fontSize: 12, padding: "2px 10px" }}>刷新</button>
      </div>

      <section style={{ fontSize: 13 }}>
        <h3 style={{ fontSize: 16, margin: "10px 0 6px" }}>可接单列表</h3>
        {availableOrders.length === 0 ? (
          <div style={{ color: "#999", fontSize: 13 }}>暂无可接订单</div>
        ) : (
          <table style={{
            width: "100%", fontSize: 13, borderCollapse: "collapse", marginBottom: 18,
          }}>
            <thead>
              <tr style={{ background: "#f6f6f6" }}>
                <th>ID</th>
                <th>客户</th>
                <th>商家</th>
                <th>金额</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {availableOrders.map(o => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{shortAddr(o.customer)}</td>
                  <td>{shortAddr(o.merchant)}</td>
                  <td>{o.amount != null ? ethers.formatEther(o.amount) + " ETH" : "--"}</td>
                  <td>{getStatus(o)}</td>
                  <td>
                    <button
                      disabled={busyIds.includes(o.id)}
                      onClick={() => handleAccept(o.id)}
                      style={{ fontSize: 12, padding: "2px 10px" }}
                    >
                      接单
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h3 style={{ fontSize: 16, margin: "10px 0 6px" }}>我的在配送订单</h3>
        {pickedOrders.length === 0 ? (
          <div style={{ color: "#999", fontSize: 13 }}>暂无在配送订单</div>
        ) : (
          <table style={{
            width: "100%", fontSize: 13, borderCollapse: "collapse", marginBottom: 18,
          }}>
            <thead>
              <tr style={{ background: "#f6f6f6" }}>
                <th>ID</th>
                <th>客户</th>
                <th>商家</th>
                <th>金额</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {pickedOrders.map(o => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{shortAddr(o.customer)}</td>
                  <td>{shortAddr(o.merchant)}</td>
                  <td>{o.amount != null ? ethers.formatEther(o.amount) + " ETH" : "--"}</td>
                  <td>{getStatus(o)}</td>
                  <td>
                    <button
                      disabled={busyIds.includes(o.id)}
                      onClick={() => handleFulfill(o.id)}
                      style={{ fontSize: 12, padding: "2px 10px" }}
                    >
                      送达
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h3 style={{ fontSize: 16, margin: "10px 0 6px" }}>我的已完成配送订单</h3>
        {completedOrders.length === 0 ? (
          <div style={{ color: "#999", fontSize: 13 }}>暂无已完成订单</div>
        ) : (
          <table style={{
            width: "100%", fontSize: 12, borderCollapse: "collapse",
            background: "#fafbfc"
          }}>
            <thead>
              <tr style={{ background: "#f6f6f6" }}>
                <th>ID</th>
                <th>客户</th>
                <th>商家</th>
                <th>金额</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {completedOrders.map(o => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{shortAddr(o.customer)}</td>
                  <td>{shortAddr(o.merchant)}</td>
                  <td>{o.amount != null ? ethers.formatEther(o.amount) + " ETH" : "--"}</td>
                  <td style={{ color: "#17a" }}>已完成</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
