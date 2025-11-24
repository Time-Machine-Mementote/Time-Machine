import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthGuard } from "./components/AuthGuard";
import { MapScreen } from "./components/MapScreen";
import NotFound from "./pages/NotFound";
import InputYourTime from "./pages/InputYourTime";
import TerminalInput from "./pages/TerminalInput";
import Receipt from "./pages/Receipt";
import CurrentExperienceScreen from "./pages/CurrentExperienceScreen";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const App = () => {
  const [user, setUser] = useState<any>(null);

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
          <Routes>
            <Route path="/" element={<InputYourTime />} />
            <Route path="/terminal" element={<TerminalInput />} />
            <Route path="/receipt" element={<Receipt />} />
            <Route path="/map" element={<MapScreen userId={user?.id} />} />
            <Route path="/current" element={<CurrentExperienceScreen />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </>
  );
};

export default App;
