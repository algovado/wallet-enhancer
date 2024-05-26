import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import useAssetStore from "../store/assetStore";
import { SingleAssetDataResponse } from "../core/types";
import {
  ipfsToUrl,
  getAssetData,
  shortenAddress,
  getWalletDirectionUrl,
  getOwnerAddressOfAsset,
  getNfdDomain,
  findAssetFormat,
  getAssetTraitData,
  copyAssetIds,
  createAssetOptInTransactions,
  createAssetOptoutTransactions,
  sendSignedTransaction,
  checkAccountIsOptedIn,
} from "../core/utils";
import { CardMedia } from "@mui/material";
import { toast } from "react-toastify";
import useConnectionStore from "../store/connectionStore";

export default function AssetDetail() {
  const { assetId } = useParams<{
    assetId: string;
  }>();
  const connectionState = useConnectionStore((state) => state);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [assetData, setAssetData] = useState<SingleAssetDataResponse>();
  const [assetUrl, setAssetUrl] = useState<string>("/images/loading.gif");
  const [holderAddress, setHolderAddress] = useState<string>("");
  const [isAssetOneToOne, setIsAssetOneToOne] = useState<boolean>(false);
  const [assetFormat, setAssetFormat] = useState<string>("");
  const [traitData, setTraitData] = useState<any>();
  const [accountIsOptedIn, setAccountIsOptedIn] = useState<boolean>(false);

  useEffect(() => {
    if (assetId && !checkAssetIdIsValid(assetId)) {
      return;
    }
    async function getData() {
      try {
        const stateData = useAssetStore
          .getState()
          .assets.find((a) => a.index === Number(assetId));
        var url;
        if (stateData) {
          setAssetData(stateData);
          setAssetFormat(findAssetFormat(stateData.params.url));
          url = await ipfsToUrl(stateData.params.url, stateData.params.reserve);
          setAssetUrl(url);
          const traitData = await getAssetTraitData(stateData);
          setTraitData(traitData);
          if (stateData.params.total === 1 && stateData.params.decimals === 0) {
            const assetHolder = await getOwnerAddressOfAsset(Number(assetId));
            const nfd = await getNfdDomain(assetHolder);
            setHolderAddress(nfd);
          }
        } else {
          const response = await getAssetData(Number(assetId));
          setAssetData(response);
          useAssetStore.getState().addAsset(response);
          url = await ipfsToUrl(
            response.params.url,
            response.params.reserve,
            true
          );
          setAssetFormat(findAssetFormat(response.params.url));
          setAssetUrl(url);
          setIsAssetOneToOne(
            response.params.total === 1 && response.params.decimals === 0
          );
          const traitData = await getAssetTraitData(response);
          setTraitData(traitData);
          if (response.params.total === 1 && response.params.decimals === 0) {
            const assetHolder = await getOwnerAddressOfAsset(Number(assetId));
            const nfd = await getNfdDomain(assetHolder);
            setHolderAddress(nfd);
          }
          if (connectionState.walletAddress) {
            const accountIsOptedIn = await checkAccountIsOptedIn(
              Number(assetId),
              connectionState.walletAddress
            );
            setAccountIsOptedIn(accountIsOptedIn);
          }
        }
      } catch (error) {
        console.error(error);
      }
      setIsLoading(false);
    }
    if (!assetId) return;
    getData();
  }, [assetId, connectionState]);

  async function checkAssetIdIsValid(assetId: string) {
    return (
      typeof assetId === "number" && assetId > 0 && Number.isInteger(assetId)
    );
  }

  if (isLoading) {
    return (
      <main className="flex flex-col text-center justify-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full">
        <img
          src="/images/loading.gif"
          alt="loading"
          className="w-64 h-64 mx-auto"
        />
        <h2 className="text-2xl font-bold mt-4 text-primary-gray">
          Loading...
        </h2>
      </main>
    );
  }

  if (!assetData) {
    return (
      <main className="flex flex-col text-center justify-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full">
        <h2 className="text-4xl font-bold mb-2 text-center text-primary-gray">
          Asset Not Found
        </h2>
        <Link
          to="/"
          className="text-xl text-primary-green hover:underline mt-2 transition-colors"
        >
          Go to Home
        </Link>
      </main>
    );
  }

  async function itemOnClick(
    pendingMessage: string,
    successMessage: string,
    transactionFunction: (assets: number[]) => Promise<Uint8Array[] | undefined>
  ) {
    try {
      if (!assetData) return null;
      const signedTxn = await transactionFunction([assetData.index]);
      if (!signedTxn) return;
      await toast.promise(sendSignedTransaction(signedTxn), {
        pending: pendingMessage,
        success: successMessage,
      });
    } catch (error: any) {
      toast.error(
        error.message.split("TransactionPool.Remember:")[1] ||
          error.message ||
          "Something went wrong"
      );
    }
  }

  return (
    <div className="bg-asset-detail-bg p-8 text-white rounded-lg mx-4 sm:mx-auto sm:max-w-3xl my-4 md:my-8">
      <h2 className="text-4xl font-bold mb-2 text-center">
        {assetData.params.name}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8">
        <div className="space-y-2">
          <CardMedia
            component="img"
            alt={assetData.params.name}
            height="200"
            image={assetUrl || "/images/404.webp"}
            className="w-full aspect-square p-1 rounded-md"
            loading="lazy"
            onError={() => setAssetUrl("/images/404.webp")}
          />
          <div className="flex justify-center gap-x-2 mx-1">
            <button
              className="text-xs bg-gray-950 py-2 px-5 rounded-md hover:bg-gray-800 transition-all"
              onClick={() => copyAssetIds([Number(assetId)])}
            >
              Copy Id
            </button>
            {!accountIsOptedIn ? (
              <button
                className="text-xs bg-gray-950 py-2 px-5 rounded-md hover:bg-gray-800 transition-all"
                onClick={async () => {
                  await itemOnClick(
                    "Opting-in...",
                    "Opted-in successfully 🎉",
                    createAssetOptInTransactions
                  );
                }}
              >
                Opt-in
              </button>
            ) : (
              <button
                className="text-xs bg-gray-950 py-2 px-5 rounded-md hover:bg-gray-800 transition-all"
                onClick={async () =>
                  await itemOnClick(
                    "Opting-out...",
                    "Opted-out successfully 🎉",
                    createAssetOptoutTransactions
                  )
                }
              >
                Opt-out
              </button>
            )}
          </div>
          <div className="bg-[#333333] p-4 rounded-lg">
            <h2 className="text-lg font-bold mb-2">Asset Details</h2>
            <p className="text-xs">ASA ID: {assetId}</p>
            <p className="text-xs">
              Unit Name: {assetData?.params["unit-name"]}
            </p>
            <p className="text-xs">
              Creator:{" "}
              <a
                href={getWalletDirectionUrl(assetData.params.creator)}
                target="_blank"
                rel="noreferrer noopener"
                className="underline hover:text-green-400 transition-all"
              >
                {shortenAddress(assetData.params.creator)}
              </a>
            </p>
            <p className="text-xs">Supply: {assetData.params.total}</p>
            <p className="text-xs">Decimals: {assetData.params.total}</p>
            <p className="text-xs">
              Clawback:{" "}
              {assetData.params.clawback === "" ||
              assetData.params.clawback?.startsWith(
                "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
              ) ? (
                "No"
              ) : (
                <a
                  href={getWalletDirectionUrl(assetData.params.clawback)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline hover:text-green-400 transition-all"
                >
                  {shortenAddress(assetData.params.clawback)}
                </a>
              )}
            </p>
            <p className="text-xs">
              Frozen:{" "}
              {assetData.params.freeze === "" ||
              assetData.params.freeze?.startsWith(
                "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
              ) ? (
                "No"
              ) : (
                <a
                  href={getWalletDirectionUrl(assetData.params.freeze)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline hover:text-green-400 transition-all"
                >
                  {shortenAddress(assetData.params.freeze)}
                </a>
              )}
            </p>
            <p className="text-xs">
              Default Frozen:{" "}
              {assetData.params["default-frozen"] ? "Yes" : "No"}
            </p>
            <p className="text-xs font-semibold mt-2">
              Standard: {assetFormat} -{" "}
              <a
                href={assetUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="underline hover:text-green-400 transition-all text-xs"
              >
                View on IPFS
              </a>
            </p>
          </div>
        </div>
        <div className="bg-[#333333] p-4 rounded-lg">
          {isAssetOneToOne && (
            <div className="flex justify-start text-sm border-b border-green-900 pb-2 mb-2">
              <p className="font-bold">
                Holder{": "}
                <a
                  href={
                    holderAddress.endsWith(".algo")
                      ? `https://app.nf.domains/name/${holderAddress}`
                      : getWalletDirectionUrl(holderAddress)
                  }
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline hover:text-green-400 transition-all"
                >
                  {holderAddress.endsWith(".algo")
                    ? holderAddress
                    : shortenAddress(holderAddress)}
                </a>
              </p>
            </div>
          )}
          {traitData?.length > 0 ? (
            <>
              <h2 className="text-lg font-bold mb-2">Traits</h2>
              <div className="grid grid-cols-2 gap-4 text-xs">
                {traitData?.map((trait: any) => (
                  <>
                    {trait.category &&
                      typeof trait.category === "string" &&
                      trait.name &&
                      typeof trait.name === "string" && (
                        <div
                          key={trait.category}
                          className="border-b border-green-900 pb-2"
                        >
                          <p className="font-bold">
                            {trait.category.replace(/_/g, " ").toUpperCase()}
                          </p>
                          <p className="text-gray-300 break-all">
                            {trait.name}
                          </p>
                        </div>
                      )}
                  </>
                ))}
              </div>
            </>
          ) : (
            <h2 className="text-base font-semibold text-gray-400 mb-2 text-center">
              No metadata or extra information found for this asset.
            </h2>
          )}
        </div>
      </div>
    </div>
  );
}
