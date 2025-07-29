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
        type: entry.type,
        mediaDescriptions: this.extractMediaDescriptions(entry)
      });

      // Generate image if requested
      let imageUrl: string | undefined;
      if (params.generateImage) {
        try {
          const imagePrompt = this.createImagePrompt(entry);
          const imageResult = await this.runwareService.generateImage({
            prompt: imagePrompt,
            style: 'nostalgic memory, dreamy, soft focus'
          });
          imageUrl = imageResult.imageUrl;
        } catch (error) {
          console.error('Image generation failed:', error);
          // Continue without image if generation fails
        }
      }

      // Save memory to database
      const memory = await databaseService.upsertGeneratedMemory(params.entryId, {
        story: storyResult.story,
        audio_url: storyResult.audioUrl,
        image_url: imageUrl,
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