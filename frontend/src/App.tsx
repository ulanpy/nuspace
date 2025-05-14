import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/home";
import ProductDetailPage from "./pages/apps/kupi-prodai/product/[id]";
import AppsLayout from "./layouts/apps-layout";
import { Toasts } from "./components/atoms/toast";
import { ListingProvider } from "./context/listing-context";
import { ImageProvider } from "./context/image-context";
import { MediaProvider } from "./context/media-context";
import { lazy, Suspense } from "react";

const About = lazy(() =>
  import("@/pages/apps/about").then((module) => ({ default: module.About }))
);
const KupiProdaiPage = lazy(() => import("./pages/apps/kupi-prodai"));
const NUEventsPage = lazy(() => import("./pages/apps/nu-events"));
const DormEatsPage = lazy(() => import("./pages/apps/dorm-eats"));
function App() {
  return (
    <ListingProvider>
      <ImageProvider>
        <MediaProvider>
          <Suspense fallback={<div>Загружается ...</div>}>
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
                <Route path="nu-events" element={<NUEventsPage />} />
                <Route path="dorm-eats" element={<DormEatsPage />} />
              </Route>
            </Routes>
          </Suspense>
          <Toasts />
        </MediaProvider>
      </ImageProvider>
    </ListingProvider>
  );
}

export default App;
