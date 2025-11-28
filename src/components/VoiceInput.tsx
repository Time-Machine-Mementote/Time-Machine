import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface VoiceInputProps {
  onTranscriptionComplete: (text: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

// Type definition for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

const VoiceInput = ({ onTranscriptionComplete, onError, disabled }: VoiceInputProps) => {
  const [isListening, setIsListening] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>('');

  useEffect(() => {
    // Check if Web Speech API is supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
          setTranscription('');
          finalTranscriptRef.current = ''; // Reset final transcript
        };

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let currentFinal = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              currentFinal += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }

          if (currentFinal) {
            finalTranscriptRef.current += currentFinal;
            setTranscription(finalTranscriptRef.current);
          } else {
            // Show interim results appended to final transcript
            setTranscription(finalTranscriptRef.current + interimTranscript);
          }
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          
          let errorMessage = 'Speech recognition error occurred';
          switch (event.error) {
            case 'no-speech':
              errorMessage = 'No speech detected. Please try again.';
              break;
            case 'audio-capture':
              errorMessage = 'No microphone found. Please check your device.';
              break;
            case 'not-allowed':
              errorMessage = 'Microphone permission denied. Please enable microphone access.';
              break;
            case 'network':
              errorMessage = 'Network error. Please check your connection.';
              break;
            default:
              errorMessage = `Recognition error: ${event.error}`;
          }
          
          if (onError) {
            onError(errorMessage);
          } else {
            toast.error(errorMessage);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
          // Send final transcription when recognition ends
          if (finalTranscriptRef.current.trim()) {
            onTranscriptionComplete(finalTranscriptRef.current.trim());
            finalTranscriptRef.current = ''; // Reset for next recording
          }
        };

        recognitionRef.current = recognition;
      } catch (error) {
        console.error('Failed to initialize speech recognition:', error);
        setIsSupported(false);
      }
    } else {
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
    };
  }, [onTranscriptionComplete, onError, isListening]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      const errorMsg = 'Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.';
      if (onError) {
        onError(errorMsg);
      } else {
        toast.error(errorMsg);
      }
      return;
    }

    if (recognitionRef.current && !isListening) {
      try {
        setTranscription('');
        recognitionRef.current.start();
        toast.info('Listening... Speak your memory now!');
      } catch (error) {
        console.error('Error starting recognition:', error);
        const errorMsg = 'Failed to start voice recognition. Please try again.';
        if (onError) {
          onError(errorMsg);
        } else {
          toast.error(errorMsg);
        }
      }
    }
  }, [isSupported, isListening, onError]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
        toast.success('Recording stopped');
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    }
  }, [isListening]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isSupported) {
    return (
      <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
        <p className="text-sm text-yellow-800">
          ⚠️ Voice input is not supported in your browser. Please use Chrome, Edge, or Safari.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant={isListening ? "destructive" : "outline"}
        onClick={isListening ? stopListening : startListening}
        disabled={disabled}
        className={`w-full ${isListening ? 'animate-pulse' : ''}`}
      >
        {isListening ? (
          <>
            <Square className="h-4 w-4 mr-2" />
            Stop Recording
          </>
        ) : (
          <>
            <Mic className="h-4 w-4 mr-2" />
            Start Voice Recording
          </>
        )}
      </Button>

      {isListening && (
        <div className="flex items-center justify-center space-x-2 p-3 bg-red-50 rounded-lg border border-red-200">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-red-700 font-medium">Listening... Speak now</span>
        </div>
      )}

      {transcription && !isListening && (
        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <p className="text-sm text-green-800 font-medium mb-1">Transcription:</p>
          <p className="text-sm text-green-700">{transcription}</p>
        </div>
      )}

      {transcription && isListening && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-600 mb-1">Interim transcription:</p>
          <p className="text-sm text-blue-700 italic">{transcription}</p>
        </div>
      )}
    </div>
  );
};

export default VoiceInput;

