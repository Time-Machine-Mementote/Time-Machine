// Auth Modal Component - Shows sign in/sign up form when needed
import { useState } from 'react'
import { supabase } from '../integrations/supabase/client'
import { toast } from 'sonner'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { X } from 'lucide-react'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const SECRET_CODE = '8463'

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [secretCode, setSecretCode] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)

    try {
      if (isSignUp) {
        // Validate secret code for sign-up
        if (secretCode !== SECRET_CODE) {
          toast.error('Invalid access code. Please enter the correct code.')
          setAuthLoading(false)
          return
        }
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        })
        
        if (error) throw error
        toast.success('Check your email for the confirmation link!')
        // Don't close on signup - they need to verify email first
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        
        if (error) throw error
        
        // Success - close modal and trigger callback
        onClose()
        onSuccess?.()
      }
    } catch (error) {
      console.error('Auth error:', error)
      
      let errorMessage = 'An error occurred'
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || 
            error.message.includes('NetworkError') ||
            error.message.includes('Load failed')) {
          errorMessage = 'Network error: Unable to connect. Please check your connection.'
        } else {
          errorMessage = error.message || 'Authentication failed'
        }
      }
      toast.error(errorMessage)
    } finally {
      setAuthLoading(false)
    }
  }

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setFullName('')
    setSecretCode('')
    setIsSignUp(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] bg-black border-t-2 border-white">
        <div className="p-4 pb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="font-terminal text-white">
              <span className="text-white">&gt;</span> {isSignUp ? 'CREATE_ACCOUNT' : 'SIGN_IN'}
            </div>
            <button
              onClick={handleClose}
              className="text-white hover:text-gray-300 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="font-terminal text-gray-400 text-sm mb-6">
            {isSignUp 
              ? 'Create an account to start recording memories' 
              : 'Sign in to record and save your memories'
            }
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
              <label htmlFor="modalEmail" className="font-terminal text-white text-sm block">
                <span className="text-white">&gt;</span> EMAIL:
              </label>
              <input
                id="modalEmail"
                type="email"
                placeholder="user@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black border border-white text-white font-terminal px-3 py-2 focus:outline-none focus:border-white"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="modalPassword" className="font-terminal text-white text-sm block">
                <span className="text-white">&gt;</span> PASSWORD:
              </label>
              <input
                id="modalPassword"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black border border-white text-white font-terminal px-3 py-2 focus:outline-none focus:border-white"
                required
              />
            </div>

            {isSignUp && (
              <div className="space-y-2">
                <label htmlFor="modalSecretCode" className="font-terminal text-white text-sm block">
                  <span className="text-white">&gt;</span> ACCESS_CODE:
                </label>
                <input
                  id="modalSecretCode"
                  type="text"
                  placeholder="Enter access code"
                  value={secretCode}
                  onChange={(e) => setSecretCode(e.target.value)}
                  className="w-full bg-black border border-white text-white font-terminal px-3 py-2 focus:outline-none focus:border-white"
                  required={isSignUp}
                />
                <div className="font-terminal text-gray-500 text-xs">
                  Ask a current user for the access code
                </div>
              </div>
            )}

            <button 
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
                  <span className="text-black">&gt;</span> {isSignUp ? 'CREATE_ACCOUNT' : 'SIGN_IN'}
                </>
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="font-terminal text-gray-400 text-sm hover:text-white transition-colors"
            >
              {isSignUp 
                ? '&gt; Already have an account? SIGN_IN' 
                : '&gt; Need an account? CREATE_ONE'
              }
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}


