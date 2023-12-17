import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import { ToolSelectProps } from "../../core/types";
import useToolStore from "../../store/toolStore";
import Button from "@mui/material/Button";
import { toast } from "react-toastify";
import {
  createAssetDestroyTransactions,
  createAssetOptoutTransactions,
  sendSignedTransaction,
} from "../../core/utils";
import { Fragment, useState } from "react";
import MultipleAssetSendDialog from "../dialogs/MultipleAssetSendDialog";
import OutlinedInput from "@mui/material/OutlinedInput";
import Alert from "@mui/material/Alert";
import AssetTransferDialog from "../dialogs/AssetTransferDialog";

export default function ToolSelect({
  tools,
  setFilteredAssets,
}: ToolSelectProps) {
  const toolState = useToolStore();
  const [isLoading, setIsLoading] = useState(false);
  const [openMultiSend, setOpenMultiSend] = useState(false);
  const [openAssetTransfer, setOpenAssetTransfer] = useState(false);

  const handleMultiSendDialog = () => {
    setOpenMultiSend(!openMultiSend);
  };

  const handleAssetTransferDialog = () => {
    setOpenAssetTransfer(!openAssetTransfer);
  };

  const handleOnClick = async () => {
    if (toolState.tool) {
      if (
        ["asset-opt-out", "asset-opt-in", "asset-destroy"].includes(
          toolState.tool.id
        )
      ) {
        let signedTransactions;
        try {
          setIsLoading(true);
          signedTransactions = await toolState.tool.action(
            toolState.selectedAssets
          );
        } catch (error: any) {
          toast.error(
            error.message || "Something went wrong while creating transactions"
          );
          setIsLoading(false);
          return;
        }
        if (signedTransactions) {
          for (let i = 0; i < signedTransactions.length; i++) {
            try {
              await toast.promise(
                sendSignedTransaction([signedTransactions[i]]),
                {
                  pending: `${toolState.selectedAssets[i]}'s transaction sending...`,
                  success: `${toolState.selectedAssets[i]}'s transaction sent 🎉`,
                }
              );
              if (
                toolState.tool.action === createAssetOptoutTransactions ||
                toolState.tool.action === createAssetDestroyTransactions
              ) {
                setFilteredAssets((prev) =>
                  prev.filter(
                    (a) => a["asset-id"] !== toolState.selectedAssets[i]
                  )
                );
                toolState.removeSelectedAsset(toolState.selectedAssets[i]);
              }
            } catch (error: any) {
              toast.error(
                `${toolState.selectedAssets[i]}'s transaction is not sent: ` +
                  (error.message.split("TransactionPool.Remember:")[1] ||
                    error.message ||
                    "Something went wrong")
              );
            }
          }
        }
      } else if (toolState.tool.id === "asset-send") {
        handleMultiSendDialog();
      } else if (toolState.tool.id === "asset-transfer") {
        handleAssetTransferDialog();
      } else if (toolState.tool.id === "asset-copy") {
        toolState.tool.action(toolState.selectedAssets);
      }
      setIsLoading(false);
    }
  };

  return (
    <div>
      {toolState.tool?.id === "asset-opt-out" && (
        <Alert severity="warning" className="my-1 sm:my-0 ml-0 sm:ml-2">
          Opting out of assets with a non-zero balance will result in a{" "}
          <strong>loss</strong> of asset.
        </Alert>
      )}
      <div className="flex flex-col sm:flex-row justify-start items-center">
        <FormControl sx={{ m: 1, minWidth: 120 }}>
          <Select
            native
            defaultValue={toolState.tool?.id}
            input={<OutlinedInput />}
            sx={{
              height: "2rem",
              color: "white",
              fontWeight: "bold",
              fontSize: "1rem",
            }}
            inputProps={{ "aria-label": "Without label" }}
            id="tool-select-input"
            label="Select Tool"
            onChange={(e) => {
              const toolId = e.target.value;
              if (!toolId) {
                toolState.setTool(null);
                return;
              }
              const result = tools.find((tool) => tool.id === toolId);
              if (result) {
                toolState.setTool(result);
              }
            }}
          >
            <option aria-label="None" value="">
              Select Tool
            </option>
            {tools.map((tool) => (
              <option key={tool.id} value={tool.id}>
                {tool.name}
              </option>
            ))}
          </Select>
        </FormControl>
        {toolState.selectedAssets.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-y-2 sm:gap-x-2">
            <p className="text-primary-gray text-sm">
              {toolState.selectedAssets.length} asset
              {toolState.selectedAssets.length > 1 ? "s" : ""} selected
            </p>
            {toolState.tool ? (
              <Button
                variant="contained"
                color="success"
                onClick={handleOnClick}
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : toolState.tool.name.split(" ")[1]}
              </Button>
            ) : (
              <Button
                variant="contained"
                color="info"
                onClick={toolState.clearSelectedAssets}
              >
                Clear
              </Button>
            )}
          </div>
        )}
        {toolState.selectedAssets.length === 0 && toolState.tool && (
          <p className="text-primary-gray text-sm">
            Please select assets to use {toolState.tool.name}.
          </p>
        )}
        <Fragment>
          <MultipleAssetSendDialog
            open={openMultiSend}
            onClose={handleMultiSendDialog}
          />
          <AssetTransferDialog
            open={openAssetTransfer}
            onClose={handleAssetTransferDialog}
          />
        </Fragment>
      </div>
    </div>
  );
}
