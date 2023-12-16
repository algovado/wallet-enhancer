import {
  Button,
  Grid,
  InputBase,
  MenuItem,
  OutlinedInput,
  Select,
  SelectChangeEvent,
} from "@mui/material";
import Fuse from "fuse.js";
import { useEffect, useState } from "react";
import AssetImageCard from "../components/AssetCard";
import GridPagination from "../components/GridPagination";
import TopArea from "../components/TopArea";
import {
  PAGE_SIZE,
  filterByOptions,
  fuseSearchOptions,
  orderByOptions,
} from "../core/constants";
import { AssetsType } from "../core/types";
import {
  copyAssetIds,
  createAssetDestroyTransactions,
  createAssetOptoutTransactions,
  getAssetsFromAddress,
  getCreatedAssetsFromAddress,
} from "../core/utils";
import useAssetStore from "../store/assetStore";
import useConnectionStore from "../store/connectionStore";
import SearchWalletInput from "../components/SearchWalletInput";
import useToolStore from "../store/toolStore";
import SelectSubHeader from "../components/selects/SelectSubHeader";

const HOME_TOOLS = [
  {
    name: "Multi Send",
    id: "asset-send",
    action: () => {},
  },
  {
    name: "Multi Transfer",
    id: "asset-transfer",
    action: () => {},
  },
  {
    name: "Multi Opt-out",
    id: "asset-opt-out",
    action: createAssetOptoutTransactions,
  },
  {
    name: "Multi Destroy",
    id: "asset-destroy",
    action: createAssetDestroyTransactions,
  },
  {
    name: "Multi Copy",
    id: "asset-copy",
    action: copyAssetIds,
  },
];

export default function Home() {
  // ** Store states
  const connectionState = useConnectionStore((state) => state);
  const toolState = useToolStore((state) => state);
  // ** States
  const [assets, setAssets] = useState<AssetsType[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<AssetsType[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [orderBy, setOrderBy] = useState("newest");
  // ** Fuse
  const fuse = new Fuse(assets, fuseSearchOptions);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearch = (search: string) => {
    if (search === "") {
      setFilteredAssets(assets);
      setTotalPages(Math.ceil(assets.length / PAGE_SIZE));
      setCurrentPage(1);
    } else {
      const results = fuse.search(search);
      setFilteredAssets(
        assets.filter((asset) =>
          results.find(
            (result) => result.item["asset-id"] === asset["asset-id"]
          )
        )
      );
      setTotalPages(Math.ceil(results.length / PAGE_SIZE));
      setCurrentPage(1);
    }
  };

  const handleOrderBy = (orderBy: SelectChangeEvent<string>) => {
    const { value } = orderBy.target;
    switch (value) {
      case "newest":
        const newestAssets = assets.sort(
          (a, b) => b["opted-in-at-round"] - a["opted-in-at-round"]
        );
        setFilteredAssets(newestAssets);
        setTotalPages(Math.ceil(newestAssets.length / PAGE_SIZE));
        setCurrentPage(1);
        break;
      case "oldest":
        const oldestAssets = assets.sort(
          (a, b) => a["opted-in-at-round"] - b["opted-in-at-round"]
        );
        setFilteredAssets(oldestAssets);
        setTotalPages(Math.ceil(oldestAssets.length / PAGE_SIZE));
        setCurrentPage(1);
        break;
      case "asset-id-asc":
        const assetIdAsc = assets.sort((a, b) => a["asset-id"] - b["asset-id"]);
        setFilteredAssets(assetIdAsc);
        setTotalPages(Math.ceil(assetIdAsc.length / PAGE_SIZE));
        setCurrentPage(1);
        break;
      case "asset-id-desc":
        const assetIdDesc = assets.sort(
          (a, b) => b["asset-id"] - a["asset-id"]
        );
        setFilteredAssets(assetIdDesc);
        setTotalPages(Math.ceil(assetIdDesc.length / PAGE_SIZE));
        setCurrentPage(1);
        break;
      case "showZero":
        const showZeroResult = assets.filter((asset) => asset.amount === 0);
        setFilteredAssets(showZeroResult);
        setTotalPages(Math.ceil(showZeroResult.length / PAGE_SIZE));
        setCurrentPage(1);
        break;
      case "showNonZero":
        const showNonZeroResult = assets.filter((asset) => asset.amount !== 0);
        setFilteredAssets(showNonZeroResult);
        setTotalPages(Math.ceil(showNonZeroResult.length / PAGE_SIZE));
        break;
      case "showCreated":
        const createdAssetsIds = useAssetStore
          .getState()
          .assets.filter(
            (asset) => asset.params.creator === connectionState.walletAddress
          )
          .map((asset) => asset.index);
        const showCreatedResult = assets.filter((asset) =>
          createdAssetsIds.includes(asset["asset-id"])
        );
        setFilteredAssets(showCreatedResult);
        setTotalPages(Math.ceil(showCreatedResult.length / PAGE_SIZE));
        setCurrentPage(1);
        break;
      default:
        break;
    }
    setOrderBy(value);
  };

  useEffect(() => {
    async function getAssets() {
      const response = await getAssetsFromAddress(
        connectionState.walletAddress
      );
      setAssets(response);
      setFilteredAssets(response);
      setTotalPages(Math.ceil(response.length / PAGE_SIZE));
    }
    async function getCreatedAssets() {
      const response = await getCreatedAssetsFromAddress(
        connectionState.walletAddress
      );
      useAssetStore.getState().setAssets(response);
    }

    if (connectionState.walletAddress) {
      getCreatedAssets();
      getAssets();
    }
  }, [connectionState.walletAddress]);

  if (!connectionState.walletAddress) {
    return (
      <main className="flex flex-col text-center justify-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full">
        <h1 className="text-4xl font-semibold text-primary-gray">
          Welcome to Wallet Enhancer
        </h1>
        <p className="font-semibold mt-4 text-gray-400 ">
          Please connect your wallet
          <br />
          or search an address.
        </p>
        <div className="mt-4 mx-auto sm:invisible">
          <SearchWalletInput />
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 pb-8 sm:px-6 pt-2">
      <TopArea tools={HOME_TOOLS} setFilteredAssets={setFilteredAssets} />
      <GridPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onChange={handlePageChange}
      />
      <div className="flex flex-row justify-between gap-x-2 sm:gap-x-0 mb-2 px-2 items-center">
        <InputBase
          placeholder="search by asset id"
          inputProps={{ "aria-label": "search by asset id" }}
          onChange={(e) => handleSearch(e.target.value)}
          className="bg-secondary-gray/60 rounded pl-2 my-2"
        />
        <div className="flex flex-row gap-x-2">
          <Button
            variant="contained"
            color="info"
            size="medium"
            sx={{
              height: "2rem",
              fontWeight: "bold",
              fontSize: "0.8rem",
              lineHeight: {
                xs: "1rem",
              },
            }}
            onClick={() => {
              filteredAssets
                .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
                .forEach((asset) => {
                  if (!toolState.selectedAssets.includes(asset["asset-id"])) {
                    toolState.addSelectedAsset(asset["asset-id"]);
                  }
                });
            }}
          >
            Select All
          </Button>
          <Select
            displayEmpty
            value={orderBy}
            onChange={handleOrderBy}
            input={<OutlinedInput />}
            sx={{
              height: "2rem",
              color: "white",
              fontWeight: "bold",
              fontSize: "1rem",
              maxWidth: {
                xs: "8rem",
                sm: "100%",
              },
            }}
            inputProps={{ "aria-label": "Without label" }}
          >
            <SelectSubHeader>Sort</SelectSubHeader>
            {orderByOptions.map((option) => (
              <MenuItem
                value={option.value}
                key={option.value}
                id={option.value}
                sx={{ fontSize: "14px" }}
              >
                {option.label}
              </MenuItem>
            ))}
            <SelectSubHeader>Filter</SelectSubHeader>
            {filterByOptions.map((option) => (
              <MenuItem
                value={option.value}
                key={option.value}
                id={option.value}
                sx={{ fontSize: "14px" }}
              >
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </div>
      </div>
      <Grid container spacing={2} sx={{ paddingX: "8px", marginBottom: 2 }}>
        {filteredAssets
          .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
          .map((asset) => (
            <Grid item xs={12} sm={6} md={4} lg={2} key={asset["asset-id"]}>
              <AssetImageCard
                asset={asset}
                page="home"
                setFilteredAssets={setFilteredAssets}
              />
            </Grid>
          ))}
      </Grid>
      <GridPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onChange={handlePageChange}
      />
    </main>
  );
}
