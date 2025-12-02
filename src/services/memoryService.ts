import { OpenAIService } from './openaiService';
import { RunwareService } from './runwareService';
import { databaseService } from './databaseService';
import { toast } from 'sonner';
import type { Database } from '../integrations/supabase/types';

type JournalEntry = Database['public']['Tables']['journal_entries']['Row']
type GeneratedMemory = Database['public']['Tables']['generated_memories']['Row']

interface GenerateMemoryParams {
  entryId: string;
  generateImage?: boolean;
}

export class MemoryService {
  private openaiService: OpenAIService;
  private runwareService: RunwareService;

  constructor() {
    this.openaiService = new OpenAIService();
    this.runwareService = new RunwareService();
  }

  async generateMemory(params: GenerateMemoryParams): Promise<GeneratedMemory | null> {
    const entry = await databaseService.getJournalEntry(params.entryId);
    if (!entry) {
      toast.error('Journal entry not found');
      return null;
    }

    try {
      toast.loading('Generating your memory story...', { id: 'memory-generation' });

      // Step 1: Generate long-winded story using OpenAI
      const storyResult = await this.openaiService.generateStory({
        title: entry.title,
        content: entry.content,
        type: entry.entry_type,
        mediaDescriptions: this.extractMediaDescriptions(entry)
      });

      if (!storyResult.story) {
        throw new Error('Failed to generate story');
      }

      toast.success('Story generated!', { id: 'memory-generation' });
      toast.loading('Generating audio narration...', { id: 'audio-generation' });

      // Step 2: Generate audio dictation of the story using OpenAI TTS
      let audioUrl: string | undefined;
      try {
        audioUrl = await this.generateAudioNarration(storyResult.story);
        toast.success('Audio narration completed!', { id: 'audio-generation' });
      } catch (error) {
        console.error('Audio generation failed:', error);
        toast.error('Audio generation failed', { id: 'audio-generation' });
      }

      toast.loading('Creating dreamy visual representation...', { id: 'image-generation' });

      // Step 3: Generate video directly from story using Runway (skip image step for now)
      let videoUrl: string | undefined;
      
      try {
        const videoPrompt = this.createDreamyImagePrompt(storyResult.story, entry);
        console.log('Generating video with prompt:', videoPrompt);
        
        const videoResult = await this.runwareService.generateImage({
          prompt: videoPrompt,
          style: 'dreamy, ethereal, nostalgic, soft lighting, memory-like quality, cinematic'
        });
        videoUrl = videoResult.imageUrl; // This is actually a video URL from Runway
        toast.success('Living memory video created!', { id: 'image-generation' });
        
      } catch (error) {
        console.error('Video generation failed:', error);
        toast.error('Video generation failed, but story and audio were created', { id: 'image-generation' });
      }

      // Step 4: Save integrated memory to database
      const memory = await databaseService.upsertGeneratedMemory(params.entryId, {
        story: storyResult.story,
        audio_url: audioUrl,
        video_url: videoUrl, // Direct video from text-to-video
        status: 'generated',
        generation_prompt: this.createDreamyImagePrompt(storyResult.story, entry)
      });

      if (!memory) {
        toast.error('Failed to save memory to database');
        return null;
      }

      toast.success('Complete memory experience generated successfully!', { id: 'memory-generation' });
      return memory;

    } catch (error) {
      console.error('Memory generation error:', error);
      toast.error('Failed to generate memory. Please try again.', { id: 'memory-generation' });
      return null;
    }
  }

  private async generateAudioNarration(story: string): Promise<string> {
    console.log('Starting audio generation...');
    
    // Call OpenAI TTS API through edge function
    const response = await fetch(`${await this.getSupabaseUrl()}/functions/v1/generate-audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await this.getAuthToken()}`,
      },
      body: JSON.stringify({
        text: story,
        voice: 'alloy', // Warm, engaging voice for storytelling
      }),
    });

    console.log('Audio generation response status:', response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error('Audio generation error:', error);
      throw new Error(error.error || 'Failed to generate audio narration');
    }

    const result = await response.json();
    console.log('Audio generation result:', result);
    return result.audioUrl;
  }

  private async generateVideoFromImage(imageUrl: string, story: string): Promise<string> {
    // Use Runway image-to-video API
    const response = await fetch(`${this.getSupabaseUrl()}/functions/v1/generate-video-from-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await this.getAuthToken()}`,
      },
      body: JSON.stringify({
        imageUrl,
        prompt: `Bring this dreamy memory to life with gentle, flowing movement. ${this.extractMovementPrompt(story)}`,
        duration: 5,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to start video generation from image');
    }

    const result = await response.json();
    
    // Poll for completion
    return await this.pollVideoFromImageStatus(result.videoId);
  }

  private async pollVideoFromImageStatus(videoId: string): Promise<string> {
    const maxAttempts = 30;
    const intervalMs = 5000;

    console.log(`Starting to poll image-to-video status for ID: ${videoId}`)

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(`${this.getSupabaseUrl()}/functions/v1/generate-video-from-image?id=${videoId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      });

      const result = await response.json();
      console.log(`Image-to-video poll attempt ${attempt + 1}:`, result)
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to check video generation status');
      }

      if (result.status === 'completed' && result.videoUrl) {
        console.log('Image-to-video generation completed! URL:', result.videoUrl)
        return result.videoUrl;
      }

      if (result.status === 'failed') {
        throw new Error('Image-to-video generation failed');
      }

      // Wait before next poll
      if (attempt < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }

    throw new Error('Image-to-video generation timed out');
  }

  private extractMovementPrompt(story: string): string {
    // Extract key elements that should have gentle movement
    const movementWords = ['wind', 'flowing', 'gentle', 'soft', 'peaceful', 'calm', 'serene'];
    const storyLower = story.toLowerCase();
    
    let movementPrompt = 'subtle, gentle movement';
    
    if (storyLower.includes('wind') || storyLower.includes('breeze')) {
      movementPrompt += ', leaves gently swaying';
    }
    if (storyLower.includes('water') || storyLower.includes('ocean') || storyLower.includes('lake')) {
      movementPrompt += ', water softly rippling';
    }
    if (storyLower.includes('cloud') || storyLower.includes('sky')) {
      movementPrompt += ', clouds slowly drifting';
    }
    
    return movementPrompt;
  }

  private async getSupabaseUrl(): Promise<string> {
    return "https://qhbrnotooiutpwwtadlx.supabase.co";
  }

  private async getAuthToken(): Promise<string> {
    const { supabase } = await import('../integrations/supabase/client');
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  }

  private extractMediaDescriptions(entry: JournalEntry): string[] {
    const descriptions: string[] = [];
    
    if (entry.media_files) {
      const mediaFiles = entry.media_files as any[];
      mediaFiles.forEach(file => {
        if (file.type?.startsWith('image/')) {
          descriptions.push(`image: ${file.name}`);
        } else if (file.type?.startsWith('video/')) {
          descriptions.push(`video: ${file.name}`);
        }
      });
    }
    
    return descriptions;
  }

  private createDreamyImagePrompt(story: string, entry: JournalEntry): string {
    // Extract key visual elements from the story
    const storyWords = story.split(' ');
    const visualKeywords = this.extractVisualElements(story);
    
    // Create a dreamy, artistic prompt focusing on key story elements
    const basePrompt = `A dreamy, ethereal memory visualization featuring ${visualKeywords.join(', ')}`;
    
    // Add the emotional context from the original entry
    const moodContext = entry.mood ? `, with a ${entry.mood} emotional atmosphere` : '';
    
    // Add cinematic and artistic styling
    const stylePrompt = ', soft focus, golden hour lighting, painted in watercolor style, nostalgic and serene, floating elements, gentle atmosphere';
    
    return `${basePrompt}${moodContext}${stylePrompt}`;
  }

  private extractVisualElements(story: string): string[] {
    // Extract concrete nouns and visual elements from the story
    const visualWords = [
      'coffee', 'mug', 'cup', 'beach', 'ocean', 'tree', 'forest', 'mountain', 'sky', 'cloud',
      'sunset', 'sunrise', 'flower', 'garden', 'house', 'room', 'window', 'door', 'path',
      'bridge', 'river', 'lake', 'bird', 'butterfly', 'leaf', 'branch', 'stone', 'sand',
      'light', 'shadow', 'reflection', 'rain', 'snow', 'wind', 'fire', 'candle', 'moon',
      'star', 'book', 'chair', 'table', 'car', 'bicycle', 'boat', 'plane', 'train'
    ];
    
    const storyLower = story.toLowerCase();
    const foundElements = visualWords.filter(word => storyLower.includes(word));
    
    // If no specific elements found, use more general descriptors
    if (foundElements.length === 0) {
      return ['peaceful landscape', 'gentle atmosphere', 'serene environment'];
    }
    
    return foundElements.slice(0, 5); // Limit to 5 key elements
  }

  private createImagePrompt(entry: JournalEntry): string {
    // Legacy method - keeping for compatibility
    const basePrompt = `A memory visualization of: ${entry.title}`;
    const contentWords = entry.content.split(' ').slice(0, 20).join(' ');
    const contextPrompt = `Scene inspired by: ${contentWords}`;
    return `${basePrompt}. ${contextPrompt}`;
  }

  hasValidConfiguration(): boolean {
    return true; // Always true since we're using Edge Functions
  }

  canGenerateImages(): boolean {
    return true; // Always true since we're using Edge Functions
  }
}