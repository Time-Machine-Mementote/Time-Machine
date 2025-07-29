import { supabase } from '../integrations/supabase/client'

// Types for story generation
export interface StoryGenerationRequest {
  journalEntry: string
  model?: 'gpt-4' | 'gpt-3.5-turbo' | 'text-davinci-003'
  maxTokens?: number
  temperature?: number
}

export interface StoryGenerationResponse {
  success: boolean
  story?: string
  model?: string
  usage?: {
    maxTokens: number
    temperature: number
  }
  error?: string
}

// Types for video generation
export interface VideoGenerationRequest {
  prompt: string
  negativePrompt?: string
  width?: number
  height?: number
  numFrames?: number
  fps?: number
  guidanceScale?: number
  seed?: number
}

export interface VideoGenerationResponse {
  success: boolean
  videoId?: string
  status?: string
  message?: string
  error?: string
}

export interface VideoStatusResponse {
  success: boolean
  status?: string
  videoUrl?: string
  error?: string
}

export class EdgeFunctionService {
  private supabaseUrl: string

  constructor() {
    this.supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
  }

  /**
   * Generate a story using the OpenAI Edge Function
   */
  async generateStory(request: StoryGenerationRequest): Promise<StoryGenerationResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`${this.supabaseUrl}/functions/v1/generate-story`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
        },
        body: JSON.stringify(request),
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate story')
      }

      return result
    } catch (error) {
      console.error('Error generating story:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Generate a video using the Runway Edge Function
   */
  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`${this.supabaseUrl}/functions/v1/generate-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
        },
        body: JSON.stringify(request),
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate video')
      }

      return result
    } catch (error) {
      console.error('Error generating video:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Check the status of a video generation
   */
  async checkVideoStatus(videoId: string): Promise<VideoStatusResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`${this.supabaseUrl}/functions/v1/generate-image?id=${videoId}`, {
        method: 'GET',
        headers: {
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
        },
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to check video status')
      }

      return result
    } catch (error) {
      console.error('Error checking video status:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Poll video status until completion
   */
  async pollVideoStatus(videoId: string, maxAttempts: number = 30, intervalMs: number = 5000): Promise<VideoStatusResponse> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await this.checkVideoStatus(videoId)
      
      if (!status.success) {
        return status
      }

      if (status.status === 'completed' && status.videoUrl) {
        return status
      }

      if (status.status === 'failed') {
        return {
          success: false,
          error: 'Video generation failed'
        }
      }

      // Wait before next poll
      if (attempt < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, intervalMs))
      }
    }

    return {
      success: false,
      error: 'Video generation timed out'
    }
  }

  /**
   * Generate a story with enhanced prompt for video generation
   */
  async generateStoryForVideo(journalEntry: string): Promise<StoryGenerationResponse> {
    const enhancedRequest: StoryGenerationRequest = {
      journalEntry,
      model: 'gpt-4',
      maxTokens: 300,
      temperature: 0.8,
    }

    return this.generateStory(enhancedRequest)
  }

  /**
   * Generate a video based on a journal entry
   */
  async generateVideoFromJournal(journalEntry: string): Promise<VideoGenerationResponse> {
    try {
      // First generate a story to create a better video prompt
      const storyResponse = await this.generateStoryForVideo(journalEntry)
      
      if (!storyResponse.success || !storyResponse.story) {
        return {
          success: false,
          error: 'Failed to generate story for video prompt'
        }
      }

      // Create a video prompt based on the story
      const videoPrompt = this.createVideoPromptFromStory(storyResponse.story)
      
      const videoRequest: VideoGenerationRequest = {
        prompt: videoPrompt,
        negativePrompt: 'blurry, low quality, distorted, ugly, bad anatomy',
        width: 1024,
        height: 1024,
        numFrames: 24,
        fps: 8,
        guidanceScale: 7.5,
      }

      return this.generateVideo(videoRequest)
    } catch (error) {
      console.error('Error generating video from journal:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Create a video prompt from a story
   */
  private createVideoPromptFromStory(story: string): string {
    // Extract key visual elements from the story
    const visualKeywords = [
      'dreamy', 'nostalgic', 'soft lighting', 'vintage aesthetic',
      'warm colors', 'emotional', 'memory-like', 'cinematic',
      'beautiful', 'atmospheric', 'gentle', 'peaceful'
    ].join(', ')

    // Take the first few sentences of the story and enhance with visual keywords
    const storyPreview = story.split('.').slice(0, 2).join('.') + '.'
    
    return `${storyPreview} ${visualKeywords}, high quality, detailed, emotional storytelling`
  }
}

// Export a singleton instance
export const edgeFunctionService = new EdgeFunctionService() 