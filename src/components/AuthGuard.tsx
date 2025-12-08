// Auth Guard - No longer gates the app, just provides auth context
import { useEffect } from 'react'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { AuthModal } from './AuthModal'
import { Loader2 } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
}

// Inner component that uses auth context
function AuthGuardInner({ children }: AuthGuardProps) {
  const { loading, isAuthModalOpen, closeAuthModal } = useAuth()

  useEffect(() => {
    // Test Supabase connection on mount (especially for Vercel)
    const testConnection = async () => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qhbrnotooiutpwwtadlx.supabase.co';
      const isVercel = window.location.hostname.includes('vercel.app');
      
      if (isVercel) {
        console.log('🔍 Testing Supabase connection on Vercel...');
        try {
          const response = await fetch(`${supabaseUrl}/rest/v1/`, {
            method: 'HEAD',
            headers: {
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
            }
          });
          console.log('✅ Connection test result:', response.status, response.statusText);
        } catch (error) {
          console.error('❌ Connection test failed:', error);
          console.error('This may indicate:', {
            envVars: 'Environment variables not set in Vercel',
            cors: 'CORS not configured in Supabase',
            network: 'Network connectivity issue'
          });
        }
      }
    };
    
    testConnection();
  }, []);

  // Show loading only during initial auth check
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center terminal-container">
          <div className="font-terminal text-white">
            <span className="text-white">&gt;</span> INITIALIZING_SYSTEM
            <span className="terminal-cursor"></span>
          </div>
        </div>
      </div>
    );
  }

  // Always render children - no auth gating
  return (
    <>
      <div className="h-screen flex flex-col" style={{ height: '100dvh' }}>
        <div className="flex-1 overflow-hidden min-h-0">
          {children}
        </div>
      </div>
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={closeAuthModal}
        onSuccess={() => {
          // Auth modal will close automatically via context
          closeAuthModal();
        }}
      />
    </>
  );
}

// Outer component that provides auth context
export function AuthGuard({ children }: AuthGuardProps) {
  return (
    <AuthProvider>
      <AuthGuardInner>{children}</AuthGuardInner>
    </AuthProvider>
  );
}
