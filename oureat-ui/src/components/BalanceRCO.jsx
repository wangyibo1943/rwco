import { useAccount, useReadContract } from "wagmi";
import RCO_ABI from "../abis/RCO.json";

const RCO_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export default function BalanceRCO() {
  const { address } = useAccount();
  const { data: balance, isLoading, error } = useReadContract({
    address: RCO_ADDRESS,
    abi: RCO_ABI,
    functionName: "balanceOf",
    args: [address],
    watch: true,
  });

  if (!address) return <div>请先连接钱包</div>;
  if (isLoading) return <div>加载RCO余额中...</div>;
  if (error) return <div>查询失败: {error.message}</div>;
  return (
    <div style={{ marginTop: 20 }}>
      <strong>我的RCO余额：</strong>
      {balance ? Number(balance) / 1e18 : 0} RCO
    </div>
  );
}
