import { DeflyWalletConnect } from "@blockshake/defly-connect";
import { DaffiWalletConnect } from "@daffiwallet/connect";
import { PeraWalletConnect } from "@perawallet/connect";
import {
  Algodv2,
  Transaction,
  computeGroupID,
  decodeAddress,
  encodeAddress,
  makeAssetDestroyTxnWithSuggestedParamsFromObject,
  makeAssetTransferTxnWithSuggestedParamsFromObject,
  waitForConfirmation,
} from "algosdk";
import axios from "axios";
import { CID } from "multiformats/cid";
import * as digest from "multiformats/hashes/digest";
import * as mfsha2 from "multiformats/hashes/sha2";
import { toast } from "react-toastify";
import { decode } from "uint8-to-base64";
import useAssetStore from "../store/assetStore";
import useConnectionStore from "../store/connectionStore";
import {
  INDEXER_URL,
  IPFS_ENDPOINT,
  MAX_SELECT_COUNT,
  NODE_URL,
  TX_NOTE,
} from "./constants";
import {
  AccountAssetsDataResponse,
  AccountDataType,
  AssetAccountDataResponse,
  AssetMetadataResponse,
  AssetTransactionsResponse,
  AssetTransferType,
  AssetsType,
  SignTransactionsType,
  SingleAssetDataResponse,
} from "./types";

const peraWallet = new PeraWalletConnect({ shouldShowSignTxnToast: true });
const deflyWallet = new DeflyWalletConnect({ shouldShowSignTxnToast: true });
const daffiWallet = new DaffiWalletConnect({ shouldShowSignTxnToast: true });
const algodClient = new Algodv2("", NODE_URL, "");

export const shortenAddress = (walletAddress: string, count: number = 4) => {
  return (
    walletAddress.substring(0, count) +
    "..." +
    walletAddress.substring(walletAddress.length - count)
  );
};

export async function getAccountData(
  walletAddress: string
): Promise<AccountDataType> {
  const response = await axios.get(
    NODE_URL + `/v2/accounts/${walletAddress}?exclude=all`
  );
  return response.data as AccountDataType;
}

export function getAssetDirectionUrl(assetId: number) {
  return "/asset/" + assetId;
}

export function getWalletDirectionUrl(walletAddress: string) {
  // const networkType = useConnectionStore.getState().networkType;
  // if (networkType === "mainnet") {
  //   return "/account/" + walletAddress;
  // }
  // return "https://testnet.explorer.perawallet.app/address/" + walletAddress;
  return "/account/" + walletAddress;
}

export async function getAssetTraitData(
  assetData: SingleAssetDataResponse
): Promise<AssetMetadataResponse> {
  try {
    const assetFormat = findAssetFormat(assetData.params.url);
    let metadata: AssetMetadataResponse = {
      filters: [],
      traits: [],
    };

    let assetMetadata;

    if (assetFormat === "ARC19") {
      assetMetadata = await getARC19AssetMetadataData(
        assetData.params["url"],
        assetData.params["reserve"]
      );
    } else if (assetFormat === "ARC69" || assetFormat === "Token") {
      assetMetadata = await getArc69Metadata(assetData.index);
    } else if (assetFormat === "ARC3") {
      if (assetData.params["url"].startsWith("ipfs://")) {
        assetMetadata = await axios
          .get(
            `${IPFS_ENDPOINT}/${assetData.params["url"].replace("ipfs://", "")}`
          )
          .then((res) => res.data);
      } else {
        assetMetadata = await axios
          .get(assetData.params["url"])
          .then((res) => res.data);
      }
    }

    if (assetMetadata.attributes && !assetMetadata.properties) {
      assetMetadata.properties = assetMetadata.attributes;
      delete assetMetadata.attributes;
    }

    for (const filter in assetMetadata.properties.filters){
      metadata.filters = [
        ...metadata.filters,
        {
          category: filter,
          value: assetMetadata.properties.filters[filter],
        },
      ];
    }

    if (assetMetadata.properties) {
      if (Object.keys(assetMetadata.properties).includes("traits")) {
        assetMetadata.properties = assetMetadata.properties.traits;
      }
      for (const key in assetMetadata.properties) {
        if (typeof assetMetadata.properties[key] === "object") {
          for (const subKey in assetMetadata.properties[key]) {
            metadata.traits = [
              ...metadata.traits,
              {
                category: subKey,
                value: assetMetadata.properties[key][subKey],
              },
            ];
          }
        } else {
          if (!key.includes("image_static")) {
            metadata.traits = [
              ...metadata.traits,
              {
                category: key,
                value: assetMetadata.properties[key],
              },
            ];
          }
        }
      }
    }
    if (assetMetadata.description) {
      metadata.traits = [
        ...metadata.traits,
        {
          category: "description",
          value: assetMetadata.description,
        },
      ];
    }
    if (assetMetadata.external_url) {
      metadata.traits = [
        ...metadata.traits,
        {
          category: "external_url",
          value: assetMetadata.external_url,
        },
      ];
    }
    return metadata;
  } catch (error) {
    console.error(error);
    return {
      filters: [],
      traits: [],
    };
  }
}

async function getARC19AssetMetadataData(
  url: string,
  reserve: string
): Promise<any> {
  try {
    let chunks = url.split("://");
    if (chunks[0] === "template-ipfs" && chunks[1].startsWith("{ipfscid:")) {
      const cidComponents = chunks[1].split(":");
      const cidVersion = cidComponents[1];
      const cidCodec = cidComponents[2];
      let cidCodecCode;
      if (cidCodec === "raw") {
        cidCodecCode = 0x55;
      } else if (cidCodec === "dag-pb") {
        cidCodecCode = 0x70;
      } else throw new Error("Unknown codec");
      const addr = decodeAddress(reserve);
      const mhdigest = digest.create(mfsha2.sha256.code, addr.publicKey);
      if (cidVersion === "1") {
        const cid = CID.createV1(cidCodecCode, mhdigest);
        const response = await axios.get(`${IPFS_ENDPOINT}/${cid}`);
        return response.data;
      } else {
        const cid = CID.createV0(mhdigest);
        const response = await axios.get(`${IPFS_ENDPOINT}/${cid}`);
        return response.data;
      }
    }
    return {};
  } catch (error) {
    return {};
  }
}

export async function getOwnerAddressOfAsset(assetId: number) {
  try {
    const url = `${INDEXER_URL}/v2/assets/${assetId}/balances?currency-greater-than=0`;
    const response = await axios.get(url);
    return response.data.balances[0].address;
  } catch (err) {
    return "";
  }
}

export async function getAccountAssetData(
  assetId: number,
  wallet: string
): Promise<AssetAccountDataResponse> {
  try {
    const url = `${INDEXER_URL}/v2/accounts/${wallet}/assets?asset-id=${assetId}&include-all=false`;
    const response = await axios.get(url);
    if (response.data.assets.length === 0) {
      return { amount: 0, isOptedIn: false } as AssetAccountDataResponse;
    } else {
      return {
        amount: response.data.assets[0].amount,
        isOptedIn: true,
      } as AssetAccountDataResponse;
    }
  } catch (error) {
    return { amount: 0, isOptedIn: false } as AssetAccountDataResponse;
  }
}

export function findAssetFormat(url: string) {
  if (!url) {
    return "Token";
  }
  if (url.includes("template-ipfs")) {
    return "ARC19";
  } else if (url.includes("#arc3")) {
    return "ARC3";
  } else if (url.includes("ipfs://") || url.includes("ipfs/")) {
    return "ARC69";
  } else {
    return "Token";
  }
}

export async function getAssetsFromAddress(
  walletAddress: string
): Promise<AssetsType[]> {
  let threshold = 1000;
  let userAssets = await axios.get<AccountAssetsDataResponse>(
    `${INDEXER_URL}/v2/accounts/${walletAddress}/assets?include-all=false`
  );
  while (userAssets.data.assets.length === threshold) {
    const nextAssets = await axios.get(
      `${INDEXER_URL}/v2/accounts/${walletAddress}/assets?include-all=false&next=${userAssets.data["next-token"]}`
    );
    userAssets.data.assets = userAssets.data.assets.concat(
      nextAssets.data.assets
    );
    userAssets.data["next-token"] = nextAssets.data["next-token"];
    threshold += 1000;
  }
  return userAssets.data.assets.sort(
    (a, b) => b["opted-in-at-round"] - a["opted-in-at-round"]
  );
}

export async function getCreatedAssetsFromAddress(
  walletAddress: string
): Promise<SingleAssetDataResponse[]> {
  let threshold = 1000;
  let createdAssets = await axios.get(
    `${INDEXER_URL}/v2/accounts/${walletAddress}/created-assets?include-all=false`
  );
  while (createdAssets.data.assets.length === threshold) {
    const nextAssets = await axios.get(
      `${INDEXER_URL}/v2/accounts/${walletAddress}/created-assets?include-all=false&next=${createdAssets.data["next-token"]}`
    );
    createdAssets.data.assets = createdAssets.data.assets.concat(
      nextAssets.data.assets
    );
    createdAssets.data["next-token"] = nextAssets.data["next-token"];
    threshold += 1000;
  }
  return createdAssets.data.assets;
}

export async function getAssetData(
  assetId: number
): Promise<SingleAssetDataResponse> {
  const data = await axios.get(
    `${INDEXER_URL}/v2/assets/${assetId}?include-all=true`
  );
  return data.data.asset as SingleAssetDataResponse;
}

export async function getNfdDomain(wallet: string): Promise<string> {
  try {
    const nfdDomain = await axios.get(
      "https://api.nf.domains/nfd/lookup?address=" + wallet
    );
    if (nfdDomain.status === 200) {
      return nfdDomain.data[wallet].name;
    } else {
      return wallet;
    }
  } catch (error) {
    return wallet;
  }
}

export async function getWalletAddressFromNfDomain(
  domain: string
): Promise<string> {
  try {
    const response = await axios.get(
      `https://api.nf.domains/nfd/${domain}?view=tiny&poll=false&nocache=false`
    );
    if (response.status === 200) {
      return response.data.depositAccount;
    } else {
      return "";
    }
  } catch (error) {
    return "";
  }
}

export const ipfsToUrl = async (
  assetUrl: string,
  assetReserve: string,
  forDetail = false
): Promise<string> => {
  if (!assetUrl) return "";
  try {
    const optimizer = !forDetail ? "?optimizer=image&width=450&quality=70" : "";
    if (assetUrl.includes("template-ipfs")) {
      const { data, cid } = await getARC19AssetData(assetUrl, assetReserve);
      const url = data.image
        ? data.image
        : `${IPFS_ENDPOINT}/${cid}${optimizer}`;
      if (url.startsWith("ipfs://"))
        return `${IPFS_ENDPOINT}/${url.slice(7)}${optimizer}`;
      if (url !== "") return url;
      return "";
    }
    if (assetUrl.endsWith("#arc3")) {
      const url = assetUrl.slice(0, -5);
      if (url.startsWith("ipfs://")) {
        const response = await axios.get(`${IPFS_ENDPOINT}/${url.slice(7)}`);
        if (response.data.image.startsWith("ipfs://")) {
          return `${IPFS_ENDPOINT}/${response.data.image.slice(7)}${optimizer}`;
        }
        return response.data.image;
      } else {
        const response = await axios.get(url);
        if (response.data.image.startsWith("ipfs://")) {
          return `${IPFS_ENDPOINT}/${response.data.image.slice(7)}${optimizer}`;
        }
        return response.data.image;
      }
    }
    if (assetUrl.startsWith("https://") && assetUrl.includes("ipfs")) {
      return `${IPFS_ENDPOINT}/${assetUrl.split("/ipfs/")[1]}${optimizer}`;
    }
    if (assetUrl.startsWith("ipfs://")) {
      return `${IPFS_ENDPOINT}/${assetUrl.slice(7)}${optimizer}`;
    }
    return assetUrl;
  } catch (error) {
    return "";
  }
};

export async function getARC19AssetData(url: string, reserve: string) {
  try {
    let chunks = url.split("://");
    if (chunks[0] === "template-ipfs" && chunks[1].startsWith("{ipfscid:")) {
      const cidComponents = chunks[1].split(":");
      const cidVersion = parseInt(cidComponents[1]);
      const cidCodec = cidComponents[2];
      let cidCodecCode;
      if (cidCodec === "raw") {
        cidCodecCode = 0x55;
      } else if (cidCodec === "dag-pb") {
        cidCodecCode = 0x70;
      } else {
        throw new Error("Unknown codec");
      }
      const addr = decodeAddress(reserve);
      const mhdigest = digest.create(mfsha2.sha256.code, addr.publicKey);
      const cid =
        cidVersion === 1
          ? CID.createV1(cidCodecCode, mhdigest)
          : CID.createV0(mhdigest);
      const response = await axios.get(`${IPFS_ENDPOINT}/${cid}`);
      return { data: response.data, cid: cid };
    } else {
      throw new Error("invalid url" + url);
    }
  } catch (error) {
    throw new Error("invalid url" + url);
  }
}

export function getAssetType(url: string) {
  if (!url || !url.includes("ipfs")) return "-";
  if (url.startsWith("template-ipfs")) {
    return "ARC19";
  } else if (url.endsWith("#arc3")) {
    return "ARC3";
  } else if (url.includes("ipfs") && !url.endsWith("#arc3")) {
    return "ARC69";
  }
  return "Token";
}

function codeToCodec(code: number) {
  switch (code.toString(16)) {
    case "55":
      return "raw";
    case "70":
      return "dag-pb";
    default:
      throw new Error("Unknown codec");
  }
}

export function createReserveAddressFromCid(ipfsCid: string) {
  const decoded = CID.parse(ipfsCid);
  const version = decoded.version;
  const codec = codeToCodec(decoded.code);

  const assetURL = `template-ipfs://{ipfscid:${version}:${codec}:reserve:sha2-256}`;
  const reserveAddress = encodeAddress(
    Uint8Array.from(Buffer.from(decoded.multihash.digest))
  );
  return { assetURL, reserveAddress };
}

export const getArc69Metadata = async (
  assetId: number
): Promise<Record<string, string>> => {
  const response = await axios.get<AssetTransactionsResponse>(
    `${INDEXER_URL}/v2/assets/${assetId}/transactions?tx-type=acfg`
  );
  response.data.transactions.sort(
    (a, b) => a["confirmed-round"] - b["confirmed-round"]
  );
  const encodedMetadata =
    response.data.transactions[response.data.transactions.length - 1].note;
  const text = new TextDecoder().decode(decode(encodedMetadata));
  const metadata = JSON.parse(text);
  return metadata;
};

async function getCreatorWalletOfAsset(assetId: number) {
  const assetData = useAssetStore
    .getState()
    .assets.find((a) => a.index === assetId);
  if (assetData) {
    return assetData.params.creator;
  } else {
    const asset = await getAssetData(assetId);
    return asset.params.creator;
  }
}

export async function signTransactions(
  groups: Transaction[],
  signer: string = ""
) {
  let signedTxns;
  let multipleTxnGroups;
  const { walletAddress, walletType } = useConnectionStore.getState();
  if (!walletAddress) {
    throw new Error("Please connect your wallet!");
  }
  signer = signer || walletAddress;
  try {
    if (walletType === "pera") {
      await peraWallet.reconnectSession();
      multipleTxnGroups = groups.map((txn) => {
        return { txn: txn, signers: [signer] };
      });
      signedTxns = await peraWallet.signTransaction([
        multipleTxnGroups as SignTransactionsType[],
      ]);
    } else if (walletType === "defly") {
      await deflyWallet.reconnectSession();
      multipleTxnGroups = groups.map((txn) => {
        return { txn: txn, signers: [signer] };
      });
      signedTxns = await deflyWallet.signTransaction([
        multipleTxnGroups as SignTransactionsType[],
      ]);
    } else if (walletType === "daffi") {
      await daffiWallet.reconnectSession();
      multipleTxnGroups = groups.map((txn) => {
        return { txn: txn, signers: [signer] };
      });
      signedTxns = await daffiWallet.signTransaction([
        multipleTxnGroups as SignTransactionsType[],
      ]);
    } else {
      throw new Error("Invalid wallet type!");
    }
    if (signedTxns.length === 0) {
      throw new Error("Transaction signing failed!");
    }
    return signedTxns;
  } catch (error) {
    throw new Error("Transaction signing failed");
  }
}

export async function sendSignedTransaction(signedTxns: Uint8Array[]) {
  try {
    const { txId } = await algodClient.sendRawTransaction(signedTxns).do();
    await waitForConfirmation(algodClient, txId, 3);
    return txId;
  } catch (error) {
    throw error;
  }
}

export const copyAssetIds = (assets: number[]) => {
  if (assets.length === 0) return;
  if (assets.length === 1) {
    navigator.clipboard.writeText(assets[0].toString());
  } else {
    const text = assets.join(",");
    navigator.clipboard.writeText(text);
  }
  toast.success("Copied!");
};

export async function createAssetOptInTransactions(assets: number[]) {
  if (assets.length === 0) throw new Error("Please select an asset!");
  if (assets.length > MAX_SELECT_COUNT) {
    throw new Error(
      `You can only select ${MAX_SELECT_COUNT} assets at a time!`
    );
  }
  const wallet = useConnectionStore.getState().walletAddress;
  if (!wallet) {
    throw new Error("Please connect your wallet!");
  }
  const params = await algodClient.getTransactionParams().do();
  let txnsArray = [];
  for (let i = 0; i < assets.length; i++) {
    const tx = makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: wallet.trim(),
      to: wallet.trim(),
      amount: 0,
      assetIndex: assets[i],
      suggestedParams: params,
      note: new TextEncoder().encode(TX_NOTE),
    });
    txnsArray.push(tx);
  }
  const signedTxns = await signTransactions(txnsArray);
  if (signedTxns == null) {
    throw new Error("Transaction signing failed");
  }
  return signedTxns;
}

export async function createAssetOptoutTransactions(assets: number[]) {
  if (assets.length === 0) throw new Error("Please select an asset!");
  if (assets.length > MAX_SELECT_COUNT) {
    throw new Error(
      `You can only select ${MAX_SELECT_COUNT} assets at a time!`
    );
  }
  const wallet = useConnectionStore.getState().walletAddress;
  if (!wallet) {
    throw new Error("Please connect your wallet!");
  }
  const params = await algodClient.getTransactionParams().do();
  let txnsArray = [];
  for (let i = 0; i < assets.length; i++) {
    const creatorAddress = await getCreatorWalletOfAsset(assets[i]);
    if (creatorAddress !== "") {
      const tx = makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: wallet.trim(),
        to: creatorAddress.trim(),
        amount: 0,
        assetIndex: assets[i],
        suggestedParams: params,
        closeRemainderTo: creatorAddress.trim(),
        note: new TextEncoder().encode(TX_NOTE),
      });
      txnsArray.push(tx);
    }
  }
  const signedTxns = await signTransactions(txnsArray);
  if (signedTxns == null) {
    throw new Error("Transaction signing failed");
  }
  return signedTxns;
}

export async function createDeletedAssetOptoutTransactions(assets: number[]) {
  if (assets.length === 0) throw new Error("Please select an asset!");
  if (assets.length > MAX_SELECT_COUNT) {
    throw new Error(
      `You can only select ${MAX_SELECT_COUNT} assets at a time!`
    );
  }
  const wallet = useConnectionStore.getState().walletAddress;
  if (!wallet) {
    throw new Error("Please connect your wallet!");
  }
  const params = await algodClient.getTransactionParams().do();
  let txnsArray = [];
  for (let i = 0; i < assets.length; i++) {
    const tx = makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: wallet.trim(),
      to: wallet.trim(),
      amount: 0,
      assetIndex: assets[i],
      suggestedParams: params,
      closeRemainderTo: wallet.trim(),
      note: new TextEncoder().encode(TX_NOTE),
    });
    txnsArray.push(tx);
  }
  const signedTxns = await signTransactions(txnsArray);
  if (signedTxns == null) {
    throw new Error("Transaction signing failed");
  }
  return signedTxns;
}

export async function createAssetDestroyTransactions(assets: number[]) {
  if (assets.length === 0) throw new Error("Please select an asset!");
  if (assets.length > MAX_SELECT_COUNT) {
    throw new Error(
      `You can only select ${MAX_SELECT_COUNT} assets at a time!`
    );
  }
  const wallet = useConnectionStore.getState().walletAddress;
  if (!wallet) {
    throw new Error("Please connect your wallet!");
  }
  const params = await algodClient.getTransactionParams().do();
  let txnsArray = [];
  for (let i = 0; i < assets.length; i++) {
    const creatorAddress = await getCreatorWalletOfAsset(assets[i]);
    if (creatorAddress !== "") {
      let tx = makeAssetDestroyTxnWithSuggestedParamsFromObject({
        from: wallet.trim(),
        suggestedParams: params,
        assetIndex: assets[i],
        note: new TextEncoder().encode(TX_NOTE),
      });
      txnsArray.push(tx);
    }
  }
  const signedTxns = await signTransactions(txnsArray);
  if (signedTxns == null) {
    throw new Error("Transaction signing failed");
  }
  return signedTxns;
}

export async function createAssetSendTransactions(assets: AssetTransferType[]) {
  if (assets.length === 0) throw new Error("Please select an asset!");
  if (assets.length > MAX_SELECT_COUNT) {
    throw new Error(
      `You can only select ${MAX_SELECT_COUNT} assets at a time!`
    );
  }
  const wallet = useConnectionStore.getState().walletAddress;
  if (!wallet) {
    throw new Error("Please connect your wallet!");
  }
  const params = await algodClient.getTransactionParams().do();
  let txnsArray = [];
  for (let i = 0; i < assets.length; i++) {
    const tx = makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: wallet.trim(),
      to: assets[i].receiver.trim(),
      amount: assets[i].amount * 10 ** assets[i].decimals,
      assetIndex: assets[i].index,
      suggestedParams: params,
      note: new TextEncoder().encode(TX_NOTE),
    });
    txnsArray.push(tx);
  }
  const signedTxns = await signTransactions(txnsArray);
  if (signedTxns == null) {
    throw new Error("Transaction signing failed");
  }
  return signedTxns;
}

export async function createAssetTransferTransactions(
  assets: AssetTransferType[]
) {
  if (assets.length === 0) throw new Error("Please select an asset!");
  if (assets.length > MAX_SELECT_COUNT / 2) {
    throw new Error(
      `You can only select ${MAX_SELECT_COUNT / 2} assets at a time!`
    );
  }
  const wallet = useConnectionStore.getState().walletAddress;
  if (!wallet) {
    throw new Error("Please connect your wallet!");
  }
  const params = await algodClient.getTransactionParams().do();
  let txnsArray = [];
  for (let i = 0; i < assets.length; i++) {
    const optin_tx = makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: assets[i].receiver.trim(),
      to: assets[i].receiver.trim(),
      amount: 0,
      assetIndex: assets[i].index,
      suggestedParams: params,
      note: new TextEncoder().encode(TX_NOTE),
    });
    const send_tx = makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: wallet.trim(),
      to: assets[i].receiver.trim(),
      amount: assets[i].amount * 10 ** assets[i].decimals,
      assetIndex: assets[i].index,
      suggestedParams: params,
      note: new TextEncoder().encode(TX_NOTE),
    });
    const groupID = computeGroupID([optin_tx, send_tx]);
    optin_tx.group = groupID;
    send_tx.group = groupID;
    txnsArray.push([optin_tx, send_tx]);
  }
  if (txnsArray == null) {
    throw new Error("Send transaction signing failed");
  }
  return txnsArray;
}
