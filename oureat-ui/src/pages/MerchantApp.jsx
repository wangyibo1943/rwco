import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import OrderArtifact from "../abis/OrderContract.json";

// 🎯 从常量文件中读取
import { RPC_URL, ORDER_ADDRESS } from "./constants/addresses";

const OrderAbi = OrderArtifact.abi;

export default function MerchantApp() {
  const [tab, setTab] = useState("orders");
  const [account, setAccount] = useState("");
  const [orderReadContract, setOrderReadContract] = useState<ethers.Contract>();
  const [orderWriteContract, setOrderWriteContract] = useState<ethers.Contract>();

  // 菜单管理状态…
  const [menuList, setMenuList] = useState(() =>
    JSON.parse(localStorage.getItem("merchantMenu") || "[]")
  );
  const [dishName, setDishName] = useState("");
  const [price, setPrice] = useState("");
  const [specs, setSpecs] = useState("");

  // 订单管理状态…
  const [orders, setOrders] = useState<any[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [refreshFlag, setRefreshFlag] = useState(0);

  const STATUS_LABELS = [
    "待接单",
    "已接单",
    "配送中",
    "已完成"
  ];

  const short = (addr: string) => addr?.slice(0, 7) + "..." + addr?.slice(-3);

  // —— 初始化：连接钱包 & 合约 ——  
  useEffect(() => {
    async function init() {
      // 总是准备一个只读 provider
      const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
      let signer: ethers.Signer;

      // 优先使用用户安装的钱包
      if ((window as any).ethereum) {
        const web3Prov = new ethers.providers.Web3Provider((window as any).ethereum);
        try {
          await web3Prov.send("eth_requestAccounts", []);
          signer = web3Prov.getSigner();
          setAccount(await signer.getAddress());
        } catch {
          // 用户拒绝连接，不设置 signer，此时只能只读
          signer = provider;
        }
      } else {
        // 无钱包环境，只读
        signer = provider;
      }

      // 读写合约实例
      setOrderReadContract(new ethers.Contract(ORDER_ADDRESS, OrderAbi, provider));
      setOrderWriteContract(new ethers.Contract(ORDER_ADDRESS, OrderAbi, signer));
    }
    init();
  }, []);

  // —— 拉取订单 ——  
  const fetchOrders = async () => {
    if (!orderReadContract) return;
    try {
      const countBn = await orderReadContract.getOrderCount();
      const count = countBn.toNumber();
      const list: any[] = [];
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

  useEffect(() => {
    if (!orderReadContract) return;
    fetchOrders();
    const timer = setInterval(fetchOrders, 2000);
    return () => clearInterval(timer);
  }, [orderReadContract, refreshFlag]);

  const manualRefresh = () => {
    setRefreshFlag(f => f + 1);
    fetchOrders();
  };

  // —— 商家接单 ——  
  const acceptOrder = async (orderId: number) => {
    if (!orderWriteContract || busyId === orderId) return;
    setBusyId(orderId);
    try {
      const tx = await orderWriteContract.acceptOrder(orderId);
      await tx.wait();
      fetchOrders();
      localStorage.setItem("ORDER_UPDATED", Date.now().toString());
    } catch (e: any) {
      alert("接单失败: " + (e.message || e));
    } finally {
      setBusyId(null);
    }
  };

  // —— 菜单管理函数同原 ——  
  const handleUploadMenu = () => {
    if (!dishName || !price) return alert("请输入菜名与价格");
    const arr = specs.split(",").map(s=>s.trim()).filter(Boolean);
    const menu = [...menuList, { dishName, price, specs: arr }];
    setMenuList(menu);
    localStorage.setItem("merchantMenu", JSON.stringify(menu));
    setDishName(""); setPrice(""); setSpecs("");
  };
  const handleDeleteMenu = (idx: number) => {
    const next = menuList.filter((_,i)=>i!==idx);
    setMenuList(next);
    localStorage.setItem("merchantMenu", JSON.stringify(next));
  };

  // —— 渲染 UI 同原，不变 ——  

  return (
    <div style={{ padding:20, maxWidth:660, margin:'0 auto', fontFamily:'sans-serif' }}>
      <h2 style={{ fontSize:22 }}>商家端（Merchant）</h2>
      {/* …后续 UI 保持不变，只使用上面优化后的合约实例和账户 */}
      {/* 订单管理 Tab、菜单管理 Tab 保持你现有的实现 */}
    </div>
  );
}
