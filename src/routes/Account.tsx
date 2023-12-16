import {
  Button,
  Grid,
  InputBase,
  MenuItem,
  OutlinedInput,
  Select,
  SelectChangeEvent,
} from "@mui/material";
import { isValidAddress } from "algosdk";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AssetImageCard from "../components/AssetCard";
import TopArea from "../components/TopArea";
import {
  copyAssetIds,
  createAssetOptInTransactions,
  getAssetsFromAddress,
  getCreatedAssetsFromAddress,
  getWalletAddressFromNFDomain,
} from "../core/utils";
import useConnectionStore from "../store/connectionStore";
import Fuse from "fuse.js";
import GridPagination from "../components/GridPagination";
import {
  fuseSearchOptions,
  PAGE_SIZE,
  orderByOptions,
  filterByOptions,
} from "../core/constants";
import { AssetsType } from "../core/types";
import useAssetStore from "../store/assetStore";
import useToolStore from "../store/toolStore";
import SelectSubHeader from "../components/selects/SelectSubHeader";

const ACCOUNT_TOOLS = [
  {
    name: "Multi Opt-in",
    id: "asset-opt-in",
    action: createAssetOptInTransactions,
  },
  {
    name: "Multi Copy",
    id: "asset-copy",
    action: copyAssetIds,
  },
];

export default function Account() {
  // ** Store
  const connection = useConnectionStore((state) => state);
  const toolState = useToolStore((state) => state);
  const navigation = useNavigate();
  const { account } = useParams();
  // ** State
  const [searchWallet, setSearchWallet] = useState("");
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
          .assets.filter((asset) => asset.params.creator === searchWallet)
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
    async function convertDomainToWalletAddress() {
      if (account) {
        let walletAddress = account.trim();
        if (walletAddress.toLowerCase().includes(".algo")) {
          const response = await getWalletAddressFromNFDomain(
            walletAddress.toLowerCase()
          );
          if (isValidAddress(response)) {
            setSearchWallet(response);
            return;
          }
        } else if (isValidAddress(walletAddress)) {
          setSearchWallet(walletAddress);
          return;
        }
      }
    }
    convertDomainToWalletAddress();
  }, [account]);

  useEffect(() => {
    if (searchWallet) {
      if (connection.walletAddress === searchWallet) {
        navigation("/");
      }
    }
  }, [connection.walletAddress, navigation, searchWallet]);

  useEffect(() => {
    async function getAssets() {
      const response = await getAssetsFromAddress(searchWallet);
      setAssets(response);
      setFilteredAssets(response);
      setTotalPages(Math.ceil(response.length / PAGE_SIZE));
    }
    async function getCreatedAssets() {
      const response = await getCreatedAssetsFromAddress(searchWallet);
      useAssetStore.getState().setAssets(response);
    }

    if (searchWallet) {
      getCreatedAssets();
      getAssets();
    }
  }, [searchWallet]);

  if (!searchWallet) {
    return (
      <main className="flex flex-col text-center justify-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full">
        <h1 className="text-4xl font-semibold text-primary-gray">
          Invalid Address
        </h1>
        <Link
          to="/"
          className="text-xl text-primary-green hover:underline mt-2 transition-colors"
        >
          Go to Home
        </Link>
      </main>
    );
  }

  return (
    <main className="px-4 pb-16 sm:px-6 pt-2">
      <TopArea tools={ACCOUNT_TOOLS} setFilteredAssets={setFilteredAssets} />
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
                page="account"
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
