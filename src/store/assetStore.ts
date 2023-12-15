import { create } from "zustand";
import { SingleAssetDataResponse } from "../core/types";

interface AssetState {
  assets: SingleAssetDataResponse[];
  setAssets: (assets: SingleAssetDataResponse[]) => void;
  addAsset: (asset: SingleAssetDataResponse) => void;
}

const useAssetStore = create<AssetState>((set) => ({
  assets: [],
  setAssets: (assets: SingleAssetDataResponse[]) => set({ assets }),
  addAsset: (asset: SingleAssetDataResponse) =>
    set((state) => ({ assets: [...state.assets, asset] })),
}));

export default useAssetStore;
