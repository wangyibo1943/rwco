import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import ORDER_ABI from "../abis/OrderContract.json";

const ORDER_CONTRACT_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

export default function OrderList() {
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();

  const { data: orderCount, refetch } = useReadContract({
    address: ORDER_CONTRACT_ADDRESS,
    abi: ORDER_ABI,
    functionName: "orderCount",
  });

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      setErrMsg("");
      if (!orderCount) {
        setOrders([]);
        setLoading(false);
        return;
      }
      const all = [];
      for (let i = 0; i < Number(orderCount); i++) {
        try {
          // 推荐用 wagmi/viem/ethers 查 getOrder
          const res = await window.ethereum.request({
            method: "eth_call",
            params: [{
              to: ORDER_CONTRACT_ADDRESS,
              data: encodeGetOrderCall(i)
            }, "latest"],
          });
          const parsed = decodeOrder(res); // 你需要根据ABI结构做解码
          all.push({ id: i, ...parsed });
        } catch (e) {
          all.push({ id: i, error: e.message });
        }
      }
      setOrders(all);
      setLoading(false);
    }
    fetchOrders();
  }, [orderCount]);

  function encodeGetOrderCall(orderId) {
    return (
      "0x97de706f" +
      orderId.toString(16).padStart(64, "0")
    );
  }
  function decodeOrder(hexData) {
    // 这里建议你用 viem/ethers 解析，假如用 wagmi v2，可直接用 useReadContract 调多次
    return {};
  }

  // 履约订单
  async function handleFulfill(orderId, customer) {
    setErrMsg("");
    try {
      await writeContractAsync({
        address: ORDER_CONTRACT_ADDRESS,
        abi: ORDER_ABI,
        functionName: "fulfillOrder",
        args: [orderId, customer],
      });
      // 刷新订单列表
      refetch();
    } catch (e) {
      setErrMsg(e.message || "履约失败");
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: "40px auto" }}>
      <h3>订单列表（总数: {Number(orderCount || 0)}）</h3>
      {errMsg && <div style={{ color: "red" }}>{errMsg}</div>}
      <table border="1" cellPadding="8" style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>用户地址</th>
            <th>菜品</th>
            <th>金额</th>
            <th>是否履约</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 && (
            <tr>
              <td colSpan="6">暂无订单</td>
            </tr>
          )}
          {orders.map(order => (
            <tr key={order.id}>
              <td>{order.id}</td>
              <td>{order.customer}</td>
              <td>{order.item}</td>
              <td>{order.amount}</td>
              <td>{order.fulfilled ? "✅" : "未完成"}</td>
              <td>
                {!order.fulfilled && (
                  <button
                    onClick={() => handleFulfill(order.id, order.customer)}
                    disabled={isPending}
                  >
                    {isPending ? "履约中..." : "履约"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
