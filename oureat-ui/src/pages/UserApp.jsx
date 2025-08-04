import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import OrderArtifact from "../abis/OrderContract.json";

// 🌐 从统一常量文件读取
import { RPC_URL, ORDER_ADDRESS } from "./constants/addresses";

const OrderAbi = OrderArtifact.abi;

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

function shortAddr(addr: string) {
  if (!addr) return "--";
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

export default function UserApp() {
  const [account, setAccount] = useState("");
  const [orderContract, setOrderContract] = useState<ethers.Contract | null>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [myOrders, setMyOrders] = useState<any[]>([]);

  // —— 连接钱包 & 合约 ——  
  useEffect(() => {
    (async () => {
      let signer: ethers.Signer;
      if ((window as any).ethereum) {
        const web3 = new ethers.providers.Web3Provider((window as any).ethereum);
        try {
          await web3.send("eth_requestAccounts", []);
          signer = web3.getSigner();
        } catch {
          // 用户拒绝连接，不做任何事
          return;
        }
      } else {
        // 未安装钱包，仅仅读
        const fallback = new ethers.providers.JsonRpcProvider(RPC_URL);
        signer = fallback;
      }

      const addr = await signer.getAddress().catch(() => "");
      setAccount(addr);
      setOrderContract(new ethers.Contract(ORDER_ADDRESS, OrderAbi, signer));
    })();
  }, []);

  // —— 购物车操作 ——  
  const addToCart = (dish: any) => {
    setCart(prev => {
      const exist = prev.find(i => i.id === dish.id);
      if (exist) {
        return prev.map(i =>
          i.id === dish.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { ...dish, qty: 1 }];
    });
  };
  const removeFromCart = (id: number) =>
    setCart(prev => prev.filter(i => i.id !== id));
  const totalPrice = cart
    .reduce((sum, i) => sum + i.price * i.qty, 0)
    .toFixed(5);

  // —— 下单 ——  
  const doPlaceOrder = async () => {
    if (!orderContract || !cart.length) return;
    setBusy(true);
    try {
      const dishIds = cart.map(i => i.id);
      const qtys = cart.map(i => i.qty);
      const tx = await orderContract.createOrder(
        merchant.id,
        dishIds,
        qtys,
        { value: ethers.parseEther(totalPrice) }
      );
      await tx.wait();
      setCart([]);
      await fetchMyOrders();
      alert("下单成功，刷新后可见！");
    } catch (e: any) {
      alert("下单失败：" + (e.message || e));
    } finally {
      setBusy(false);
    }
  };

  // —— 查询我的订单 ——  
  const fetchMyOrders = async () => {
    if (!orderContract || !account) return;
    try {
      const total = await orderContract.getOrderCount();
      const result: any[] = [];
      for (let i = 0; i < total; i++) {
        const o = await orderContract.getOrder(i);
        if (o.customer?.toLowerCase() === account.toLowerCase()) {
          const dishIds = await orderContract.getOrderDishIds(i);
          const qtys = await orderContract.getOrderQtys(i);
          const items = dishIds.map((dishId: any, idx: number) => {
            const dish = merchant.dishes.find(d => d.id === Number(dishId));
            return dish
              ? { name: dish.name, price: dish.price, qty: Number(qtys[idx]) }
              : { name: "未知菜品", price: 0, qty: Number(qtys[idx]) };
          });
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

  // —— 轮询更新 ——  
  useEffect(() => {
    if (orderContract && account) {
      fetchMyOrders(); 
      const timer = setInterval(fetchMyOrders, 2000);
      return () => clearInterval(timer);
    }
  }, [orderContract, account]);

  const currentOrders = myOrders.filter(o => o.status < 3);
  const historyOrders = myOrders.filter(o => o.status === 3);

  return (
    <div style={{ padding: 16, maxWidth: 420, margin: "0 auto", fontFamily: "system-ui" }}>
      {/* 原有 UI 保留不动 */}
    </div>
  );
}
