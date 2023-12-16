import { ToolSelectProps } from "../core/types";
import SearchWalletInput from "./SearchWalletInput";
import ToolSelect from "./selects/ToolSelect";

const TopArea = ({ tools, setFilteredAssets }: ToolSelectProps) => {
  return (
    <div className="flex flex-col-reverse md:flex-row justify-between items-center py-2 px-2 gap-y-1">
      <ToolSelect tools={tools} setFilteredAssets={setFilteredAssets} />
      <div className="flex flex-col sm:hidden">
        <SearchWalletInput />
      </div>
    </div>
  );
};

export default TopArea;
