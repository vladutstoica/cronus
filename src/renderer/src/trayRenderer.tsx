import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { TrayPopover } from "./components/TrayPopover/TrayPopover";
import "./styles/index.css";

// Component to apply dark mode
const AppWithForcedDarkMode = () => {
  useEffect(() => {
    // Ensure dark mode class is applied to both html and body
    const htmlElement = document.documentElement;
    const bodyElement = document.body;

    htmlElement.classList.add("dark");
    bodyElement.classList.add("dark");

    // Set data attribute for additional targeting if needed
    htmlElement.setAttribute("data-theme", "dark");

    console.log("[TrayRenderer] Dark mode applied:", {
      htmlHasDark: htmlElement.classList.contains("dark"),
      bodyHasDark: bodyElement.classList.contains("dark"),
    });
  }, []);

  return <TrayPopover />;
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppWithForcedDarkMode />
  </React.StrictMode>,
);
