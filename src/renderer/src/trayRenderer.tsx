import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { TrayPopover } from "./components/TrayPopover/TrayPopover";
import "./styles/index.css";

// Component to apply dark mode
const AppWithForcedDarkMode = () => {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return <TrayPopover />;
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppWithForcedDarkMode />
  </React.StrictMode>,
);
