import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import OrderArtifact from "../abis/OrderContract.json";

const ORDER_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
const RPC_URL = "http://127.0.0.1:8545";
const TEST_PRIVATE_KEY = "0x59c6995e998f97a5a0044975daee94d32b4c3cfb2715c0d9522cfc6b8b7e7a9";
const OrderAbi = OrderArtifact.abi;
const rpcProvider = new ethers.JsonRpcProvider(RPC_URL);

const merchant = {
  id: 1,
  name: "商家 A",
  dishes: [
    { id: 11, name: "示例菜品 1", price: 0.01, image: "/bugger.jpg" },
    { id: 12, name: "示例菜品 2", price: 0.02, image: "/bugger.jpg" }
  ]
};

const statusLabels = [
  "待商家接单",
  "商家已接单",
  "配送中",
  "已送达"
];

function shortAddr(addr) {
  if (!addr) return "--";
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

export default function UserApp() {
  const [account, setAccount] = useState("");
  const [orderContract, setOrderContract] = useState(null);

  const [cart, setCart] = useState([]);
  const [busy, setBusy] = useState(false);

  // 👇 所有自己下过的订单 [{id, status, items: [{name, price, qty}], ...}]
  const [myOrders, setMyOrders] = useState([]);

  // 连接钱包和合约
  useEffect(() => {
    (async () => {
      let signer;
      if (window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accs = await provider.send("eth_requestAccounts", []);
          signer = accs.length ? await provider.getSigner() : new ethers.Wallet(TEST_PRIVATE_KEY, rpcProvider);
        } catch {
          signer = new ethers.Wallet(TEST_PRIVATE_KEY, rpcProvider);
        }
      } else {
        signer = new ethers.Wallet(TEST_PRIVATE_KEY, rpcProvider);
      }
      setAccount(await signer.getAddress());
      setOrderContract(new ethers.Contract(ORDER_ADDRESS, OrderAbi, signer));
    })();
  }, []);

  // 购物车操作
  const addToCart = (dish) => {
    setCart(prev => {
      const exist = prev.find(i => i.id === dish.id);
      if (exist) return prev.map(i => i.id === dish.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...dish, qty: 1 }];
    });
  };
  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));
  const totalPrice = cart.reduce((sum, i) => sum + i.price * i.qty, 0).toFixed(5);

  // 下单
  const doPlaceOrder = async () => {
    if (!orderContract || !cart.length) return;
    setBusy(true);
    try {
      const dishIds = cart.map(i => i.id);
      const qtys = cart.map(i => i.qty);
      const tx = await orderContract.createOrder(merchant.id, dishIds, qtys, { value: ethers.parseEther(totalPrice) });
      await tx.wait();
      setCart([]);
      // 下单后立即刷新订单
      await fetchMyOrders();
      alert("下单成功，刷新后可见！");
    } catch (e) {
      alert("下单失败：" + (e.message || e));
    } finally {
      setBusy(false);
    }
  };

  // 查询所有属于当前用户的订单（链上遍历所有）
  const fetchMyOrders = async () => {
    if (!orderContract || !account) return;
    try {
      const total = await orderContract.getOrderCount();
      const result = [];
      for (let i = 0; i < total; i++) {
        const o = await orderContract.getOrder(i);
        if (o.customer && o.customer.toLowerCase() === account.toLowerCase()) {
          // 查菜品明细
          const dishIds = await orderContract.getOrderDishIds(i);
          const qtys = await orderContract.getOrderQtys(i);
          const items = dishIds.map((dishId, idx) => {
            const dish = merchant.dishes.find(d => d.id === Number(dishId));
            return dish
              ? { name: dish.name, price: dish.price, qty: Number(qtys[idx]) }
              : { name: "未知菜品", price: 0, qty: Number(qtys[idx]) };
          });
          // 状态
          let status = 0;
          if (o.accepted && !o.fulfilled) status = 1;
          if (o.accepted && o.picked && !o.fulfilled) status = 2;
          if (o.accepted && o.fulfilled) status = 3;
          result.push({ id: i, status, items });
        }
      }
      setMyOrders(result);
    } catch (e) {
      console.error("查询订单失败", e);
    }
  };

  // 页面加载/每次状态变化定时轮询
  useEffect(() => {
    if (!orderContract || !account) return;
    fetchMyOrders(); // 初始查一次
    const timer = setInterval(fetchMyOrders, 2000);
    return () => clearInterval(timer);
    // eslint-disable-next-line
  }, [orderContract, account]);

  // 拆分“当前/历史”订单
  const currentOrders = myOrders.filter(o => o.status < 3);
  const historyOrders = myOrders.filter(o => o.status === 3);

  return (
    <div style={{ padding: 16, maxWidth: 420, margin: "0 auto", fontFamily: 'system-ui' }}>
      <h2 style={{ fontSize: 19, marginBottom: 8 }}>用户端 · 下单&追踪</h2>
      <div style={{ fontSize: 13, color: '#555', marginBottom: 8 }}>
        <b>账户：</b>{shortAddr(account) || '未连接'}
      </div>
      {/* 菜单 */}
      <h3 style={{ fontSize: 15, margin: "16px 0 8px" }}>{merchant.name} 菜单</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
        {merchant.dishes.map(d => (
          <div key={d.id} style={{ border: '1px solid #eee', borderRadius: 7, padding: 10, width: 120, fontSize: 13, background: '#fafbfc' }}>
            <img src={d.image} alt={d.name} style={{ width: '100%', borderRadius: 4 }} />
            <div style={{ marginTop: 5 }}>{d.name}</div>
            <div style={{ color: '#888', fontSize: 12 }}>{d.price} ETH</div>
            <button onClick={() => addToCart(d)} disabled={busy}
              style={{ marginTop: 7, padding: '3px 10px', borderRadius: 4, fontSize: 12, background: '#1890ff', color: '#fff', border: 'none', cursor: 'pointer' }}>
              加入购物车
            </button>
          </div>
        ))}
      </div>
      {/* 购物车 */}
      <div style={{ marginTop: 12, fontSize: 13 }}>
        <h3 style={{ fontSize: 15, margin: "10px 0 5px" }}>购物车</h3>
        {cart.length === 0
          ? <div style={{ color: '#aaa', marginBottom: 8 }}>购物车空</div>
          : (
            <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
              {cart.map(i => (
                <li key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <span>{i.name} × {i.qty}</span>
                  <span style={{ marginLeft: 10, color: '#888' }}>{(i.price * i.qty).toFixed(5)} ETH</span>
                  <button onClick={() => removeFromCart(i.id)} style={{ marginLeft: 10, color: '#f00', border: 'none', background: 'none', fontSize: 12, cursor: 'pointer' }}>删除</button>
                </li>
              ))}
            </ul>
          )}
        <div style={{ marginTop: 6 }}><b>总价：</b>{totalPrice} ETH</div>
        <button onClick={doPlaceOrder} disabled={busy || !cart.length}
          style={{ marginTop: 10, padding: '7px 18px', borderRadius: 5, background: '#52c41a', color: '#fff', border: 'none', fontSize: 13, cursor: 'pointer' }}>
          {busy ? '下单中…' : '提交订单'}
        </button>
      </div>
      {/* 当前订单 */}
      {currentOrders.length > 0 &&
        <div style={{ marginTop: 22 }}>
          <h3 style={{ fontSize: 15, marginBottom: 8 }}>当前订单</h3>
          {currentOrders.map(o => (
            <div key={o.id} style={{
              marginBottom: 16, background: '#f8fafd', borderRadius: 7, padding: '10px 14px', border: '1px solid #eaeaea'
            }}>
              <div style={{ fontSize: 13, marginBottom: 4, color: '#222' }}>
                <b>订单 #{o.id}</b>
              </div>
              {o.items && o.items.length > 0 &&
                <ul style={{ fontSize: 12, margin: 0, padding: '0 0 4px 0', listStyle: 'none' }}>
                  {o.items.map((item, idx) => (
                    <li key={idx} style={{ color: '#444', marginBottom: 2 }}>
                      {item.name} × {item.qty}
                      <span style={{ marginLeft: 10, color: '#999' }}>{(item.price * item.qty).toFixed(3)} ETH</span>
                    </li>
                  ))}
                </ul>
              }
              {/* 进度条 */}
              <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                {statusLabels.map((label, idx) => (
                  <div key={idx} style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{
                      width: 22, height: 22, lineHeight: '22px', borderRadius: '50%',
                      background: idx <= o.status ? '#1890ff' : '#e0e3e9',
                      color: idx <= o.status ? '#fff' : '#999', margin: '0 auto', fontSize: 12, fontWeight: idx === o.status ? 600 : 400
                    }}>{idx + 1}</div>
                    <div style={{ fontSize: 11, marginTop: 2, color: idx === o.status ? '#1890ff' : '#888' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      }
      {/* 历史订单 */}
      {historyOrders.length > 0 &&
        <div style={{ marginTop: 26 }}>
          <h3 style={{ fontSize: 15, marginBottom: 8 }}>历史订单</h3>
          {historyOrders.map(o => (
            <div key={o.id} style={{
              marginBottom: 14, background: '#f4f6fa', borderRadius: 7, padding: '10px 14px', border: '1px solid #eaeaea'
            }}>
              <div style={{ fontSize: 13, marginBottom: 4, color: '#444' }}>
                <b>订单 #{o.id}</b>
              </div>
              {o.items && o.items.length > 0 &&
                <ul style={{ fontSize: 12, margin: 0, padding: '0 0 4px 0', listStyle: 'none' }}>
                  {o.items.map((item, idx) => (
                    <li key={idx} style={{ color: '#888', marginBottom: 2 }}>
                      {item.name} × {item.qty}
                      <span style={{ marginLeft: 10 }}>{(item.price * item.qty).toFixed(3)} ETH</span>
                    </li>
                  ))}
                </ul>
              }
              <div style={{ marginTop: 6, color: "#52c41a", fontSize: 12 }}>已完成</div>
            </div>
          ))}
        </div>
      }
    </div>
  );
}
