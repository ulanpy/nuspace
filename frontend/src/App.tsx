import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/home";
import KupiProdaiPage from "./pages/apps/kupi-prodai";
import ProductDetailPage from "./pages/apps/kupi-prodai/product/[id]";
import NUEventsPage from "./pages/apps/nu-events";
import DormEatsPage from "./pages/apps/dorm-eats";
import { About } from "./pages/apps/about";
import AppsLayout from "./layouts/apps-layout";
import { Toasts } from "./components/ui/toast";
import { ListingProvider } from "./context/listing-context";
import { ImageProvider } from "./context/image-context";
import { MediaProvider } from "./context/media-context";;

function App() {
  return (
    <ListingProvider>
      <ImageProvider>
        <MediaProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/apps" element={<AppsLayout />}>
              <Route path="kupi-prodai" element={<KupiProdaiPage />}>
                <Route path="search" element={<KupiProdaiPage />} />
              </Route>
              <Route
                path="kupi-prodai/product/:id"
                element={<ProductDetailPage />}
              />
              <Route path="about" element={<About />} />
              {/* <Route path="nu-events" element={<NUEventsPage />} />
                <Route path="dorm-eats" element={<DormEatsPage />} /> */}
            </Route>
          </Routes>
          <Toasts />
        </MediaProvider>
      </ImageProvider>
    </ListingProvider>
  );
}

export default App;
