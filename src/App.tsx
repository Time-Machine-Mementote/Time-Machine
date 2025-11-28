import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthGuard } from "./components/AuthGuard";
import { MapScreen } from "./components/MapScreen";
import NotFound from "./pages/NotFound";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

// Register service worker for background audio support
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration is optional - fail silently
    });
  });
}

const App = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthGuard>
          <Routes>
            <Route path="/" element={<MapScreen userId={user?.id} showOverlay={true} />} />
            <Route path="/map" element={<MapScreen userId={user?.id} showOverlay={false} />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </AuthGuard>
        </BrowserRouter>
      </TooltipProvider>
    </>
  );
};

export default App;
