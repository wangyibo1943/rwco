import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import OrderArtifact from "../abis/OrderContract.json";

// 配置
const ORDER_ADDRESS     = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
const RPC_URL           = "http://127.0.0.1:8545";
const TEST_PRIVATE_KEY  = "0x59c6995e998f97a5a0044975daee94d32b4c3cfb2715c0d9522cfc6b8b7e7a9";
const OrderAbi = OrderArtifact.abi;

export default function MerchantApp() {
  const [tab, setTab] = useState("orders");
  const [account, setAccount] = useState("");
  const [orderReadContract, setOrderReadContract] = useState(null);
  const [orderWriteContract, setOrderWriteContract] = useState(null);

  // 菜单管理
  const [menuList, setMenuList] = useState(() =>
    JSON.parse(localStorage.getItem("merchantMenu") || "[]")
  );
  const [dishName, setDishName] = useState("");
  const [price, setPrice] = useState("");
  const [specs, setSpecs] = useState("");

  // 订单管理
  const [orders, setOrders] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [refreshFlag, setRefreshFlag] = useState(0);

  // 合约状态映射
  const STATUS_LABELS = [
    "待接单",   // accepted=false
    "已接单",   // accepted=true, picked=false
    "配送中",   // picked=true, fulfilled=false
    "已完成"    // fulfilled=true
  ];

  // 地址缩略
  const short = addr => addr?.slice(0, 7) + "..." + addr?.slice(-3);

  // 初始化：连接钱包、合约实例
  useEffect(() => {
    async function init() {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      let signer;
      if (window.ethereum) {
        try {
          const web3Prov = new ethers.BrowserProvider(window.ethereum);
          const accts = await web3Prov.send("eth_requestAccounts", []);
          if (accts.length > 0) {
            signer = await web3Prov.getSigner();
            setAccount(accts[0]);
          }
        } catch {}
      }
      if (!signer) {
        signer = new ethers.Wallet(TEST_PRIVATE_KEY, provider);
        setAccount(await signer.getAddress());
      }
      setOrderReadContract(new ethers.Contract(ORDER_ADDRESS, OrderAbi, provider));
      setOrderWriteContract(new ethers.Contract(ORDER_ADDRESS, OrderAbi, signer));
    }
    init();
  }, []);

  // 拉取订单
  const fetchOrders = async () => {
    if (!orderReadContract) return;
    try {
      const countBn = await orderReadContract.getOrderCount();
      const count   = Number(countBn);
      const list = [];
      for (let i = 0; i < count; i++) {
        const o = await orderReadContract.orders(i);
        let status = 0;
        if (!o.accepted) status = 0;
        else if (o.accepted && !o.picked) status = 1;
        else if (o.picked && !o.fulfilled) status = 2;
        else if (o.fulfilled) status = 3;
        list.push({
          id:       i,
          customer: o.customer,
          merchant: o.merchant,
          rider:    o.rider,
          amount:   ethers.formatEther(o.amount),
          status
        });
      }
      setOrders(list);
    } catch (err) {
      console.error("fetchOrders 失败", err);
    }
  };

  // 页面加载和订单变化时拉取，自动刷新更快
  useEffect(() => {
    if (!orderReadContract) return;
    fetchOrders();
    const timer = setInterval(fetchOrders, 2000); // 2秒一刷
    return () => clearInterval(timer);
  }, [orderReadContract, refreshFlag]);

  // 手动刷新
  const manualRefresh = () => {
    setRefreshFlag(f => f + 1);
    fetchOrders();
  };

  // 商家接单 (只做一次链上操作)
  const acceptOrder = async (orderId) => {
    if (!orderWriteContract) return;
    setBusyId(orderId);
    try {
      await orderWriteContract.acceptOrder(orderId);
      fetchOrders();
      // 用 localStorage 广播事件，通知骑手端刷新
      localStorage.setItem("ORDER_UPDATED", Date.now());
    } catch (e) {
      alert("接单失败: " + (e.message || e));
    } finally {
      setBusyId(null);
    }
  };

  // 菜单上传/删除
  const handleUploadMenu = () => {
    if (!dishName || !price) return alert("请输入菜名与价格");
    const arr = specs.split(",").map(s=>s.trim()).filter(Boolean);
    const menu = [...menuList, { dishName, price, specs: arr }];
    setMenuList(menu);
    localStorage.setItem("merchantMenu", JSON.stringify(menu));
    setDishName(""); setPrice(""); setSpecs("");
  };
  const handleDeleteMenu = (idx) => {
    const next = menuList.filter((_,i)=>i!==idx);
    setMenuList(next);
    localStorage.setItem("merchantMenu", JSON.stringify(next));
  };

  // UI
  return (
    <div style={{ padding:20, maxWidth:660, margin:'0 auto', fontFamily:'sans-serif' }}>
      <h2 style={{ fontSize:22 }}>商家端（Merchant）</h2>
      {/* Tab */}
      <div style={{ display:'flex', gap:16, margin:'12px 0' }}>
        <button onClick={()=>setTab('orders')}
          style={{ borderBottom: tab==='orders'?'2px solid #1890ff':'none', background:'none', border:'none', cursor:'pointer', color:tab==='orders'?'#1890ff':'#444' }}>
          订单管理
        </button>
        <button onClick={()=>setTab('menu')}
          style={{ borderBottom: tab==='menu'?'2px solid #1890ff':'none', background:'none', border:'none', cursor:'pointer', color:tab==='menu'?'#1890ff':'#444' }}>
          菜单管理
        </button>
      </div>

      <div style={{ color:'#888', fontSize:13, marginBottom: 10 }}>
        账户：{account ? short(account) : '未连接'}
        <button onClick={manualRefresh} style={{ marginLeft: 12, fontSize: 13, padding: "1px 10px", border: "1px solid #eee", borderRadius: 6, background: "#fff", cursor: "pointer" }}>刷新</button>
      </div>

      {tab==='orders' && (
        <>
          <h3 style={{ fontSize:16, marginTop:12 }}>待接单订单</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                <th style={{ fontSize:14, padding:"6px 4px" }}>ID</th>
                <th style={{ fontSize:14, padding:"6px 4px" }}>客户</th>
                <th style={{ fontSize:14, padding:"6px 4px" }}>金额</th>
                <th style={{ fontSize:14, padding:"6px 4px" }}>状态</th>
                <th style={{ fontSize:14, padding:"6px 4px" }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {orders.filter(o=>o.status===0).length === 0
                ? <tr><td colSpan={5} style={{textAlign:'center', color:'#aaa', fontSize:13}}>暂无待接订单</td></tr>
                : orders.filter(o=>o.status===0).map(o=>(
                  <tr key={o.id}>
                    <td style={{ fontSize:14, padding:"6px 4px" }}>{o.id}</td>
                    <td style={{ fontSize:14, padding:"6px 4px" }}>{short(o.customer)}</td>
                    <td style={{ fontSize:14, padding:"6px 4px" }}>{o.amount} ETH</td>
                    <td style={{ fontSize:14, padding:"6px 4px" }}>{STATUS_LABELS[o.status]}</td>
                    <td style={{ fontSize:14, padding:"6px 4px" }}>
                      <button
                        disabled={busyId === o.id}
                        onClick={() => acceptOrder(o.id)}
                        style={{
                          fontSize: 13,
                          padding: "2px 12px",
                          borderRadius: 6,
                          background: busyId === o.id ? "#bbb" : "#1890ff",
                          color: "#fff", border: "none"
                        }}>
                        {busyId === o.id ? "处理中..." : "接单"}
                      </button>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>

          <h3 style={{ fontSize:16, marginTop:18 }}>已接单/配送中/已完成订单</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                <th style={{ fontSize:14, padding:"6px 4px" }}>ID</th>
                <th style={{ fontSize:14, padding:"6px 4px" }}>客户</th>
                <th style={{ fontSize:14, padding:"6px 4px" }}>骑手</th>
                <th style={{ fontSize:14, padding:"6px 4px" }}>金额</th>
                <th style={{ fontSize:14, padding:"6px 4px" }}>状态</th>
              </tr>
            </thead>
            <tbody>
              {orders.filter(o=>o.status>0).length === 0
                ? <tr><td colSpan={5} style={{textAlign:'center', color:'#aaa', fontSize:13}}>暂无已接单订单</td></tr>
                : orders.filter(o=>o.status>0).map(o=>(
                  <tr key={o.id}>
                    <td style={{ fontSize:14, padding:"6px 4px" }}>{o.id}</td>
                    <td style={{ fontSize:14, padding:"6px 4px" }}>{short(o.customer)}</td>
                    <td style={{ fontSize:14, padding:"6px 4px" }}>{o.rider ? short(o.rider) : "--"}</td>
                    <td style={{ fontSize:14, padding:"6px 4px" }}>{o.amount} ETH</td>
                    <td style={{ fontSize:14, padding:"6px 4px" }}>
                      {STATUS_LABELS[o.status]}
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </>
      )}

      {tab==='menu' && (
        <>
          <h3 style={{ marginTop:16, fontSize:15 }}>上传菜单</h3>
          <div style={{ display:'flex', gap:8, margin:'12px 0' }}>
            <input placeholder="菜名" value={dishName} onChange={e=>setDishName(e.target.value)} />
            <input placeholder="价格" type="number" value={price} onChange={e=>setPrice(e.target.value)} />
            <input placeholder="规格(逗号分隔)" value={specs} onChange={e=>setSpecs(e.target.value)} />
            <button onClick={handleUploadMenu}>上传</button>
          </div>
          <div style={{ background:'#fafafa', borderRadius:8, padding:12 }}>
            <strong>当前菜单：</strong>
            {menuList.length===0
              ? <div style={{ color:'#888', marginTop:8 }}>暂无菜单</div>
              : <ul style={{ listStyle:'none', padding:0 }}>
                  {menuList.map((item,idx)=>(
                    <li key={idx} style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                      <span>{item.dishName} - ￥{item.price}{item.specs.length>0?` [${item.specs.join('/')}]`:''}</span>
                      <button onClick={()=>handleDeleteMenu(idx)} style={{ color:'#f00', border:'none', background:'none' }}>删除</button>
                    </li>
                  ))}
                </ul>
            }
          </div>
        </>
      )}
    </div>
  );
}
