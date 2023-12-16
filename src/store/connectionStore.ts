import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ConnectionState {
  accounts: string[];
  setAccounts: (accounts: string[]) => void;
  walletAddress: string;
  setWalletAddress: (walletAddress: string) => void;
  networkType: "mainnet" | "testnet";
  setNetworkType: (networkType: "mainnet" | "testnet") => void;
  walletType: "pera" | "defly" | "daffi" | null;
  setWalletType: (walletType: "pera" | "defly" | "daffi" | null) => void;
  disconnect: () => void;
}

const useConnectionStore = create<ConnectionState>()(
  persist(
    (set) => ({
      accounts: [],
      setAccounts: (accounts: string[]) => set({ accounts }),
      walletAddress: "",
      setWalletAddress: (walletAddress) => set({ walletAddress }),
      networkType: "mainnet",
      setNetworkType: (networkType) => {
        set({ networkType });
        window.location.reload();
      },
      walletType: null,
      setWalletType: (walletType) => set({ walletType }),
      disconnect: () =>
        set({ accounts: [], walletAddress: "", walletType: null }),
    }),
    {
      name: "wallet",
    }
  )
);

export default useConnectionStore;
