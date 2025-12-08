// Add Memory Sheet Component
import React, { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { UserLocation } from '@/types/memory';
import VoiceRecorder from '@/components/VoiceRecorder';
import { uploadAudioToStorage } from '@/utils/audioStorage';
import { useAuth } from '@/contexts/AuthContext';

interface AddMemorySheetProps {
  isOpen: boolean;
  onClose: () => void;
  userLocation: UserLocation | null;
  userId?: string;
  onRecordingStateChange?: (isRecording: boolean) => void;
}

export function AddMemorySheet({ isOpen, onClose, userLocation, userId, onRecordingStateChange }: AddMemorySheetProps) {
  const { user, openAuthModal } = useAuth();
  const [audioBlob, setAudioBlob] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const hasSubmittedRef = useRef(false);

  // Reset when sheet closes
  useEffect(() => {
    if (!isOpen) {
      setAudioBlob('');
      setIsProcessing(false);
      hasSubmittedRef.current = false;
    }
  }, [isOpen]);

  // Auto-submit when recording is complete (only if audioBlob is not empty)
  useEffect(() => {
    if (audioBlob && audioBlob.trim() && !isProcessing && !hasSubmittedRef.current) {
      hasSubmittedRef.current = true;
      handleSubmit();
    } else if (!audioBlob || !audioBlob.trim()) {
      // Reset the ref if recording is deleted
      hasSubmittedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBlob]);

  const handleSubmit = async () => {
    if (!audioBlob) {
      return;
    }

    // Check authentication before submitting
    if (!user) {
      toast.error('Please sign in to save your memory');
      openAuthModal();
      return;
    }

    setIsProcessing(true);

    try {
      // Determine location to use
      const finalLat = userLocation?.lat || 37.8721; // Default to Berkeley campus
      const finalLng = userLocation?.lng || -122.2585;

      // Upload audio recording
      let audioUrl: string | null = null;
      if (audioBlob && user?.id) {
        try {
          // Convert base64 to Blob
          const base64Match = audioBlob.match(/^data:([^;]+);base64,(.+)$/);
          if (base64Match) {
            const mimeType = base64Match[1];
            const base64String = base64Match[2];
            const byteCharacters = atob(base64String);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const audioBlobFile = new Blob([byteArray], { type: mimeType });

            // Generate temp ID for upload
            const tempMemoryId = crypto.randomUUID();
            audioUrl = await uploadAudioToStorage(audioBlobFile, tempMemoryId, user.id);
            
            if (!audioUrl) {
              toast.warning('Audio upload failed. Please try again.');
              setIsProcessing(false);
              return;
            }
          }
        } catch (error) {
          console.error('Error uploading audio:', error);
          toast.error('Failed to upload audio. Please try again.');
          setIsProcessing(false);
          return;
        }
      }

      // Generate a simple place name from location or use default
      const placeName = userLocation 
        ? `Memory at ${finalLat.toFixed(4)}, ${finalLng.toFixed(4)}`
        : 'Berkeley Campus';

      // Create memory record
      const { data, error } = await supabase
        .from('memories')
        .insert({
          text: '[Voice recording]',
          lat: finalLat,
          lng: finalLng,
          place_name: placeName,
          privacy: 'public',
          summary: 'Voice recording',
          radius_m: 30,
          author_id: user.id,
          extracted_people: [],
          audio_url: audioUrl,
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Memory created successfully:', data);
      toast.success('Memory created successfully!');
      
      // Reset and close
      setAudioBlob('');
      onClose();
      
      // Refresh the page to show the new memory
      window.location.reload();
      
    } catch (error) {
      console.error('Failed to create memory:', error);
      toast.error('Failed to create memory. Please try again.');
      setAudioBlob('');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-auto max-h-[50vh] flex flex-col p-6">
        <div className="flex flex-col items-center justify-center space-y-4">
          {isProcessing ? (
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
              <p className="text-sm text-white font-terminal">Saving your memory...</p>
            </div>
          ) : (
            <VoiceRecorder
              onRecordingComplete={setAudioBlob}
              existingRecording={audioBlob}
              onRecordingStateChange={(recording) => {
                setIsRecording(recording);
                onRecordingStateChange?.(recording);
              }}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
