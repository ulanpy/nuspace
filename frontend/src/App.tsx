import { Routes, Route } from "react-router-dom"
import HomePage from "./pages/home"
import KupiProdaiPage from "./pages/apps/kupi-prodai"
import NUEventsPage from "./pages/apps/nu-events"
import DormEatsPage from "./pages/apps/dorm-eats"
import AppsLayout from "./layouts/apps-layout"

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/apps" element={<AppsLayout />}>
        <Route path="kupi-prodai" element={<KupiProdaiPage />} />
        <Route path="nu-events" element={<NUEventsPage />} />
        <Route path="dorm-eats" element={<DormEatsPage />} />
      </Route>
    </Routes>
  )
}

export default App

