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
          11155111: import.meta.env.VITE_SEPOLIA_RPC,
        },
      },
    },
  },
};

export async function connectWallet(): Promise<ethers.providers.JsonRpcSigner> {
  const web3Modal = new Web3Modal(OPTIONS);
  const instance = await web3Modal.connect();              // 弹出钱包列表
  const provider = new ethers.providers.Web3Provider(instance);
  await provider.send("eth_requestAccounts", []);           // 请求授权
  return provider.getSigner();
}
