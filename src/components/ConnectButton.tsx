// ** React Imports
import { MouseEvent, useEffect, useState } from "react";

// ** State Imports
import useConnectionStore from "../store/connectionStore";

// ** MUI Imports
import { Icon, IconButton, Select } from "@mui/material";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import MenuList from "@mui/material/MenuList";
import Tooltip from "@mui/material/Tooltip";

import { FaCopy, FaWallet } from "react-icons/fa";
import { toast } from "react-toastify";

// ** Utils Imports
import { AccountDataType } from "../core/types";
import { getAccountData, shortenAddress } from "../core/utils";
import NetworkSelect from "./selects/NetworkSelect";

// ** Wallet Imports
import { DeflyWalletConnect } from "@blockshake/defly-connect";
import { DaffiWalletConnect } from "@daffiwallet/connect";
import { PeraWalletConnect } from "@perawallet/connect";
import useToolStore from "../store/toolStore";

export default function ConnectButton() {
  const connection = useConnectionStore((state) => state);
  const [accountData, setAccountData] = useState<AccountDataType>();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [switchAccount, setSwitchAccount] = useState(false);
  const open = Boolean(anchorEl);
  // wallet
  const peraWallet = new PeraWalletConnect();
  const deflyWallet = new DeflyWalletConnect();
  const daffiWallet = new DaffiWalletConnect();

  // handlers
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const connectToPera = async () => {
    handleClose();
    try {
      const accounts = await peraWallet.connect();
      connection.disconnect();
      connection.setAccounts(accounts);
      connection.setWalletAddress(accounts[0]);
      connection.setWalletType("pera");
      toast.success("Connected!");
    } catch (err) {
      toast.error("Failed to connect!");
    }
  };

  const connectToDefly = async () => {
    handleClose();
    try {
      const accounts = await deflyWallet.connect();
      connection.disconnect();
      connection.setAccounts(accounts);
      connection.setWalletAddress(accounts[0]);
      connection.setWalletType("defly");
      toast.success("Connected!");
    } catch (err) {
      toast.error("Failed to connect!");
    }
  };

  const connectToDaffi = async () => {
    handleClose();
    try {
      const accounts = await daffiWallet.connect();
      connection.disconnect();
      connection.setAccounts(accounts);
      connection.setWalletAddress(accounts[0]);
      connection.setWalletType("daffi");
      toast.success("Connected!");
    } catch (err) {
      toast.error("Failed to connect!");
    }
  };

  const disconnect = async () => {
    handleClose();
    try {
      if (connection.walletType === "pera") {
        await peraWallet.disconnect();
      } else if (connection.walletType === "defly") {
        await deflyWallet.disconnect();
      } else if (connection.walletType === "daffi") {
        await daffiWallet.disconnect();
      }
      connection.disconnect();
      toast.success("Disconnected!");
    } catch (err) {
      toast.error("Failed to disconnect!");
    }
  };

  useEffect(() => {
    if (connection.walletAddress) {
      getAccountData(connection.walletAddress).then((data) => {
        setAccountData(data);
      });
    }
  }, [connection.walletAddress]);

  const algoLogo = (
    <svg
      className="fill-text-color me-1 mb-1 ml-1"
      version="1.1"
      id="Layer_1"
      xmlns="http://www.w3.org/2000/svg"
      x="0px"
      y="0px"
      viewBox="0 0 200 200"
      style={{ height: "1.5rem", width: "16px" }}
    >
      <path
        style={{ fill: "white" }}
        d="M170.7,28.8C151.1,9.6,127.5,0,99.9,0C72.1,0,48.4,9.6,28.8,28.8C9.6,48.4,0,72.1,0,99.9 c0,27.6,9.6,51.2,28.8,70.7C48.4,190.2,72.1,200,99.9,200c27.6,0,51.2-9.7,70.7-29.2c19.5-19.6,29.2-43.3,29.2-70.9 C199.9,72.1,190.1,48.4,170.7,28.8 M106.2,41.9H123l7.2,27h17.1l-11.7,20.7l16.6,61.6H135l-11.2-41.4l-23.9,41.4H81l36.9-63.9 l-6.3-22.5l-49.5,86.4H42.8L106.2,41.9z"
      ></path>
      <path
        style={{ fill: "#FFFFF", fillOpacity: "0" }}
        d="M123,41.9h-16.7L42.8,151.3h19.3l49.5-86.4l6.3,22.5L81,151.3h18.9l23.9-41.4l11.3,41.4 c33.7-1.3-5.5-51.1,12.2-82.3h-17.1L123,41.9z"
      ></path>
    </svg>
  );

  return (
    <div className="flex flex-row justify-center items-center">
      <NetworkSelect />
      {!connection.walletAddress ? (
        <Button
          id="connect-button"
          aria-controls={open ? "connect-menu" : undefined}
          aria-haspopup="true"
          aria-expanded={open ? "true" : undefined}
          onClick={handleClick}
          color="success"
          className="hover:bg-secondary-green hover:text-white transition"
        >
          <span className="font-sans text-secondary-green">Connect</span>
        </Button>
      ) : (
        <Tooltip title="Account" placement="bottom-start">
          <IconButton
            id="connect-button"
            aria-controls={open ? "connect-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={open ? "true" : undefined}
            onClick={handleClick}
            sx={{ fontFamily: "sans", fontWeight: "bold", color: "white" }}
          >
            <FaWallet height={50} width={50} />
          </IconButton>
        </Tooltip>
      )}
      <Menu
        id="connect-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          "aria-labelledby": "connect-button",
        }}
        sx={{ mt: "1px", "& .MuiMenu-paper": { backgroundColor: "#010002" } }}
      >
        {!connection.walletAddress ? (
          <MenuList sx={{ p: "0px" }}>
            <MenuItem
              sx={{
                backgroundColor: "#ffee55",
                color: "black",
                fontWeight: "bold",
                borderTopLeftRadius: "4px",
                borderTopRightRadius: "4px",
                ":hover": { backgroundColor: "#ffee55", opacity: "0.8" },
              }}
              onClick={connectToPera}
            >
              Pera
            </MenuItem>
            <MenuItem
              sx={{
                backgroundColor: "#131313",
                color: "white",
                fontWeight: "bold",
                borderBottomLeftRadius: "4px",
                borderBottomRightRadius: "4px",
                ":hover": { backgroundColor: "#131313", opacity: "0.8" },
              }}
              onClick={connectToDefly}
            >
              Defly
            </MenuItem>
            <MenuItem
              sx={{
                backgroundColor: "#00BAA4",
                color: "black",
                fontWeight: "bold",
                borderBottomLeftRadius: "4px",
                borderBottomRightRadius: "4px",
                ":hover": { backgroundColor: "#00BAA4", opacity: "0.8" },
              }}
              onClick={connectToDaffi}
            >
              Daffi
            </MenuItem>
          </MenuList>
        ) : (
          <MenuList sx={{ p: "0px" }}>
            <MenuItem
              sx={{
                color: "white",
                fontWeight: "bold",
              }}
              onClick={() => {
                navigator.clipboard.writeText(connection.walletAddress);
                toast.success("Copied!");
              }}
            >
              <div className="flex flex-row items-center">
                <span>{shortenAddress(connection.walletAddress)}</span>
                <Icon className="ml-2" style={{ fontSize: "1rem" }}>
                  <FaCopy />
                </Icon>
              </div>
            </MenuItem>
            {connection.accounts.length > 1 && (
              <MenuItem
                sx={{
                  color: "white",
                  fontWeight: "bold",
                }}
              >
                <Select
                  value={connection.walletAddress}
                  onChange={(e) => {
                    connection.setWalletAddress(e.target.value as string);
                    setSwitchAccount(!switchAccount);
                    useToolStore.getState().clearSelectedAssets();
                    useToolStore.getState().setTool(null);
                  }}
                  inputProps={{ "aria-label": "Without label" }}
                  sx={{
                    height: "2rem",
                    color: "white",
                    fontWeight: "bold",
                    fontSize: "1rem",
                  }}
                >
                  {connection.accounts.map((account) => (
                    <MenuItem value={account} key={account}>
                      {shortenAddress(account)}
                    </MenuItem>
                  ))}
                </Select>
              </MenuItem>
            )}
            <MenuItem
              sx={{
                textAlign: "start",
                color: "white",
                borderBottomLeftRadius: "4px",
                borderBottomRightRadius: "4px",
              }}
              onClick={handleClose}
            >
              <div className="flex flex-col justify-start">
                <span className="text-sm font-medium">
                  <div className="flex flex-row items-center">
                    Balance: {((accountData?.amount || 0) / 10 ** 6).toFixed(2)}
                    {algoLogo}
                  </div>
                </span>
                <span className="text-sm font-medium">
                  <div className="flex flex-row items-center">
                    Min Balance:{" "}
                    {((accountData?.["min-balance"] || 0) / 10 ** 6).toFixed(2)}
                    {algoLogo}
                  </div>
                </span>
                <span className="text-sm font-medium">
                  Asset Count: {accountData?.["total-assets-opted-in"]}
                </span>
              </div>
            </MenuItem>
            <MenuItem
              sx={{
                backgroundColor: "red",
                color: "white",
                ":hover": { backgroundColor: "red", opacity: "0.8" },
                fontWeight: "bold",
                borderBottomLeftRadius: "4px",
                borderBottomRightRadius: "4px",
              }}
              onClick={disconnect}
            >
              Disconnect
            </MenuItem>
          </MenuList>
        )}
      </Menu>
    </div>
  );
}
