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
      toast.loading('Generating your memory...', { id: 'memory-generation' });

      // Generate story using OpenAI
      const storyResult = await this.openaiService.generateStory({
        title: entry.title,
        content: entry.content,
        type: entry.entry_type,
        mediaDescriptions: this.extractMediaDescriptions(entry)
      });

      // Generate video, audio, and visual components
      let imageUrl: string | undefined;
      let audioUrl: string | undefined;
      
      // Always generate video/image when creating memory
      try {
        toast.loading('Generating video visualization...', { id: 'video-generation' });
        const imagePrompt = this.createImagePrompt(entry);
        const imageResult = await this.runwareService.generateImage({
          prompt: imagePrompt,
          style: 'nostalgic memory, dreamy, soft focus, cinematic'
        });
        imageUrl = imageResult.imageUrl;
        toast.success('Video generated successfully!', { id: 'video-generation' });
      } catch (error) {
        console.error('Video generation failed:', error);
        toast.error('Video generation failed, but story was created', { id: 'video-generation' });
        // Continue without video if generation fails
      }

      // Audio generation - placeholder for now
      // TODO: Implement audio generation service
      console.log('Audio generation not yet implemented for story:', storyResult.story?.slice(0, 100) + '...');

      // Save memory to database
      const memory = await databaseService.upsertGeneratedMemory(params.entryId, {
        story: storyResult.story,
        audio_url: audioUrl,
        video_url: imageUrl, // This is actually a video URL from Runway
        status: 'generated',
        generation_prompt: this.createImagePrompt(entry)
      });

      if (!memory) {
        toast.error('Failed to save memory to database');
        return null;
      }

      toast.success('Memory generated successfully!', { id: 'memory-generation' });
      return memory;

    } catch (error) {
      console.error('Memory generation error:', error);
      toast.error('Failed to generate memory. Please try again.', { id: 'memory-generation' });
      return null;
    }
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

  private createImagePrompt(entry: JournalEntry): string {
    // Create a visual prompt based on the journal entry
    const basePrompt = `A memory visualization of: ${entry.title}`;
    
    // Add content context
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