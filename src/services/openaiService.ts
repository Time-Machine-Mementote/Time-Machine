interface OpenAIServiceConfig {
  apiKey: string;
}

interface GenerateStoryParams {
  title: string;
  content: string;
  type: 'text' | 'voice' | 'media';
  mediaDescriptions?: string[];
}

interface GeneratedStory {
  story: string;
  audioUrl?: string;
}

export class OpenAIService {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';

  constructor(config: OpenAIServiceConfig) {
    this.apiKey = config.apiKey;
  }

  async generateStory(params: GenerateStoryParams): Promise<GeneratedStory> {
    const prompt = this.createStoryPrompt(params);
    
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-2025-04-14',
          messages: [
            {
              role: 'system',
              content: 'You are a creative storyteller who transforms personal journal entries into beautiful, nostalgic narratives. Write in second person ("you") to create an immersive memory experience. Keep stories between 100-200 words, emotionally resonant, and capture the essence of the moment.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: 300
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const story = data.choices[0]?.message?.content || '';

      // Generate audio for the story
      const audioUrl = await this.generateAudio(story);

      return {
        story,
        audioUrl
      };
    } catch (error) {
      console.error('Error generating story:', error);
      throw new Error('Failed to generate story. Please check your API key and try again.');
    }
  }

  private async generateAudio(text: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/audio/speech`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice: 'nova',
          response_format: 'mp3'
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI TTS error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      return URL.createObjectURL(audioBlob);
    } catch (error) {
      console.error('Error generating audio:', error);
      return '';
    }
  }

  private createStoryPrompt(params: GenerateStoryParams): string {
    let prompt = `Transform this journal entry into a beautiful, nostalgic story written in second person:\n\n`;
    prompt += `Title: ${params.title}\n`;
    prompt += `Content: ${params.content}\n`;
    prompt += `Entry Type: ${params.type}\n`;

    if (params.mediaDescriptions && params.mediaDescriptions.length > 0) {
      prompt += `\nVisual elements described: ${params.mediaDescriptions.join(', ')}\n`;
    }

    prompt += `\nCreate a warm, immersive narrative that captures the emotion and essence of this moment. Focus on sensory details and the feelings associated with this memory.`;

    return prompt;
  }

  static getApiKeys(): { openaiKey: string; runwareKey: string } | null {
    try {
      const keys = localStorage.getItem('timemashin_api_keys');
      return keys ? JSON.parse(keys) : null;
    } catch {
      return null;
    }
  }

  static hasValidApiKey(): boolean {
    const keys = this.getApiKeys();
    return !!(keys?.openaiKey);
  }
}