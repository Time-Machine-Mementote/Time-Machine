// The Current: Voice manager for poetic voice selection

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type PoeticVoice = {
  id: string;
  name: string;
  slug: string;
  language_code: string;
  tts_provider: string;
  tts_voice_id: string | null;
  style_instructions: string;
  sample_corpus: string | null;
};

const DEFAULT_VOICE_SLUG = 'greg';
const STORAGE_KEY = 'current_voice_slug';

/**
 * Get available voice slugs (hardcoded for now, can be fetched from DB)
 */
export async function getAvailableVoices(): Promise<PoeticVoice[]> {
  try {
    const { data, error } = await supabase
      .from('poetic_voices')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching voices:', error);
      return getDefaultVoices();
    }

    return data || getDefaultVoices();
  } catch (error) {
    console.error('Error fetching voices:', error);
    return getDefaultVoices();
  }
}

function getDefaultVoices(): PoeticVoice[] {
  return [
    {
      id: 'default-greg',
      name: 'Greg',
      slug: 'greg',
      language_code: 'en',
      tts_provider: 'openai',
      tts_voice_id: 'alloy',
      style_instructions: 'Stream-of-consciousness style with concrete campus details.',
      sample_corpus: null,
    },
  ];
}

/**
 * React hook for managing current voice
 */
export function useVoiceManager() {
  const [currentVoiceSlug, setCurrentVoiceSlugState] = useState<string>(() => {
    // Load from localStorage or use default
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return stored;
    }
    return DEFAULT_VOICE_SLUG;
  });

  const [availableVoices, setAvailableVoices] = useState<PoeticVoice[]>([]);

  // Load available voices on mount
  useEffect(() => {
    getAvailableVoices().then(setAvailableVoices);
  }, []);

  const setCurrentVoiceSlug = useCallback((slug: string) => {
    setCurrentVoiceSlugState(slug);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, slug);
    }
  }, []);

  const cycleVoiceSlug = useCallback(() => {
    if (availableVoices.length === 0) {
      getAvailableVoices().then((voices) => {
        setAvailableVoices(voices);
        if (voices.length > 0) {
          const currentIndex = voices.findIndex((v) => v.slug === currentVoiceSlug);
          const nextIndex = (currentIndex + 1) % voices.length;
          setCurrentVoiceSlug(voices[nextIndex].slug);
        }
      });
    } else {
      const currentIndex = availableVoices.findIndex((v) => v.slug === currentVoiceSlug);
      const nextIndex = (currentIndex + 1) % availableVoices.length;
      setCurrentVoiceSlug(availableVoices[nextIndex].slug);
    }
  }, [availableVoices, currentVoiceSlug, setCurrentVoiceSlug]);

  const getCurrentVoice = useCallback((): PoeticVoice | null => {
    return availableVoices.find((v) => v.slug === currentVoiceSlug) || null;
  }, [availableVoices, currentVoiceSlug]);

  return {
    currentVoiceSlug,
    setCurrentVoiceSlug,
    cycleVoiceSlug,
    getCurrentVoice,
    availableVoices,
  };
}

