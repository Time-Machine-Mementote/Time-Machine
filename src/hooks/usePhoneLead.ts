import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const PHONE_STORAGE_KEY = 'tm_phone_number';
const PHONE_COLLECTED_KEY = 'tm_phone_collected';

/**
 * Normalizes a US phone number to a consistent format (E.164-like)
 * Accepts various formats: (555) 123-4567, 555-123-4567, 5551234567, etc.
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // If it starts with 1, remove it (US country code)
  const cleaned = digits.startsWith('1') && digits.length === 11 
    ? digits.slice(1) 
    : digits;
  
  // Should be 10 digits for US number
  if (cleaned.length !== 10) {
    throw new Error('Phone number must be 10 digits');
  }
  
  // Return in format: +1XXXXXXXXXX (E.164-like)
  return `+1${cleaned}`;
}

/**
 * Hook for managing phone number collection and storage
 */
export function usePhoneLead() {
  const [phone, setPhone] = useState<string | null>(null);
  const [isCollected, setIsCollected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load phone from localStorage on mount
  useEffect(() => {
    const storedPhone = localStorage.getItem(PHONE_STORAGE_KEY);
    const storedCollected = localStorage.getItem(PHONE_COLLECTED_KEY) === 'true';
    
    setPhone(storedPhone);
    setIsCollected(storedCollected);
    setIsLoading(false);
  }, []);

  /**
   * Submit phone number to localStorage and Supabase
   */
  const submitPhone = async (phoneInput: string): Promise<boolean> => {
    try {
      // Normalize phone number
      const normalized = normalizePhoneNumber(phoneInput);
      
      // Store in localStorage first (so it's available immediately)
      localStorage.setItem(PHONE_STORAGE_KEY, normalized);
      localStorage.setItem(PHONE_COLLECTED_KEY, 'true');
      
      // Update state immediately
      setPhone(normalized);
      setIsCollected(true);
      
      // Insert into Supabase (async, don't block on this)
      const { error } = await supabase
        .from('phone_leads')
        .insert({
          phone: normalized,
          source: 'input-only',
        });
      
      if (error) {
        console.error('Error saving phone to database:', error);
        // Still keep it in localStorage even if DB insert fails
        toast.error('Failed to save phone number to database, but it was saved locally.');
        // Don't return false - we still have it in localStorage
      }
      
      return true;
    } catch (error: any) {
      console.error('Error submitting phone:', error);
      toast.error(error.message || 'Invalid phone number format');
      return false;
    }
  };

  return {
    phone,
    isCollected,
    isLoading,
    submitPhone,
  };
}

