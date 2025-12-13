import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { usePhoneLead } from '@/hooks/usePhoneLead';
import { Loader2, X } from 'lucide-react';

interface PhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  autoFocus?: boolean;
}

export function PhoneModal({ isOpen, onClose, autoFocus = true }: PhoneModalProps) {
  const [phoneInput, setPhoneInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { submitPhone } = usePhoneLead();
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset input and auto-focus when modal opens
  useEffect(() => {
    if (isOpen && autoFocus) {
      setPhoneInput('');
      
      // Aggressive auto-focus to open mobile keyboard
      // Multiple attempts with delays for better mobile compatibility (especially iOS/Safari)
      // This is critical for exhibition mode where keyboard should open immediately
      const focusInput = () => {
        if (inputRef.current) {
          // Ensure input is visible and not disabled before focusing
          const input = inputRef.current;
          if (input.offsetParent !== null && !input.disabled) {
            input.focus();
            // Force focus even if element is not visible yet (for iOS)
            input.click();
            // Also try to show the keyboard by selecting text (helps on some devices)
            if (input.setSelectionRange) {
              input.setSelectionRange(0, 0);
            }
          }
        }
      };
      
      // Immediate focus attempt (after modal is rendered)
      requestAnimationFrame(() => {
        requestAnimationFrame(focusInput);
      });
      
      // Multiple delayed attempts for iOS/Safari compatibility
      // iOS sometimes blocks programmatic keyboard opening unless it happens in a user gesture
      // These delays help catch the modal after it's fully visible
      setTimeout(focusInput, 50);
      setTimeout(focusInput, 150);
      setTimeout(focusInput, 300);
      setTimeout(focusInput, 500);
      setTimeout(focusInput, 750); // Extra attempt for slow devices
    } else if (isOpen) {
      setPhoneInput('');
    }
  }, [isOpen, autoFocus]);

  // Override dialog overlay to be pure black (no opacity tinting)
  useEffect(() => {
    if (isOpen) {
      // Add style override for the dialog overlay
      const style = document.createElement('style');
      style.id = 'phone-modal-overlay-override';
      style.textContent = `
        [data-radix-dialog-overlay] {
          background-color: #000000 !important;
          opacity: 1 !important;
        }
      `;
      document.head.appendChild(style);

      return () => {
        const existingStyle = document.getElementById('phone-modal-overlay-override');
        if (existingStyle) {
          existingStyle.remove();
        }
      };
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneInput.trim()) {
      return;
    }

    setIsSubmitting(true);
    const success = await submitPhone(phoneInput);
    setIsSubmitting(false);

    if (success) {
      setPhoneInput('');
      // Small delay to ensure localStorage is updated
      setTimeout(() => {
        onClose();
      }, 100);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md bg-black border-2 border-white shadow-none p-6 [&>button]:hidden" 
        onInteractOutside={(e) => e.preventDefault()}
        style={{ 
          backgroundColor: '#000000',
          borderColor: '#FFFFFF',
          boxShadow: 'none'
        }}
      >
        <DialogHeader className="relative">
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="absolute top-0 right-0 text-white hover:bg-white hover:text-black border border-white rounded-none"
            style={{
              backgroundColor: '#000000',
              color: '#FFFFFF',
              borderColor: '#FFFFFF'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.color = '#000000';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#000000';
              e.currentTarget.style.color = '#FFFFFF';
            }}
          >
            <X className="h-4 w-4" />
          </Button>
          <DialogTitle className="text-lg font-normal text-white pr-8">
            Yaaaayou! Use this app anywhere you want to save a sound.{' '}
            If you give us your number we can take you back in time and also invite you to our parties—we are moving to a warehouse in San Francisco in August 2026.{' '}
            Ask G if you have any questions.{' '}
            Thank you for your time!
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div 
            className="w-full"
            onClick={(e) => {
              // Make entire input area clickable - forward focus to input
              if (inputRef.current && e.target !== inputRef.current) {
                inputRef.current.focus();
                inputRef.current.click();
              }
            }}
          >
            <label htmlFor="phone-input" className="sr-only">
              Phone number
            </label>
            <Input
              id="phone-input"
              ref={inputRef}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              enterKeyHint="done"
              pattern="[0-9]*"
              placeholder="Phone number"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              disabled={isSubmitting}
              aria-label="Phone number"
              className="w-full bg-black border-2 border-white text-white placeholder:text-white/60 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-0 focus-visible:outline-none rounded-none"
              style={{
                backgroundColor: '#000000',
                borderColor: '#FFFFFF',
                color: '#FFFFFF',
                caretColor: '#FFFFFF'
              }}
              autoFocus
            />
          </div>
          <Button
            type="submit"
            disabled={!phoneInput.trim() || isSubmitting}
            className="w-full bg-black text-white border-2 border-white hover:bg-white hover:text-black focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-0 rounded-none disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: '#000000',
              color: '#FFFFFF',
              borderColor: '#FFFFFF'
            }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.color = '#000000';
              }
            }}
            onMouseLeave={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.backgroundColor = '#000000';
                e.currentTarget.style.color = '#FFFFFF';
              }
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

