import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { Link } from "react-router-dom";
import ConnectButton from "./ConnectButton";
import SearchWalletInput from "./SearchWalletInput";

export function Header() {
  return (
    <AppBar sx={{ backgroundColor: "#030003" }} position="sticky">
      <Toolbar>
        <Link to="/">
          <img
            src="/images/logo.png"
            alt="logo"
            className="mr-2 w-12 h-12 p-1 "
          />
        </Link>
        <Typography
          component="div"
          sx={{
            fontFamily: "Josefin Slab",
            flexGrow: 1,
            fontWeight: 400,
            fontSize: {
              xs: "1rem",
              sm: "1.25rem",
              md: "1.5rem",
              lg: "1.75rem",
            },
            ":hover": {
              cursor: "pointer",
            },
            ml: { xs: 2, sm: 0 },
            visibility: { xs: "hidden", sm: "visible" },
          }}
        >
          <Link to="/">Wallet Enhancer</Link>
        </Typography>
        <div className="hidden sm:block mr-2">
          <SearchWalletInput />
        </div>
        <ConnectButton />
      </Toolbar>
    </AppBar>
  );
}
