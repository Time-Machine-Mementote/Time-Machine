import { useState, useCallback } from 'react'
import { 
  edgeFunctionService, 
  StoryGenerationRequest, 
  VideoGenerationRequest,
  StoryGenerationResponse,
  VideoGenerationResponse,
  VideoStatusResponse
} from '../services/edgeFunctionService'

interface UseStoryGeneration {
  generateStory: (request: StoryGenerationRequest) => Promise<StoryGenerationResponse>
  isLoading: boolean
  error: string | null
  resetError: () => void
}

interface UseVideoGeneration {
  generateVideo: (request: VideoGenerationRequest) => Promise<VideoGenerationResponse>
  checkStatus: (videoId: string) => Promise<VideoStatusResponse>
  pollStatus: (videoId: string) => Promise<VideoStatusResponse>
  generateFromJournal: (journalEntry: string) => Promise<VideoGenerationResponse>
  isLoading: boolean
  error: string | null
  resetError: () => void
}

export function useStoryGeneration(): UseStoryGeneration {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateStory = useCallback(async (request: StoryGenerationRequest): Promise<StoryGenerationResponse> => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await edgeFunctionService.generateStory(request)
      
      if (!result.success) {
        setError(result.error || 'Failed to generate story')
      }
      
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      return {
        success: false,
        error: errorMessage
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const resetError = useCallback(() => {
    setError(null)
  }, [])

  return {
    generateStory,
    isLoading,
    error,
    resetError
  }
}

export function useVideoGeneration(): UseVideoGeneration {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateVideo = useCallback(async (request: VideoGenerationRequest): Promise<VideoGenerationResponse> => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await edgeFunctionService.generateVideo(request)
      
      if (!result.success) {
        setError(result.error || 'Failed to generate video')
      }
      
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      return {
        success: false,
        error: errorMessage
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const checkStatus = useCallback(async (videoId: string): Promise<VideoStatusResponse> => {
    try {
      return await edgeFunctionService.checkVideoStatus(videoId)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      return {
        success: false,
        error: errorMessage
      }
    }
  }, [])

  const pollStatus = useCallback(async (videoId: string): Promise<VideoStatusResponse> => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await edgeFunctionService.pollVideoStatus(videoId)
      
      if (!result.success) {
        setError(result.error || 'Failed to get video status')
      }
      
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      return {
        success: false,
        error: errorMessage
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const generateFromJournal = useCallback(async (journalEntry: string): Promise<VideoGenerationResponse> => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await edgeFunctionService.generateVideoFromJournal(journalEntry)
      
      if (!result.success) {
        setError(result.error || 'Failed to generate video from journal')
      }
      
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      return {
        success: false,
        error: errorMessage
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const resetError = useCallback(() => {
    setError(null)
  }, [])

  return {
    generateVideo,
    checkStatus,
    pollStatus,
    generateFromJournal,
    isLoading,
    error,
    resetError
  }
}

// Combined hook for both story and video generation
export function useEdgeFunctions() {
  const storyHook = useStoryGeneration()
  const videoHook = useVideoGeneration()

  return {
    story: storyHook,
    video: videoHook,
    isLoading: storyHook.isLoading || videoHook.isLoading,
    error: storyHook.error || videoHook.error,
    resetError: () => {
      storyHook.resetError()
      videoHook.resetError()
    }
  }
} 