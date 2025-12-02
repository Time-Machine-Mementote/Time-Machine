import { useState, useEffect } from 'react'
import { supabase } from '../integrations/supabase/client'
import type { User } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

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
    
    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error('Error getting session:', error)
        }
        console.log('Initial session:', session ? 'Found' : 'None')
        setUser(session?.user ?? null)
        setLoading(false)
      })
      .catch((error) => {
        console.error('Failed to get session:', error)
        setLoading(false)
      })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session ? 'Session found' : 'No session')
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)

    try {
      console.log('Attempting authentication...', { isSignUp, email: email.substring(0, 5) + '...' })
      
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        })
        
        console.log('Sign up response:', { data, error })
        
        if (error) {
          console.error('Sign up error:', error)
          throw error
        }
        toast.success('Check your email for the confirmation link!')
      } else {
        // Test connection first
        console.log('Testing Supabase connection...')
        try {
          const testResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL || 'https://qhbrnotooiutpwwtadlx.supabase.co'}/rest/v1/`, {
            method: 'HEAD',
            headers: {
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
            }
          })
          console.log('Connection test response:', testResponse.status, testResponse.statusText)
        } catch (testError) {
          console.error('Connection test failed:', testError)
        }
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        
        console.log('Sign in response:', { 
          data: data ? 'Success' : 'No data', 
          error: error ? {
            message: error.message,
            status: error.status,
            name: error.name
          } : null
        })
        
        if (error) {
          console.error('Sign in error details:', {
            message: error.message,
            status: error.status,
            name: error.name,
            stack: error.stack
          })
          throw error
        }
        // Removed welcome back toast
      }
    } catch (error) {
      console.error('Auth error details:', error)
      
      let errorMessage = 'An error occurred'
      let errorDetails: any = {}
      
      if (error instanceof Error) {
        errorDetails = {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
        
        // Check for network errors
        if (error.message.includes('Failed to fetch') || 
            error.message.includes('NetworkError') ||
            error.message.includes('Network request failed') ||
            error.message.includes('Load failed')) {
          
          const isVercel = window.location.hostname.includes('vercel.app');
          const envUrl = import.meta.env.VITE_SUPABASE_URL;
          const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
          
          if (isVercel && (!envUrl || !envKey)) {
            errorMessage = 'Configuration Error: Environment variables not set in Vercel. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel Dashboard > Settings > Environment Variables, then redeploy.'
          } else {
            errorMessage = 'Network error: Unable to connect to server. Please check your internet connection and try again.'
          }
          
          console.error('Network error detected - troubleshooting info:', {
            isVercel: isVercel,
            envUrlSet: !!envUrl,
            envKeySet: !!envKey,
            serviceWorker: 'Check DevTools > Application > Service Workers',
            cors: 'Check Supabase Dashboard > Settings > API > CORS',
            url: envUrl || 'Not set - using fallback',
            keyPresent: !!envKey,
            hostname: window.location.hostname,
            protocol: window.location.protocol,
            troubleshooting: isVercel ? 'See VERCEL_DEPLOYMENT.md for setup instructions' : 'Check network connection'
          })
          
          // Try to unregister service worker if it exists
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
              if (registrations.length > 0) {
                console.warn('Service workers found:', registrations.length)
                console.warn('To fix: Go to DevTools > Application > Service Workers > Unregister')
              }
            })
          }
        } else {
          errorMessage = error.message || 'Authentication failed'
        }
      } else if (typeof error === 'object' && error !== null) {
        // Supabase error object
        if ('message' in error) {
          errorMessage = String(error.message)
        }
        if ('status' in error) {
          errorDetails.status = error.status
        }
      }
      
      console.error('Final error message:', errorMessage, errorDetails)
      toast.error(errorMessage)
    } finally {
      setAuthLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    // Removed sign out toast
  }

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
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-black">
        <div className="terminal-container w-full max-w-md">
          <div className="mb-6">
            <div className="font-terminal text-white mb-2">
              <span className="text-white">&gt;</span> {isSignUp ? 'CREATE_ACCOUNT.EXE' : 'LOGIN.EXE'}
            </div>
            <div className="font-terminal text-white text-sm">
              {isSignUp 
                ? 'Initializing user registration protocol...' 
                : 'Accessing memory database...'
              }
            </div>
          </div>
          
          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <label htmlFor="fullName" className="font-terminal text-white text-sm block">
                  <span className="text-white">&gt;</span> FULL_NAME:
                </label>
                <input
                  id="fullName"
                  type="text"
                  placeholder="Enter full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-black border border-white text-white font-terminal px-3 py-2 focus:outline-none focus:border-white"
                  required={isSignUp}
                />
              </div>
            )}
            
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

            <button 
              type="submit" 
              className="w-full bg-white text-black font-terminal px-4 py-2 border-2 border-black hover:bg-black hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
              disabled={authLoading}
            >
              {authLoading ? (
                <>
                  <span className="inline-block animate-pulse">PROCESSING</span>
                  <span className="terminal-cursor"></span>
                </>
              ) : (
                <span className="text-black">&gt;</span>
              )} {isSignUp ? 'EXECUTE_CREATE_ACCOUNT' : 'EXECUTE_LOGIN'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="font-terminal text-white text-sm hover:underline"
            >
              {isSignUp 
                ? '&gt; SWITCH_TO_LOGIN' 
                : '&gt; SWITCH_TO_CREATE_ACCOUNT'
              }
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col" style={{ height: '100dvh' }}>
      <div className="flex-1 overflow-hidden min-h-0">
        {children}
      </div>
    </div>
  )
} 