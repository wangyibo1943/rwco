import { ethers } from "ethers";

export default function OrderTable({ orders, acceptOrder, pickOrder, fulfillOrder, busy, type, highlightPlatform, showPlatformFee }) {
  if (!orders.length) return <div style={{color:"#888",margin:"10px 0"}}>暂无订单</div>;
  return (
    <table border="1" cellPadding={6} style={{ width: "100%", borderCollapse: "collapse", marginTop:8 }}>
      <thead>
        <tr>
          <th>ID</th>
          <th>顾客</th>
          <th>菜品</th>
          <th>金额</th>
          <th>商家</th>
          <th>骑手</th>
          <th>状态</th>
          {showPlatformFee && <th>平台抽成</th>}
          {(type==="accept"||type==="pick"||type==="fulfill") && <th>操作</th>}
        </tr>
      </thead>
      <tbody>
        {orders.map(o => (
          <tr key={o.id} style={highlightPlatform && o.platformFee && o.platformFee!=="0" ? {background:"#fffbe7"} : {}}>
            <td>{o.id}</td>
            <td>{short(o.customer)}</td>
            <td>{o.dish}</td>
            <td>{o.amount}</td>
            <td>{o.merchant && o.merchant !== ethers.ZeroAddress ? short(o.merchant) : "-"}</td>
            <td>{o.rider && o.rider !== ethers.ZeroAddress ? short(o.rider) : "-"}</td>
            <td>
              {o.fulfilled ? "已完成"
              : o.picked ? "派送中"
              : o.accepted ? "商家已出餐"
              : "待接单"}
            </td>
            {showPlatformFee && <td>{o.platformFee} <span style={{fontSize:12,color:"#888"}}>RCO</span></td>}
            {type==="accept" && !o.accepted && !o.fulfilled &&
              <td><button onClick={()=>acceptOrder(o.id)} disabled={busy}>接单/出餐</button></td>}
            {type==="pick" && o.accepted && !o.picked && !o.fulfilled &&
              <td><button onClick={()=>pickOrder(o.id)} disabled={busy}>抢单</button></td>}
            {type==="fulfill" && o.picked && !o.fulfilled &&
              <td><button onClick={()=>fulfillOrder(o.id)} disabled={busy}>完成履约</button></td>}
            {(type!=="accept" && type!=="pick" && type!=="fulfill") && <td></td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function short(addr) {
  if (!addr) return "";
  return addr.substring(0,6) + "..." + addr.slice(-4);
}
