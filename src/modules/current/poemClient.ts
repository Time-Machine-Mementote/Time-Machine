// The Current: Client for requesting generative poetic lines

import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://qhbrnotooiutpwwtadlx.supabase.co';

export type PoemLineRequest = {
  userId: string | null;
  nodeSlug: string;
  voiceSlug: string;
  recentLineIds: string[];
};

export type PoemLineResponse = {
  line: string;
  lineId: string;
};

/**
 * Request a new generative poetic line from the backend
 */
export async function requestPoemLine(
  params: PoemLineRequest
): Promise<PoemLineResponse> {
  if (!SUPABASE_URL) {
    throw new Error('Supabase URL is not configured');
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/current-line`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify({
        userId: params.userId,
        nodeSlug: params.nodeSlug,
        voiceSlug: params.voiceSlug,
        recentLineIds: params.recentLineIds,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to generate poem line: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.success || !result.line || !result.lineId) {
      throw new Error('Invalid response from poem line endpoint');
    }

    return {
      line: result.line,
      lineId: result.lineId,
    };
  } catch (error) {
    console.error('Failed to request poem line:', error);
    
    // Exponential backoff retry (simple version)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to server. Please check your internet connection.');
    }
    
    throw error;
  }
}

