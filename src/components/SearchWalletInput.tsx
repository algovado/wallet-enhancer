import { isValidAddress } from "algosdk";
import { useState } from "react";
import { FaSearch } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { getWalletAddressFromNFDomain } from "../core/utils";

export default function SearchWalletInput() {
  const [searchWallet, setSearchWallet] = useState("");
  const navigation = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    let walletAddress = searchWallet.trim();
    if (walletAddress.toLowerCase().includes(".algo")) {
      const response = await getWalletAddressFromNFDomain(
        walletAddress.toLowerCase()
      );
      if (response.length === 58 && isValidAddress(response)) {
        setSearchWallet("");
        navigation(`/account/${walletAddress.toLowerCase()}`);
      } else {
        toast.error("Invalid domain name!");
        return;
      }
    } else if (!isValidAddress(walletAddress)) {
      toast.error("Invalid wallet address!");
      return;
    } else {
      setSearchWallet("");
      navigation(`/account/${walletAddress}`);
    }
  };

  return (
    <form className="flex" onSubmit={handleSubmit}>
      <input
        id="wallet-search-input"
        type="text"
        className="px-4 py-2 w-60 rounded-l placeholder:font-roboto placeholder:text-black text-black placeholder:opacity-70 focus:outline-none"
        placeholder="search algo or .algo address"
        value={searchWallet}
        onChange={(e) => setSearchWallet(e.target.value)}
      />
      <button
        type="submit"
        className="flex items-center justify-center rounded-r px-4 bg-primary-green"
      >
        <FaSearch className="text-white" />
      </button>
    </form>
  );
}
