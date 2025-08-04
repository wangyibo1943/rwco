import React from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";

export default function LoginPage() {
  const nav = useNavigate();
  const roles = [
    { label: "用户端", path: "/user" },
    { label: "商家端", path: "/merchant" },
    { label: "骑手端", path: "/rider" },
    { label: "管理端", path: "/admin" },
  ];

  // 点击时先连接钱包
  const handleEnter = async (path: string) => {
    if (!(window as any).ethereum) {
      alert("请先安装 MetaMask 等以太坊钱包");
      return;
    }
    try {
      const provider = new ethers.providers.Web3Provider((window as any).ethereum);
      await provider.send("eth_requestAccounts", []);  // 弹窗授权
      // 可选：const signer = provider.getSigner();
      nav(path);
    } catch (e: any) {
      console.warn("钱包连接被拒绝或出错：", e);
    }
  };

  return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 10, padding: 36, boxShadow: "0 4px 16px #0001", minWidth: 290 }}>
        <h2 style={{ textAlign: "center", marginBottom: 30 }}>请选择入口</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {roles.map(role => (
            <button
              key={role.path}
              onClick={() => handleEnter(role.path)}
              style={{
                padding: "12px 0",
                borderRadius: 7,
                border: "none",
                background: "#1890ff",
                color: "#fff",
                fontSize: 17,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 1px 5px #0001"
              }}
            >
              {role.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
