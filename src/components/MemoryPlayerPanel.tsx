// Memory Player Panel Component
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Play, Pause, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Memory } from '@/types/memory';

interface MemoryPlayerPanelProps {
  memory: Memory | null;
  onClose: () => void;
}

export function MemoryPlayerPanel({ memory, onClose }: MemoryPlayerPanelProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Resolve audio URL when memory changes
  useEffect(() => {
    if (!memory) {
      // Stop and cleanup audio when memory is cleared
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      setAudioUrl(null);
      setIsPlaying(false);
      setError(null);
      return;
    }

    const resolveAudioUrl = async () => {
      setIsLoading(true);
      setError(null);
      setAudioUrl(null);

      // Stop previous audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      try {
        if (!memory.audio_url) {
          setError('No audio attached to this memory.');
          setIsLoading(false);
          return;
        }

        let playableUrl = memory.audio_url;

        // If audio_url is already a full URL, use it directly
        if (playableUrl.startsWith('http://') || playableUrl.startsWith('https://')) {
          setAudioUrl(playableUrl);
          setIsLoading(false);
          return;
        }

        // If it's a storage path, convert to public URL
        // audio_url might be stored as: "public-input-only/file.webm" or "userId/file.webm"
        // Extract bucket and path
        if (playableUrl.includes('audio-memories')) {
          // Already contains bucket name, extract path
          const urlParts = playableUrl.split('audio-memories/');
          if (urlParts.length > 1) {
            const filePath = urlParts[1];
            const { data } = supabase.storage
              .from('audio-memories')
              .getPublicUrl(filePath);
            playableUrl = data?.publicUrl || playableUrl;
          }
        } else {
          // Assume it's a relative path in audio-memories bucket
          const { data } = supabase.storage
            .from('audio-memories')
            .getPublicUrl(playableUrl);
          playableUrl = data?.publicUrl || playableUrl;
        }

        setAudioUrl(playableUrl);
      } catch (err) {
        console.error('Error resolving audio URL:', err);
        setError(`Failed to load audio: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    resolveAudioUrl();
  }, [memory]);

  // Handle audio playback
  const handlePlayPause = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((err) => {
        console.error('Error playing audio:', err);
        setError(`Failed to play audio: ${err.message}`);
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  if (!memory) return null;

  return (
    <Card className="bg-black border-2 border-white">
      <CardHeader className="border-b border-white">
        <div className="flex items-center justify-between">
          <CardTitle className="font-terminal text-white text-sm">
            &gt; MEMORY_PLAYER
          </CardTitle>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white hover:text-black"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {/* Memory Info */}
        <div className="font-terminal text-white space-y-1 text-sm">
          <div className="font-semibold">
            {memory.summary || memory.place_name || 'Memory'}
          </div>
          <div className="text-gray-400 text-xs">
            Created: {new Date(memory.created_at).toLocaleDateString()}
          </div>
          {memory.place_name && (
            <div className="text-gray-400 text-xs">
              Location: {memory.place_name}
            </div>
          )}
        </div>

        {/* Audio Player */}
        <div className="space-y-2">
          {isLoading && (
            <div className="flex items-center gap-2 text-white text-sm font-terminal">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading audio...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm font-terminal">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {audioUrl && !error && (
            <>
              <audio
                ref={audioRef}
                src={audioUrl}
                onEnded={() => setIsPlaying(false)}
                onError={(e) => {
                  console.error('Audio playback error:', e);
                  setError('Failed to play audio file');
                  setIsPlaying(false);
                }}
                onLoadedData={() => {
                  // Audio loaded successfully
                }}
              />
              <Button
                onClick={handlePlayPause}
                className="w-full bg-white text-black font-terminal hover:bg-gray-200 border-2 border-white"
                disabled={isLoading}
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Play
                  </>
                )}
              </Button>
            </>
          )}

          {!audioUrl && !isLoading && !error && (
            <div className="text-gray-400 text-sm font-terminal">
              No audio available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
