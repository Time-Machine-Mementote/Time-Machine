interface RunwareServiceConfig {
  apiKey: string;
}

interface GenerateImageParams {
  prompt: string;
  style?: string;
}

interface GeneratedImage {
  imageUrl: string;
  prompt: string;
}

export class RunwareService {
  private apiKey: string;
  private baseUrl = 'https://api.runware.ai/v1';

  constructor(config: RunwareServiceConfig) {
    this.apiKey = config.apiKey;
  }

  async generateImage(params: GenerateImageParams): Promise<GeneratedImage> {
    const enhancedPrompt = this.enhancePrompt(params.prompt, params.style);
    
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          {
            taskType: 'authentication',
            apiKey: this.apiKey
          },
          {
            taskType: 'imageInference',
            taskUUID: crypto.randomUUID(),
            positivePrompt: enhancedPrompt,
            model: 'runware:100@1',
            width: 1024,
            height: 1024,
            numberResults: 1,
            outputFormat: 'WEBP',
            CFGScale: 7,
            steps: 4,
            scheduler: 'FlowMatchEulerDiscreteScheduler'
          }
        ])
      });

      if (!response.ok) {
        throw new Error(`Runware API error: ${response.status}`);
      }

      const data = await response.json();
      const imageData = data.data?.find((item: any) => item.taskType === 'imageInference');
      
      if (!imageData?.imageURL) {
        throw new Error('No image generated');
      }

      return {
        imageUrl: imageData.imageURL,
        prompt: enhancedPrompt
      };
    } catch (error) {
      console.error('Error generating image:', error);
      throw new Error('Failed to generate image. Please check your API key and try again.');
    }
  }

  private enhancePrompt(basePrompt: string, style?: string): string {
    const styleModifier = style || 'dreamy, nostalgic, soft lighting, vintage aesthetic';
    return `${basePrompt}, ${styleModifier}, high quality, detailed, emotional, memory-like quality`;
  }

  static hasValidApiKey(): boolean {
    try {
      const keys = localStorage.getItem('timemashin_api_keys');
      const parsed = keys ? JSON.parse(keys) : null;
      return !!(parsed?.runwareKey);
    } catch {
      return false;
    }
  }
}