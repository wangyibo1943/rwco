// src/pages/RiderApp.tsx

import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import OrderArtifact from "../abis/OrderContract.json";
import { connectWallet } from "../utils/connectWallet";
import { RPC_URL, ORDER_ADDRESS } from "../constants/addresses";

const OrderAbi = OrderArtifact.abi;

// 地址缩略
function shortAddr(addr?: string) {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "--";
}

export default function RiderApp() {
  const [orders, setOrders] = useState<any[]>([]);
  const [busyIds, setBusyIds] = useState<number[]>([]);
  const [account, setAccount] = useState<string>("");
  const [orderContract, setOrderContract] = useState<ethers.Contract | null>(null);

  // —— 连接钱包 & 合约 ——  
  useEffect(() => {
    (async () => {
      let signer: ethers.Signer;
      try {
        signer = await connectWallet();
        setAccount(await signer.getAddress());
      } catch {
        // 回退只读
        const fallback = new ethers.providers.JsonRpcProvider(RPC_URL);
        signer = fallback;
        setAccount(await signer.getAddress().catch(() => ""));
      }
      setOrderContract(new ethers.Contract(ORDER_ADDRESS, OrderAbi, signer));
    })();
  }, []);

  // —— 拉取订单 ——  
  const fetchOrders = async () => {
    if (!orderContract) return;
    try {
      const count = (await orderContract.getOrderCount()).toNumber();
      const list: any[] = [];
      for (let i = 0; i < count; i++) {
        const o = await orderContract.getOrder(i);
        list.push({
          id:       i,
          customer: o.customer,
          merchant: o.merchant,
          rider:    o.rider,
          amount:   o.amount,
          accepted: o.accepted,
          picked:   o.picked,
          fulfilled:o.fulfilled,
        });
      }
      setOrders(list);
    } catch (e) {
      console.error("fetchOrders error", e);
    }
  };

  useEffect(() => {
    if (orderContract) {
      fetchOrders();
      const timer = setInterval(fetchOrders, 2000);
      return () => clearInterval(timer);
    }
  }, [orderContract]);

  const handleAccept = async (id: number) => {
    if (!orderContract || busyIds.includes(id) || !account) return;
    setBusyIds(ids => [...ids, id]);
    try {
      const tx = await orderContract.pickOrder(id);
      await tx.wait();
      await fetchOrders();
      alert("接单成功！");
    } catch (e: any) {
      alert("接单失败：" + (e.message || e));
    } finally {
      setBusyIds(ids => ids.filter(x => x !== id));
    }
  };

  const handleFulfill = async (id: number) => {
    if (!orderContract || busyIds.includes(id) || !account) return;
    if (!window.confirm("确认已送达？")) return;
    setBusyIds(ids => [...ids, id]);
    try {
      const tx = await orderContract.fulfillOrder(id);
      await tx.wait();
      await fetchOrders();
      alert("订单已完成！");
    } catch (e: any) {
      alert("送达失败：" + (e.message || e));
    } finally {
      setBusyIds(ids => ids.filter(x => x !== id));
    }
  };

  const availableOrders = orders.filter(
    o => o.accepted && !o.picked && !o.fulfilled
  );
  const pickedOrders = orders.filter(
    o => o.picked && !o.fulfilled && o.rider?.toLowerCase() === account.toLowerCase()
  );
  const completedOrders = orders.filter(
    o => o.picked && o.fulfilled && o.rider?.toLowerCase() === account.toLowerCase()
  );

  return (
    <div style={{ padding: 20, maxWidth: 650, margin: "0 auto", fontFamily: "system-ui" }}>
      <h2 style={{ fontSize: 20, marginBottom: 10 }}>骑手端 · 订单管理</h2>
      <div style={{ fontSize: 14, color: "#555", marginBottom: 8 }}>
        钱包：<b>{shortAddr(account)}</b>
        <button onClick={fetchOrders} style={{ marginLeft: 16, fontSize: 12, padding: "2px 10px" }}>
          刷新
        </button>
      </div>

      <section style={{ fontSize: 13, marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, margin: "10px 0 6px" }}>可接单列表</h3>
        {availableOrders.length === 0 ? (
          <div style={{ color: "#999", fontSize: 13 }}>暂无可接订单</div>
        ) : (
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse", marginBottom: 18 }}>
            <thead>
              <tr style={{ background: "#f6f6f6" }}>
                <th>ID</th><th>客户</th><th>商家</th><th>金额</th><th>操作</th>
              </tr>
            </thead>
            <tbody>
              {availableOrders.map(o => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{shortAddr(o.customer)}</td>
                  <td>{shortAddr(o.merchant)}</td>
                  <td>{ethers.formatEther(o.amount)} ETH</td>
                  <td>
                    <button
                      disabled={busyIds.includes(o.id)}
                      onClick={() => handleAccept(o.id)}
                      style={{ fontSize: 12, padding: "2px 10px", cursor: "pointer" }}
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
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse", marginBottom: 18 }}>
            <thead>
              <tr style={{ background: "#f6f6f6" }}>
                <th>ID</th><th>客户</th><th>商家</th><th>金额</th><th>操作</th>
              </tr>
            </thead>
            <tbody>
              {pickedOrders.map(o => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{shortAddr(o.customer)}</td>
                  <td>{shortAddr(o.merchant)}</td>
                  <td>{ethers.formatEther(o.amount)} ETH</td>
                  <td>
                    <button
                      disabled={busyIds.includes(o.id)}
                      onClick={() => handleFulfill(o.id)}
                      style={{ fontSize: 12, padding: "2px 10px", cursor: "pointer" }}
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
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse", background: "#fafbfc" }}>
            <thead>
              <tr style={{ background: "#f6f6f6" }}>
                <th>ID</th><th>客户</th><th>商家</th><th>金额</th><th>状态</th>
              </tr>
            </thead>
            <tbody>
              {completedOrders.map(o => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{shortAddr(o.customer)}</td>
                  <td>{shortAddr(o.merchant)}</td>
                  <td>{ethers.formatEther(o.amount)} ETH</td>
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
