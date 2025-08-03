import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import HomeNav from "./HomeNav";
import UserApp from "./pages/UserApp";
import MerchantApp from "./pages/MerchantApp";
import RiderApp from "./pages/RiderApp";
import PlatformApp from "./pages/PlatformApp";
import LoginPage from "./pages/LoginPage"; // 主页入口页（你可以叫 HomePage/Home/LoginPage 都行）

export default function App() {
  return (
    <Router>
      {/* 全局导航栏，始终显示 */}
      <HomeNav />

      <Routes>
        {/* 根路径就是入口页（四端按钮） */}
        <Route path="/" element={<LoginPage />} />

        {/* 各角色页面 */}
        <Route path="/user" element={<UserApp />} />
        <Route path="/merchant" element={<MerchantApp />} />
        <Route path="/rider" element={<RiderApp />} />
        <Route path="/admin" element={<PlatformApp />} />

        {/* 其它路径重定向到根目录 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
