import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  DialogContentText,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
} from "@mui/material";
import { toast } from "react-toastify";
import { isValidAddress } from "algosdk";
import {
  createAssetTransferTransactions,
  getAssetData,
  getWalletAddressFromNFDomain,
  sendSignedTransaction,
  shortenAddress,
  signTransactions,
} from "../../core/utils";
import useAssetStore from "../../store/assetStore";
import useToolStore from "../../store/toolStore";
import useConnectionStore from "../../store/connectionStore";

interface AssetTransferDialogProps {
  open: boolean;
  onClose: () => void;
}

const AssetTransferDialog: React.FC<AssetTransferDialogProps> = ({
  open,
  onClose,
}) => {
  const connectionState = useConnectionStore((s) => s);
  const toolState = useToolStore((s) => s);
  const [amount, setAmount] = useState("1");
  const [receiver, setReceiver] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [unsignedAssets, setUnsignedAssets] = useState([] as Uint8Array[]);

  const handleCreate = async () => {
    try {
      if (!amount || !receiver) {
        toast.info("Please fill all fields");
        return;
      }
      if (Number(amount) <= 0) {
        toast.info("Amount must be greater than 0");
        return;
      }
      let walletAddress = receiver.trim();
      setLoading(true);
      if (walletAddress.toLowerCase().includes(".algo")) {
        const response = await getWalletAddressFromNFDomain(
          walletAddress.toLowerCase()
        );
        if (isValidAddress(response)) {
          walletAddress = response;
        } else {
          toast.error("Invalid receiver address!");
          setLoading(false);
          return;
        }
      } else if (!isValidAddress(walletAddress)) {
        toast.error("Invalid receiver address!");
        setLoading(false);
        return;
      }
      let assetsForTransfer = [];
      const assets = toolState.selectedAssets;
      for (let i = 0; i < assets.length; i++) {
        let storedAsset = useAssetStore.getState().assets[assets[i]];
        if (!storedAsset) {
          storedAsset = await getAssetData(assets[i]);
        }
        assetsForTransfer.push({
          index: assets[i],
          amount: Number(amount),
          decimals: storedAsset.params.decimals,
          receiver: walletAddress,
        });
      }
      const createdTxns = await createAssetTransferTransactions(
        assetsForTransfer
      );
      const optinTxns = await signTransactions(createdTxns.flat(), receiver);
      console.log(optinTxns);
      setUnsignedAssets(optinTxns);
    } catch (error: any) {
      toast.error(
        error.message.split("TransactionPool.Remember:")[1] ||
          error.message ||
          "Something went wrong"
      );
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle className="text-center max-w-sm">Multi Transfer</DialogTitle>
      <DialogContent className="flex flex-col">
        <DialogContentText
          className="max-w-sm text-center"
          sx={{ fontSize: 14, mb: 1, px: 1 }}
        >
          Transfer multiple assets to a single address at once. You need to
          connect multiple wallets to use this tool.
        </DialogContentText>
        <div className="flex flex-col gap-2">
          <TextField
            fullWidth
            label="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            variant="filled"
            placeholder="Enter amount to send"
          />
          {connectionState.accounts.length > 1 ? (
            <FormControl variant="filled">
              <InputLabel id="receiver-label">Receiver</InputLabel>
              <Select
                fullWidth
                labelId="receiver-label"
                id="receiver"
                value={receiver}
                onChange={(e) => setReceiver(e.target.value)}
              >
                {connectionState.accounts
                  .filter(
                    (account) => account !== connectionState.walletAddress
                  )
                  .map((account) => (
                    <MenuItem key={account} value={account}>
                      {shortenAddress(account, 6)}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          ) : (
            <Alert severity="warning" className="text-center">
              You need to connect multiple wallets to use this tool.
            </Alert>
          )}
        </div>
        <p className="max-w-sm text-center mt-1 font-roboto">
          {toolState.selectedAssets.length}
          <Tooltip
            title={toolState.selectedAssets.join(", ")}
            placement="left-start"
          >
            <span className="cursor-pointer text-green-500 animate-pulse">
              {" "}
              assets{" "}
            </span>
          </Tooltip>
          {sendLoading ? "left" : "selected"}
        </p>
        {unsignedAssets.length > 0 && (
          <Button
            variant="outlined"
            color="primary"
            disabled={sendLoading}
            sx={{ mt: 1, width: "50%", alignSelf: "center" }}
            onClick={async () => {
              setSendLoading(true);
              const assets = toolState.selectedAssets;
              for (let i = 0; i < unsignedAssets.length; i += 2) {
                try {
                  const group = [unsignedAssets[i], unsignedAssets[i + 1]];
                  await toast.promise(sendSignedTransaction(group), {
                    pending: `${assets[i / 2]} sending...`,
                    success: `${assets[i / 2]} sent 🎉`,
                  });
                  toolState.removeSelectedAsset(assets[i / 2]);
                } catch (error: any) {
                  toast.error(
                    error.message.split("TransactionPool.Remember:")[1] ||
                      error.message ||
                      `${assets[i / 2]} failed 😕`
                  );
                }
              }
              onClose();
              setAmount("1");
              setReceiver("");
              setUnsignedAssets([]);
              setSendLoading(false);
            }}
          >
            {sendLoading ? "Sending..." : "Send Transactions"}
          </Button>
        )}
      </DialogContent>
      <DialogActions className="flex justify-center">
        <Button
          variant="text"
          color="primary"
          onClick={() => {
            setAmount("");
            setReceiver("");
            onClose();
          }}
        >
          Close
        </Button>
        <Button
          onClick={handleCreate}
          variant="text"
          color="success"
          disabled={
            loading ||
            connectionState.accounts.length <= 1 ||
            unsignedAssets.length > 0
          }
        >
          {loading ? "Creating..." : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AssetTransferDialog;
