import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Checkbox,
  Chip,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  MenuList,
} from "@mui/material";
import React, { MouseEvent, useEffect, useState } from "react";
import { IoMdMore } from "react-icons/io";
import { toast } from "react-toastify";
import { MAX_SELECT_COUNT } from "../core/constants";
import { AssetsType, SingleAssetDataResponse } from "../core/types";
import {
  copyAssetIds,
  createAssetDestroyTransactions,
  createAssetOptInTransactions,
  createAssetOptoutTransactions,
  createDeletedAssetOptoutTransactions,
  getAssetData,
  getAssetDirectionUrl,
  getAssetType,
  ipfsToUrl,
  sendSignedTransaction,
  shortenAddress,
} from "../core/utils";
import useAssetStore from "../store/assetStore";
import useConnectionStore from "../store/connectionStore";
import useToolStore from "../store/toolStore";
import AssetSendDialog from "./dialogs/AssetSendDialog";

interface AssetImageCardProps {
  asset: AssetsType;
  page: "home" | "account";
  setFilteredAssets: React.Dispatch<React.SetStateAction<AssetsType[]>>;
}

const AssetImageCard = ({
  asset,
  page,
  setFilteredAssets,
}: AssetImageCardProps) => {
  const [assetData, setAssetData] = useState<SingleAssetDataResponse>();
  const [assetUrl, setAssetUrl] = useState<string>("/images/loading.gif");
  const toolState = useToolStore((state) => state);

  const AssetCardOptions = () => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const connectionState = useConnectionStore((state) => state);
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const rowOptionsOpen = Boolean(anchorEl);

    const handleRowOptionsClick = (event: MouseEvent<HTMLElement>) => {
      setAnchorEl(event.currentTarget);
    };

    const handleRowOptionsClose = () => {
      setAnchorEl(null);
    };

    async function itemOnClick(
      pendingMessage: string,
      successMessage: string,
      transactionFunction: (
        assets: number[]
      ) => Promise<Uint8Array[] | undefined>
    ) {
      try {
        if (!assetData) return null;
        setIsLoading(true);
        const signedTxn = await transactionFunction([assetData.index]);
        if (!signedTxn) return;
        await toast.promise(sendSignedTransaction(signedTxn), {
          pending: pendingMessage,
          success: successMessage,
        });
        handleRowOptionsClose();
        if (
          transactionFunction === createAssetDestroyTransactions ||
          transactionFunction === createAssetOptoutTransactions
        ) {
          setFilteredAssets((prev) =>
            prev.filter((a) => a["asset-id"] !== assetData.index)
          );
        }
      } catch (error: any) {
        toast.error(
          error.message.split("TransactionPool.Remember:")[1] ||
            error.message ||
            "Something went wrong"
        );
      }
      setIsLoading(false);
    }

    if (!assetData) return null;

    const handleDialog = () => {
      setOpen(!open);
    };

    const MenuItems = () => {
      return (
        <MenuList disablePadding>
          {page === "home" ? (
            <div>
              {asset.amount > 0 && (
                <MenuItem
                  onClick={() => {
                    handleRowOptionsClose();
                    handleDialog();
                  }}
                  sx={{ "& svg": { mr: 2 } }}
                >
                  Send
                </MenuItem>
              )}
              {assetData.params.creator === connectionState.walletAddress && (
                <MenuItem
                  sx={{ "& svg": { mr: 2 } }}
                  onClick={async () =>
                    await itemOnClick(
                      "Asset destroying...",
                      "Asset destroyed successfully 🎉",
                      createAssetDestroyTransactions
                    )
                  }
                >
                  Destroy
                </MenuItem>
              )}
              {assetData.params.creator !== connectionState.walletAddress && (
                <MenuItem
                  sx={{ "& svg": { mr: 2 } }}
                  onClick={async () =>
                    await itemOnClick(
                      "Opting-out...",
                      "Opted-out successfully 🎉",
                      createAssetOptoutTransactions
                    )
                  }
                >
                  Opt-out
                </MenuItem>
              )}
            </div>
          ) : (
            <MenuItem
              sx={{ "& svg": { mr: 2 } }}
              onClick={async () => {
                await itemOnClick(
                  "Opting-in...",
                  "Opted-in successfully 🎉",
                  createAssetOptInTransactions
                );
              }}
            >
              Opt-in
            </MenuItem>
          )}
          <MenuItem
            sx={{ "& svg": { mr: 2 } }}
            onClick={() => {
              copyAssetIds([assetData.index]);
              handleRowOptionsClose();
            }}
          >
            Copy Id
          </MenuItem>
        </MenuList>
      );
    };

    return (
      <React.Fragment>
        <IconButton size="small" onClick={handleRowOptionsClick}>
          <IoMdMore />
        </IconButton>
        <Menu
          keepMounted
          anchorEl={anchorEl}
          open={rowOptionsOpen}
          onClose={handleRowOptionsClose}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
          PaperProps={{ style: { minWidth: "6rem" } }}
        >
          {isLoading ? (
            <MenuItem disabled>
              <CircularProgress color="info" size={24} sx={{ ml: 2 }} />
            </MenuItem>
          ) : (
            <MenuItems />
          )}
        </Menu>
        <AssetSendDialog
          balance={asset.amount}
          asset={assetData}
          onClose={handleDialog}
          open={open}
        />
      </React.Fragment>
    );
  };

  useEffect(() => {
    async function getData() {
      const stateData = useAssetStore
        .getState()
        .assets.find((a) => a.index === asset["asset-id"]);
      if (stateData) {
        setAssetData(stateData);
        const url = await ipfsToUrl(
          stateData.params.url,
          stateData.params.reserve
        );
        setAssetUrl(url);
        return;
      }
      const response = await getAssetData(asset["asset-id"]);
      setAssetData(response);
      useAssetStore.getState().addAsset(response);
      const url = await ipfsToUrl(response.params.url, response.params.reserve);
      setAssetUrl(url);
    }
    if (!asset["asset-id"]) return;
    getData();
  }, [asset]);

  const handleCardClick = (assetId: number) => {
    const selectedAssets = toolState.selectedAssets;
    if (selectedAssets.includes(assetId)) {
      toolState.removeSelectedAsset(assetId);
      return;
    }
    if (selectedAssets.length < MAX_SELECT_COUNT) {
      toolState.addSelectedAsset(assetId);
    } else {
      toast.info(`You can only select ${MAX_SELECT_COUNT} assets at a time.`);
    }
  };

  return (
    <>
      {assetData && (
        <Card sx={{ minHeight: "100%" }}>
          <CardActionArea onClick={() => handleCardClick(asset["asset-id"])}>
            <CardMedia
              component="img"
              alt={assetData.params.name}
              height="150"
              image={assetUrl || "/images/404.webp"}
              className="w-full aspect-square p-1"
              loading="lazy"
              onError={() => setAssetUrl("/images/404.webp")}
            />
            <Checkbox
              checked={toolState.selectedAssets.includes(asset["asset-id"])}
              style={{
                position: "absolute",
                top: "0px",
                right: "0px",
                color: toolState.selectedAssets.includes(asset["asset-id"])
                  ? "green"
                  : "black",
              }}
              inputProps={{ "aria-label": `Select image ${asset["asset-id"]}` }}
            />
            {assetData?.params && (
              <>
                {getAssetType(assetData.params.url) !== "-" && (
                  <Chip
                    label={getAssetType(assetData.params.url)}
                    size="small"
                    className="absolute bottom-2 left-2"
                    variant="filled"
                    color="info"
                    title="Asset Type"
                  />
                )}
                <Chip
                  label={`Balance: ${
                    asset.amount / 10 ** assetData.params.decimals
                  }`}
                  size="small"
                  className="absolute bottom-2 right-2"
                  variant="filled"
                  color="info"
                />
              </>
            )}
          </CardActionArea>
          <CardContent
            sx={{
              paddingBottom: "8px !important",
            }}
          >
            {!assetData.deleted ? (
              <>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    my: -1,
                  }}
                >
                  <span className="text-lg text-primary-green ml-0.5 font-medium flex items-center">
                    {assetData.params.name}
                  </span>
                  <AssetCardOptions />
                </Box>
                <div className="flex flex-col mt-2">
                  <a
                    href={getAssetDirectionUrl(asset["asset-id"])}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-0.5 text-primary-gray text-sm font-medium hover:text-gray-500 transition"
                  >
                    {assetData?.params["unit-name"]
                      ? assetData?.params["unit-name"] + " - "
                      : ""}{" "}
                    {asset["asset-id"]}
                  </a>
                  <a
                    href={`https://allo.info/account/${assetData.params.creator}`}
                    className="ml-0.5 text-primary-gray text-sm font-medium hover:text-gray-500 transition"
                  >
                    Creator: {shortenAddress(assetData.params.creator)}
                  </a>
                </div>
              </>
            ) : (
              <>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    my: -1,
                  }}
                >
                  <a
                    href={getAssetDirectionUrl(asset["asset-id"])}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-0.5 text-primary-gray text-sm font-medium hover:underline hover:text-gray-500 transition duration-150"
                  >
                    {asset["asset-id"]}
                  </a>
                  <AssetCardOptions />
                </Box>
                <div className="flex flex-col mt-2">
                  <p className="ml-0.5 text-red-500 text-sm font-medium text-center my-2">
                    DELETED
                  </p>
                  {/* opt-out button */}
                  {useConnectionStore.getState().walletAddress ===
                    assetData.params.creator && (
                    <Button
                      variant="contained"
                      color="error"
                      fullWidth
                      sx={{
                        "&:hover": { backgroundColor: "#e53935" },
                        mt: 2,
                        width: "50%",
                        margin: "auto",
                      }}
                      onClick={async () => {
                        try {
                          await toast.promise(
                            sendSignedTransaction(
                              await createDeletedAssetOptoutTransactions([
                                assetData.index,
                              ])
                            ),
                            {
                              pending: "Opting-out...",
                              success: "Opted-out successfully 🎉",
                            }
                          );
                          setFilteredAssets((prev) =>
                            prev.filter(
                              (a) => a["asset-id"] !== assetData.index
                            )
                          );
                        } catch (error: any) {
                          toast.error(
                            error.message.split(
                              "TransactionPool.Remember:"
                            )[1] ||
                              error.message ||
                              "Something went wrong"
                          );
                        }
                      }}
                    >
                      Opt-out
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default AssetImageCard;
