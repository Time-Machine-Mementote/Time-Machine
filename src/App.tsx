import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthGuard } from "./components/AuthGuard";
import { MapScreen } from "./components/MapScreen";
import NotFound from "./pages/NotFound";
import { useAuth } from "@/contexts/AuthContext";

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

// Inner component that uses auth context
function AppInner() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<MapScreen userId={user?.id} showOverlay={true} />} />
      <Route path="/map" element={<MapScreen userId={user?.id} showOverlay={false} />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => {
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
