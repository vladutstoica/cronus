import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import FloatingDisplay from "./FloatingDisplay";
import "./styles/index.css"; // Corrected path to Tailwind CSS

// Component to apply dark mode
const AppWithForcedDarkMode = () => {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return <FloatingDisplay />;
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppWithForcedDarkMode />
  </React.StrictMode>,
);
