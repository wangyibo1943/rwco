import React from "react";
import { Link } from "react-router-dom";

export default function HomeNav() {
  return (
    <nav style={{ padding: 16, background: "#fafafa", borderBottom: "1px solid #ddd" }}>
      <Link to="/user"     style={{ marginRight: 12, textDecoration: 'none', color: '#1890ff' }}>用户端</Link>
      <Link to="/merchant" style={{ marginRight: 12, textDecoration: 'none', color: '#1890ff' }}>商家端</Link>
      <Link to="/rider"    style={{ marginRight: 12, textDecoration: 'none', color: '#1890ff' }}>骑手端</Link>
      <Link to="/admin"    style={{ textDecoration: 'none', color: '#1890ff' }}>平台端</Link>
    </nav>
  );
}
