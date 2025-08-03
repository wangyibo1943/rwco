import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import ORDER_ABI from "../abis/OrderContract.json";

const ORDER_CONTRACT_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

export default function OrderCreateForm() {
  const { address, isConnected } = useAccount();
  const [foodName, setFoodName] = useState("");
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");

  const { writeContractAsync, isPending } = useWriteContract();

  async function handleSubmit(e) {
    e.preventDefault();
    setTxHash("");
    setError("");
    if (!foodName || !amount) {
      setError("请输入完整订单信息");
      return;
    }
    try {
      const hash = await writeContractAsync({
        address: ORDER_CONTRACT_ADDRESS,
        abi: ORDER_ABI,
        functionName: "createOrder", // 按你的ABI里的实际方法名写
        args: [foodName, Number(amount)],
      });
      setTxHash(hash);
    } catch (err) {
      setError(err.message || "链上提交失败");
    }
  }

  if (!isConnected) return <div>请先连接钱包</div>;

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400, margin: "40px auto" }}>
      <h3>创建新订单</h3>
      <div>
        <label>菜品名：</label>
        <input
          value={foodName}
          onChange={e => setFoodName(e.target.value)}
          style={{ width: "100%" }}
        />
      </div>
      <div>
        <label>金额（整数）：</label>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          style={{ width: "100%" }}
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        style={{ marginTop: 12, padding: "6px 20px" }}
      >
        {isPending ? "提交中..." : "提交订单"}
      </button>
      {txHash && (
        <div style={{ color: "green" }}>
          提交成功，TxHash: {txHash.slice(0, 10)}...
        </div>
      )}
      {error && (
        <div style={{ color: "red" }}>
          错误：{error}
        </div>
      )}
    </form>
  );
}
