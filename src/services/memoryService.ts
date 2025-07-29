import { OpenAIService } from './openaiService';
import { RunwareService } from './runwareService';
import { journalStorage, type JournalEntry, type GeneratedMemory } from '@/utils/journalStorage';
import { toast } from 'sonner';

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

    const entry = journalStorage.getEntry(params.entryId);
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

      const memory: GeneratedMemory = {
        id: crypto.randomUUID(),
        entryId: params.entryId,
        story: storyResult.story,
        audioUrl: storyResult.audioUrl,
        imageUrl,
        createdAt: new Date().toISOString()
      };

      // Save memory to entry
      journalStorage.updateEntry(params.entryId, {
        generatedMemory: memory,
        memoryGenerated: true
      });

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
    
    if (entry.mediaFiles) {
      entry.mediaFiles.forEach(file => {
        if (file.type.startsWith('image/')) {
          descriptions.push(`image: ${file.name}`);
        } else if (file.type.startsWith('video/')) {
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