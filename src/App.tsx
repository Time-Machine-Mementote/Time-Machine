import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthGuard } from "./components/AuthGuard";
import { MapScreen } from "./components/MapScreen";
import NotFound from "./pages/NotFound";
import { InputOnlyPage } from "./pages/InputOnlyPage";
import { InputPage } from "./pages/InputPage";
import { ExhibitionPage } from "./pages/ExhibitionPage";
import { DevPortalPage } from "./pages/DevPortalPage";
import { SecretCodePage } from "./pages/SecretCodePage";
import { LoginPage } from "./pages/LoginPage";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { INPUT_ONLY_MODE } from "@/config/featureFlags";

// Register service worker for background audio support
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        console.log('Service Worker registered:', registration.scope);
        // Check for updates
        registration.update();
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          console.log('Service Worker update found');
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New Service Worker installed, reloading...');
                window.location.reload();
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

// Inner component that uses auth context (only for non-input-only mode)
function AppInner() {
  const { user } = useAuth();

  // Original auth-required flow (disabled in this branch but kept for future)
  return (
    <Routes>
      <Route path="/" element={<MapScreen userId={user?.id} showOverlay={true} />} />
      <Route path="/map" element={<MapScreen userId={user?.id} showOverlay={false} />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

// Input-only mode routes (no auth required)
function InputOnlyRoutes() {
  return (
    <Routes>
      <Route path="/" element={<InputPage mode="normal" />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/exhibition" element={<ExhibitionPage />} />
      <Route path="/dev" element={<DevPortalPage />} />
      <Route path="/dev/secret-code" element={<SecretCodePage />} />
      {/* Keep old routes available but commented out - can re-enable later */}
      {/* <Route path="/map" element={<MapScreen userId={undefined} showOverlay={true} />} /> */}
      {/* <Route path="/map-full" element={<MapScreen userId={undefined} showOverlay={false} />} /> */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => {
  // In input-only mode, skip AuthGuard (no auth required)
  // Auth code remains but is not used in this mode
  if (INPUT_ONLY_MODE) {
    return (
      <>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              {/* AuthGuard disabled in input-only mode - auth code kept for future re-enable */}
              <InputOnlyRoutes />
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </>
    );
  }

  // Original flow with AuthGuard (disabled in this branch)
  return (
    <>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthGuard>
            <AppInner />
          </AuthGuard>
        </BrowserRouter>
      </TooltipProvider>
    </>
  );
};

export default App;
