import { useState, useRef, useCallback } from 'react';

interface UseRecorderOptions {
  onRecordingComplete: (audioBlob: Blob) => void;
}

interface UseRecorderReturn {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  error: string | null;
}

/**
 * Hook for recording audio using MediaRecorder API
 */
export function useRecorder({ onRecordingComplete }: UseRecorderOptions): UseRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      // Check if MediaRecorder is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support audio recording. Please use a modern browser like Chrome, Firefox, or Edge.');
      }

      // Request microphone access with improved audio constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
          sampleRate: 44100 
        } 
      });
      
      streamRef.current = stream;
      
      // Check for supported mime types (prefer Opus for better quality)
      const preferredTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
      ];
      
      const mimeType = preferredTypes.find(t => MediaRecorder.isTypeSupported(t)) || '';
      
      // Log selected mimeType for debugging (dev only)
      if (import.meta.env.DEV) {
        console.log('[recorder] Selected mimeType:', mimeType || 'browser default');
      }
      
      // Create MediaRecorder with higher bitrate for better quality
      let mediaRecorder: MediaRecorder;
      try {
        const options: MediaRecorderOptions = {
          audioBitsPerSecond: 192000, // Higher bitrate for better quality
        };
        
        if (mimeType) {
          options.mimeType = mimeType;
        }
        
        mediaRecorder = new MediaRecorder(stream, options);
        
        if (import.meta.env.DEV) {
          console.log('[recorder] Audio bitrate:', options.audioBitsPerSecond);
        }
      } catch (error) {
        // Fallback to default constructor if options fail
        console.warn('[recorder] Failed to create with options, using default:', error);
        mediaRecorder = new MediaRecorder(stream);
      }
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Use the actual mimeType from the recorder for the blob
        const blobType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(chunksRef.current, { type: blobType });
        onRecordingComplete(audioBlob);
        
        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);

    } catch (err: any) {
      console.error('Error starting recording:', err);
      let errorMessage = 'Could not access microphone. ';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage += 'Please allow microphone access in your browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage += 'No microphone found. Please connect a microphone.';
      } else if (err.name === 'NotSupportedError') {
        errorMessage += 'Your browser does not support audio recording.';
      } else {
        errorMessage += err.message || 'Please check your browser permissions.';
      }
      setError(errorMessage);
      setIsRecording(false);
    }
  }, [onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    error,
  };
}

