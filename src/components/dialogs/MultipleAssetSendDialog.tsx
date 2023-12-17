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
} from "@mui/material";
import { toast } from "react-toastify";
import { isValidAddress } from "algosdk";
import {
  createAssetSendTransactions,
  getAssetData,
  getWalletAddressFromNFDomain,
  sendSignedTransaction,
} from "../../core/utils";
import useAssetStore from "../../store/assetStore";
import useToolStore from "../../store/toolStore";

interface MultipleAssetSendDialogProps {
  open: boolean;
  onClose: () => void;
}

const MultipleAssetSendDialog: React.FC<MultipleAssetSendDialogProps> = ({
  open,
  onClose,
}) => {
  const toolState = useToolStore((s) => s);

  const [amount, setAmount] = useState("1");
  const [receiver, setReceiver] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
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
      const signedTransactions = await createAssetSendTransactions(
        assetsForTransfer
      );
      for (let i = 0; i < signedTransactions.length; i++) {
        await toast.promise(sendSignedTransaction([signedTransactions[i]]), {
          pending: `${assets[i]} sending...`,
          success: `${assets[i]} sent 🎉`,
        });
        toolState.removeSelectedAsset(assets[i]);
      }
      setAmount("1");
      setReceiver("");
      onClose();
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
      <DialogTitle className="text-center max-w-sm">Multi Send</DialogTitle>
      <DialogContent className="flex flex-col">
        <DialogContentText
          className="max-w-sm text-center"
          sx={{ fontSize: 14, mb: 1, px: 1 }}
        >
          Send multiple assets to a single address at once.
        </DialogContentText>
        <TextField
          label="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          variant="filled"
          placeholder="Amount"
        />
        <TextField
          label="Receiver"
          value={receiver}
          onChange={(e) => setReceiver(e.target.value)}
          margin="dense"
          variant="filled"
          placeholder="algo or .algo address"
        />
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
          selected
        </p>
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
          onClick={handleSend}
          variant="text"
          color="success"
          disabled={loading}
        >
          {loading ? "Sending..." : "Send"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MultipleAssetSendDialog;
