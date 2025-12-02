import { supabase } from '../integrations/supabase/client'

interface GenerateImageParams {
  prompt: string;
  style?: string;
}

interface GeneratedImage {
  imageUrl: string;
  prompt: string;
}

export class RunwareService {
  private supabaseUrl: string;

  constructor() {
    this.supabaseUrl = "https://qhbrnotooiutpwwtadlx.supabase.co";
  }

  async generateImage(params: GenerateImageParams): Promise<GeneratedImage> {
    const enhancedPrompt = this.enhancePrompt(params.prompt, params.style);
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      console.log('Starting video generation with prompt:', enhancedPrompt)
      
      const response = await fetch(`${this.supabaseUrl}/functions/v1/generate-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
        },
        body: JSON.stringify({
          prompt: enhancedPrompt,
          negativePrompt: 'blurry, low quality, distorted, ugly, bad anatomy',
          width: 1024,
          height: 1024,
          numFrames: 24,
          fps: 8,
          guidanceScale: 7.5,
        }),
      });

      const result = await response.json();
      console.log('Video generation response:', result)
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate video');
      }

      if (!result.success || !result.videoId) {
        throw new Error('No video generated');
      }

      console.log('Video generation started, polling for completion...')
      // Poll for completion
      const videoUrl = await this.pollVideoStatus(result.videoId);

      return {
        imageUrl: videoUrl,
        prompt: enhancedPrompt
      };
    } catch (error) {
      console.error('Error generating video:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to generate video: ${error.message}`);
      }
      throw new Error('Failed to generate video. Please try again.');
    }
  }

  private async pollVideoStatus(videoId: string): Promise<string> {
    const maxAttempts = 30;
    const intervalMs = 5000;

    console.log(`Starting to poll video status for ID: ${videoId}`)

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`${this.supabaseUrl}/functions/v1/generate-image?id=${videoId}`, {
        method: 'GET',
        headers: {
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
        },
      });

      const result = await response.json();
      console.log(`Poll attempt ${attempt + 1}:`, result)
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to check video status');
      }

      if (result.status === 'completed' && result.videoUrl) {
        console.log('Video generation completed! URL:', result.videoUrl)
        return result.videoUrl;
      }

      if (result.status === 'failed') {
        throw new Error('Video generation failed');
      }

      // Wait before next poll
      if (attempt < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }

    throw new Error('Video generation timed out');
  }

  private enhancePrompt(basePrompt: string, style?: string): string {
    const styleModifier = style || 'dreamy, nostalgic, soft lighting, vintage aesthetic';
    return `${basePrompt}, ${styleModifier}, high quality, detailed, emotional, memory-like quality`;
  }

  static hasValidApiKey(): boolean {
    // Always return true since we're using Edge Functions
    return true;
  }
}