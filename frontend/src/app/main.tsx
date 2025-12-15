import { QueryClientProvider } from "@tanstack/react-query";

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { BackNavigationProvider } from "@/context/BackNavigationContext";
import { ThemeProvider } from "@/context/ThemeProviderContext";
import "./index.css";
import { queryClient } from "../utils/query-client";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider defaultTheme="light">
          {/* Provider is already used inside AppsLayout where needed; keep here for any global consumers */}
          <BackNavigationProvider>
            <App />
          </BackNavigationProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
