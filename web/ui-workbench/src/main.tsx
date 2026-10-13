import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { Workbench } from "./workbench"

// The project's stylesheet, twice: once so it paints, once as the text the
// token sheet edits and downloads. Point this at a different file to work on
// another one.
import "@/index.css"
import source from "@/index.css?raw"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Workbench source={source} />
  </StrictMode>
)
