import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import OrderArtifact from "../abis/OrderContract.json";

// 从环境常量中读取
import { RPC_URL, ORDER_ADDRESS } from "./constants/addresses";

const OrderAbi = OrderArtifact.abi;
// 只读回退节点（用户未装钱包时，仅用于拉数据，不签名）
const rpcProvider = new ethers.providers.JsonRpcProvider(RPC_URL);

// 地址缩略函数
function shortAddr(addr: string) {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "--";
}

export default function RiderApp() {
  const [orders, setOrders] = useState<any[]>([]);
  const [busyIds, setBusyIds] = useState<number[]>([]);
  const [account, setAccount] = useState<string>("");
  const [orderContract, setOrderContract] = useState<ethers.Contract>();

  // —— 连接钱包 & 合约 ——  
  useEffect(() => {
    (async () => {
      let signer: ethers.Signer;
      // 优先使用用户钱包
      if ((window as any).ethereum) {
        const provider = new ethers.providers.Web3Provider((window as any).ethereum);
        try {
          await provider.send("eth_requestAccounts", []);
        } catch {
          // 用户拒绝连接，直接返回，不继续实例化合约
          return;
        }
        signer = provider.getSigner();
      } else {
        // 无钱包环境，仅以只读方式工作（无法接单/送达）
        signer = rpcProvider;
      }

      setAccount(await signer.getAddress().catch(() => ""));
      setOrderContract(new ethers.Contract(ORDER_ADDRESS, OrderAbi, signer));
    })();
  }, []);

  // —— 拉取所有订单 ——  
  const fetchOrders = async () => {
    if (!orderContract) return;
    try {
      const count = await orderContract.getOrderCount();
      const arr: any[] = [];
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

  // —— 操作函数 ——  
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
    }
    setBusyIds(ids => ids.filter(x => x !== id));
  };

  const handleFulfill = async (id: number) => {
    if (!orderContract || busyIds.includes(id) || !account) return;
    if (!window.confirm("确认已配送？")) return;
    setBusyIds(ids => [...ids, id]);
    try {
      const tx = await orderContract.fulfillOrder(id);
      await tx.wait();
      await fetchOrders();
      alert("订单已完成！");
    } catch (e: any) {
      alert("配送失败：" + (e.message || e));
    }
    setBusyIds(ids => ids.filter(x => x !== id));
  };

  // —— 过滤订单列表 ——  
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

      {/* 可接单列表 */}
      <section style={{ fontSize: 13, marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, margin: "10px 0 6px" }}>可接单列表</h3>
        {availableOrders.length === 0 ? (
          <div style={{ color: "#999" }}>暂无可接订单</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
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
                    <button disabled={busyIds.includes(o.id)} onClick={() => handleAccept(o.id)}>
                      接单
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* 在配送 & 已完成 类似… */}
      {/* 省略已完成、配送中表格，保持原逻辑 */}
    </div>
  );
}
