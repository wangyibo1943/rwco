// src/utils/connectWallet.ts
import Web3Modal from "web3modal";
import WalletConnectProvider from "@walletconnect/web3-provider";
import { ethers } from "ethers";

const OPTIONS = {
  cacheProvider: false,
  providerOptions: {
    walletconnect: {
      package: WalletConnectProvider,
      options: {
        rpc: {
          11155111: import.meta.env.VITE_SEPOLIA_RPC, // Sepolia chainId
        },
      },
    },
  },
};

export async function connectWallet(): Promise<ethers.providers.JsonRpcSigner> {
  // 打开连接弹窗
  const web3Modal = new Web3Modal(OPTIONS);
  const instance  = await web3Modal.connect();
  const provider  = new ethers.providers.Web3Provider(instance);

  // 自动切到 Sepolia (0xaa36a7 = 11155111)
  try {
    await provider.send("wallet_switchEthereumChain", [{ chainId: "0xaa36a7" }]);
  } catch (switchError: any) {
    if (switchError.code === 4902) {
      // 如果钱包里没有，就添加
      await provider.send("wallet_addEthereumChain", [{
        chainId: "0xaa36a7",
        chainName: "Sepolia Testnet",
        rpcUrls: [import.meta.env.VITE_SEPOLIA_RPC],
        nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
        blockExplorerUrls: ["https://sepolia.etherscan.io"],
      }]);
    } else {
      console.error("切换网络失败", switchError);
    }
  }

  // 请求授权
  await provider.send("eth_requestAccounts", []);
  return provider.getSigner();
}