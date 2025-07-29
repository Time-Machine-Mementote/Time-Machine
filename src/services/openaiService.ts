import { supabase } from '../integrations/supabase/client'

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
  private supabaseUrl: string;

  constructor() {
    this.supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  }

  async generateStory(params: GenerateStoryParams): Promise<GeneratedStory> {
    const journalEntry = this.createStoryPrompt(params);
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`${this.supabaseUrl}/functions/v1/generate-story`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
        },
        body: JSON.stringify({
          journalEntry,
          model: 'gpt-4',
          maxTokens: 300,
          temperature: 0.8
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate story');
      }

      if (!result.success || !result.story) {
        throw new Error('No story generated');
      }

      // Generate audio for the story (you can add a separate Edge Function for this)
      const audioUrl = await this.generateAudio(result.story);

      return {
        story: result.story,
        audioUrl
      };
    } catch (error) {
      console.error('Error generating story:', error);
      throw new Error('Failed to generate story. Please try again.');
    }
  }

  private async generateAudio(text: string): Promise<string> {
    // For now, return empty string. You can create a separate Edge Function for TTS
    // or use a client-side TTS solution
    try {
      // This would be a separate Edge Function call
      // const response = await fetch(`${this.supabaseUrl}/functions/v1/generate-audio`, ...)
      return '';
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

  static hasValidApiKey(): boolean {
    // Always return true since we're using Edge Functions
    return true;
  }
}