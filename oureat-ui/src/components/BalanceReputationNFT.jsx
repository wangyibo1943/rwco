import { useAccount, useReadContract } from "wagmi";
import NFT_ABI from "../abis/ReputationNFT.json";

const NFT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

export default function BalanceReputationNFT() {
  const { address } = useAccount();
  const { data: balance, isLoading, error } = useReadContract({
    address: NFT_ADDRESS,
    abi: NFT_ABI,
    functionName: "balanceOf",
    args: [address],
    watch: true,
  });

  if (!address) return <div>请先连接钱包</div>;
  if (isLoading) return <div>加载声誉NFT中...</div>;
  if (error) return <div>查询失败: {error.message}</div>;
  return (
    <div style={{ marginTop: 20 }}>
      <strong>我的声誉NFT数量：</strong>
      {balance ? Number(balance) : 0}
    </div>
  );
}
