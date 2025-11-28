import { useState, useRef, useCallback } from 'react';
import { Mic, Square, Play, Pause, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: string) => void;
  existingRecording?: string;
  onRecordingStateChange?: (isRecording: boolean) => void;
}

const VoiceRecorder = ({ onRecordingComplete, existingRecording, onRecordingStateChange }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasRecording, setHasRecording] = useState(!!existingRecording);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      // Check if MediaRecorder is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Your browser does not support audio recording. Please use a modern browser like Chrome, Firefox, or Edge.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100 
        } 
      });
      
      // Check for supported mime types
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = ''; // Let browser choose
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          onRecordingComplete(base64Audio);
          setHasRecording(true);
        };
        reader.readAsDataURL(audioBlob);
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);
      onRecordingStateChange?.(true);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(time => time + 1);
      }, 1000);

    } catch (error: any) {
      console.error('Error starting recording:', error);
      let errorMessage = 'Could not access microphone. ';
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage += 'Please allow microphone access in your browser settings.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage += 'No microphone found. Please connect a microphone.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage += 'Your browser does not support audio recording.';
      } else {
        errorMessage += error.message || 'Please check your browser permissions.';
      }
      alert(errorMessage);
    }
  }, [onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      onRecordingStateChange?.(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording, onRecordingStateChange]);

  const playRecording = useCallback(() => {
    if (existingRecording && !audioRef.current) {
      audioRef.current = new Audio(existingRecording);
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.onerror = () => {
        console.error('Error playing audio');
        setIsPlaying(false);
      };
    }

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            console.error('Error playing audio');
            setIsPlaying(false);
          });
      }
    }
  }, [existingRecording, isPlaying]);

  const deleteRecording = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setHasRecording(false);
    setRecordingTime(0);
    onRecordingComplete('');
  }, [onRecordingComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center gap-3">
        {!hasRecording ? (
          <Button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            size="lg"
            variant="outline"
            className={`flex-1 font-robotic rounded-none border-2 ${
              isRecording 
                ? 'bg-white text-black border-black hover:bg-white hover:text-black' 
                : 'bg-black text-white border-white hover:bg-black hover:text-white'
            }`}
            style={{ borderRadius: '0' }}
          >
            <Mic className="w-5 h-5 mr-2" />
            record
          </Button>
        ) : (
          <>
            <Button
              onClick={playRecording}
              variant="outline"
              size="lg"
              className="flex-1"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-5 h-5 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Play
                </>
              )}
            </Button>
            <Button
              onClick={deleteRecording}
              variant="ghost"
              size="lg"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </>
        )}
      </div>

      {isRecording && (
        <div className="flex items-center justify-center space-x-1">
          <div className="w-2 h-2 bg-destructive rounded-full animate-pulse"></div>
          <span className="text-sm text-muted-foreground">Recording...</span>
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;