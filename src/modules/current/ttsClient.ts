// The Current: TTS client abstraction (provider-agnostic)

import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://qhbrnotooiutpwwtadlx.supabase.co';

export type TTSOptions = {
  voiceSlug?: string;
  languageCode?: string;
  speed?: number;
};

/**
 * Synthesize speech from text using the configured TTS provider
 * Returns a URL or data URL for audio playback
 */
export async function synthesizeSpeech(
  text: string,
  options: TTSOptions = {}
): Promise<string> {
  if (!SUPABASE_URL) {
    throw new Error('Supabase URL is not configured');
  }

  try {
    console.log('📞 Calling TTS endpoint...', { textLength: text.length, voice: options.voiceSlug || 'alloy' });
    
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    // Use the existing generate-audio edge function
    const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify({
        text,
        voice: options.voiceSlug || 'alloy', // Default voice
        model: 'tts-1',
        response_format: 'mp3',
        speed: options.speed || 1.0,
      }),
    });

    console.log('📡 TTS response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ TTS error response:', errorText);
      throw new Error(`TTS generation failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('📦 TTS response:', { 
      success: result.success, 
      hasAudioUrl: !!result.audioUrl,
      audioUrlLength: result.audioUrl?.length || 0 
    });
    
    if (!result.success || !result.audioUrl) {
      console.error('❌ Invalid TTS response:', result);
      throw new Error('Invalid response from TTS endpoint');
    }

    return result.audioUrl;
  } catch (error) {
    console.error('❌ Failed to synthesize speech:', error);
    throw error;
  }
}

/**
 * Fallback to browser TTS if backend TTS fails
 */
export function synthesizeSpeechNative(
  text: string,
  options: TTSOptions = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Browser TTS not supported'));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options.languageCode || 'en-US';
    utterance.rate = options.speed || 1.0;

    utterance.onend = () => resolve();
    utterance.onerror = (error) => reject(error);

    window.speechSynthesis.speak(utterance);
  });
}

