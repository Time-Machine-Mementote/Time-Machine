import { useState, useRef, useCallback } from 'react';
import { Mic, Square, Play, Pause, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: string) => void;
  existingRecording?: string;
}

const VoiceRecorder = ({ onRecordingComplete, existingRecording }: VoiceRecorderProps) => {
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
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100 
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
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

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(time => time + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  }, [onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

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
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-crimson font-semibold text-foreground">
          Voice Recording
        </h3>
        {(isRecording || hasRecording) && (
          <span className="text-sm text-muted-foreground">
            {formatTime(recordingTime)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {!hasRecording ? (
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            variant={isRecording ? "destructive" : "default"}
            size="lg"
            className={`flex-1 ${isRecording ? 'animate-pulse-glow' : 'btn-ethereal'}`}
          >
            {isRecording ? (
              <>
                <Square className="w-5 h-5 mr-2" />
                Stop Recording
              </>
            ) : (
              <>
                <Mic className="w-5 h-5 mr-2" />
                Start Recording
              </>
            )}
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