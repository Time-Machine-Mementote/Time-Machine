// Login Page - Standalone login page with auto-fill support
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface LocationState {
  email?: string;
  password?: string;
  fromSignUp?: boolean;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Auto-fill credentials from navigation state (from sign-up)
  // Credentials are only in memory (navigation state), not persisted
  useEffect(() => {
    const state = location.state as LocationState | null;
    if (state?.email) {
      setEmail(state.email);
    }
    if (state?.password) {
      setPassword(state.password);
    }
    // Note: Success message is shown in AuthModal after sign-up, so we don't duplicate it here
  }, [location.state]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Success - navigate to home
      toast.success('Logged in successfully');
      navigate('/');
    } catch (error) {
      console.error('Login error:', error);

      let errorMessage = 'An error occurred';
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') ||
            error.message.includes('NetworkError') ||
            error.message.includes('Load failed')) {
          errorMessage = 'Network error: Unable to connect. Please check your connection.';
        } else {
          errorMessage = error.message || 'Authentication failed';
        }
      }
      toast.error(errorMessage);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <h1 className="font-terminal text-white text-2xl mb-2">
            <span className="text-white">&gt;</span> SIGN_IN
          </h1>
          <p className="font-terminal text-gray-400 text-sm">
            Sign in to record and save your memories
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="font-terminal text-white text-sm block">
              <span className="text-white">&gt;</span> EMAIL:
            </label>
            <input
              id="email"
              type="email"
              placeholder="user@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black border border-white text-white font-terminal px-3 py-2 focus:outline-none focus:border-white"
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="font-terminal text-white text-sm block">
              <span className="text-white">&gt;</span> PASSWORD:
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-white text-white font-terminal px-3 py-2 focus:outline-none focus:border-white"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-white text-black font-terminal px-4 py-3 border-2 border-black hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-6"
            disabled={authLoading}
          >
            {authLoading ? (
              <>
                <span className="inline-block animate-pulse">PROCESSING</span>
                <span className="terminal-cursor"></span>
              </>
            ) : (
              <>
                <span className="text-black">&gt;</span> SIGN_IN
              </>
            )}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => navigate('/')}
            className="font-terminal text-gray-400 text-sm hover:text-white transition-colors"
          >
            &gt; Back to home
          </button>
        </div>
      </div>
    </div>
  );
}

