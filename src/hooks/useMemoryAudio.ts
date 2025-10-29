import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { synthesizeAudio } from '@/services/memoryApi';
import { formatMemoryForNarration } from '@/utils/memoryNarration';
import type { Memory } from '@/types/memory';
import { toast } from 'sonner';

interface UseMemoryAudioReturn {
  isGenerating: boolean;
  isPlaying: boolean;
  currentAudioUrl: string | null;
  playMemory: (memory: Memory) => Promise<void>;
  stopPlaying: () => void;
  generateAndPlay: (memory: Memory) => Promise<void>;
}

/**
 * Hook for managing memory audio generation and playback
 */
export function useMemoryAudio(): UseMemoryAudioReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element
  if (!audioRef.current) {
    audioRef.current = new Audio();
    audioRef.current.preload = 'none';
    
    audioRef.current.addEventListener('play', () => setIsPlaying(true));
    audioRef.current.addEventListener('pause', () => setIsPlaying(false));
    audioRef.current.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentAudioUrl(null);
    });
    audioRef.current.addEventListener('error', (e) => {
      console.error('Audio playback error:', e);
      setIsPlaying(false);
      toast.error('Failed to play audio');
    });
  }

  /**
   * Generates audio narration for a memory and plays it
   */
  const generateAndPlay = useCallback(async (memory: Memory) => {
    try {
      setIsGenerating(true);
      
      // If memory already has audio URL, use it
      if (memory.audio_url) {
        await playMemory(memory);
        setIsGenerating(false);
        return;
      }

      // Format memory for narration
      const narrationText = formatMemoryForNarration(memory);
      
      toast.loading('Generating audio narration...', { id: 'memory-audio' });

      // Generate audio using OpenAI TTS
      const { audioUrl } = await synthesizeAudio(narrationText, memory.id);
      
      if (!audioUrl) {
        throw new Error('Failed to generate audio');
      }

      // Update memory in database with audio URL if it's new
      if (!memory.audio_url) {
        const { error } = await supabase
          .from('memories')
          .update({ audio_url: audioUrl })
          .eq('id', memory.id);
        
        if (error) {
          console.warn('Failed to update memory with audio URL:', error);
        }
      }

      toast.success('Audio ready!', { id: 'memory-audio' });

      // Play the generated audio
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        await audioRef.current.play();
        setCurrentAudioUrl(audioUrl);
      }
    } catch (error) {
      console.error('Error generating audio:', error);
      toast.error('Failed to generate audio narration', { id: 'memory-audio' });
    } finally {
      setIsGenerating(false);
    }
  }, []);

  /**
   * Plays a memory's existing audio
   */
  const playMemory = useCallback(async (memory: Memory) => {
    try {
      let audioUrl = memory.audio_url;

      // If no audio URL, generate it first
      if (!audioUrl) {
        await generateAndPlay(memory);
        return;
      }

      // Stop any currently playing audio
      stopPlaying();

      // Play the audio
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        await audioRef.current.play();
        setCurrentAudioUrl(audioUrl);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      toast.error('Failed to play audio');
    }
  }, [generateAndPlay]);

  /**
   * Stops the currently playing audio
   */
  const stopPlaying = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentAudioUrl(null);
    }
  }, []);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
  }, []);

  return {
    isGenerating,
    isPlaying,
    currentAudioUrl,
    playMemory,
    stopPlaying,
    generateAndPlay,
  };
}

