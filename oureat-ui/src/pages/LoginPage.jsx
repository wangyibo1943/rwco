import React from "react";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const nav = useNavigate();
  const roles = [
    { label: "用户端", path: "/user" },
    { label: "商家端", path: "/merchant" },
    { label: "骑手端", path: "/rider" },
    { label: "管理端", path: "/admin" },
  ];
  return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 10, padding: 36, boxShadow: "0 4px 16px #0001", minWidth: 290 }}>
        <h2 style={{ textAlign: "center", marginBottom: 30 }}>请选择入口</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {roles.map(role => (
            <button
              key={role.path}
              onClick={() => nav(role.path)}
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
