import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/home";
import KupiProdaiPage from "./pages/apps/kupi-prodai";
import ProductDetailPage from "./pages/apps/kupi-prodai/product/[id]";
import NUEventsPage from "./pages/apps/nu-events";
import DormEatsPage from "./pages/apps/dorm-eats";
import AppsLayout from "./layouts/apps-layout";
import { AuthProvider } from "./context/auth-context";
import { Toasts } from "./components/ui/toast";
import { ListingProvider } from "./context/listing-context";
import { ImageProvider } from "./context/image-context";
import { MediaProvider } from "./context/media-context";
import SearchPage from "./pages/apps/kupi-prodai/search/page"

function App() {
  return (
    <AuthProvider>
      <ListingProvider>
        <ImageProvider>
          <MediaProvider>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/apps" element={<AppsLayout />}>
                <Route path="kupi-prodai" element={<KupiProdaiPage />} >
                  <Route path="search" element={<SearchPage/>} />
                  <Route path="search/:keyword" element={<KupiProdaiPage />} />
                </Route>
                <Route
                  path="kupi-prodai/product/:id"
                  element={<ProductDetailPage />}
                />
                <Route path="nu-events" element={<NUEventsPage />} />
                <Route path="dorm-eats" element={<DormEatsPage />} />
              </Route>
            </Routes>
            <Toasts />
          </MediaProvider>
        </ImageProvider>
      </ListingProvider>
    </AuthProvider>
  );
}
import { Search } from "lucide-react";

export default App;
