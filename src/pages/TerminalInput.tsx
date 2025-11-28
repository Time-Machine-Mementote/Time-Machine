// Page 3: Terminal-style popup for text and audio input - SIMPLIFIED
import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { uploadAudioToStorage } from '@/utils/audioStorage';
import { enrichMemoryWithEntities } from '@/services/memoryApi';

interface LocationState {
  location?: {
    lat: number;
    lng: number;
  };
}

export default function TerminalInput() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const baseTextRef = useRef('');
  const finalTranscriptRef = useRef('');
  const isRecordingRef = useRef(false);
  const audioBlobRef = useRef<Blob | null>(null);
  const stopPromiseResolver = useRef<((blob: Blob | null) => void) | null>(null);

  const updateAudioBlob = (blob: Blob | null) => {
    audioBlobRef.current = blob;
    setAudioBlob(blob);
  };

  // Check Supabase connection on mount
  useEffect(() => {
    // Log Supabase config
    console.log('Supabase client check:', {
      url: supabase.supabaseUrl,
      hasAnonKey: !!supabase.supabaseKey,
      urlPreview: supabase.supabaseUrl?.substring(0, 30) + '...',
      fullUrl: supabase.supabaseUrl
    });

    // Test connectivity with a simple query
    const testConnection = async () => {
      try {
        console.log('Testing Supabase connection...');
        console.log('URL:', supabase.supabaseUrl);
        console.log('Has key:', !!supabase.supabaseKey);
        
        // First, try a simple query to test basic connectivity
        // Use a query that works even if table doesn't exist yet
        const { data, error } = await supabase
          .from('memories')
          .select('id')
          .limit(1);
        
        if (error) {
          console.warn('Supabase connection test result:', {
            error,
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          
          // Some error codes are OK (like table doesn't exist - we can still connect)
          if (error.code === '42P01' || error.message?.includes('requested path is invalid') || error.message?.includes('relation') || error.message?.includes('does not exist')) {
            // Table doesn't exist - but connection works!
            console.log('✓ Supabase connection successful (table not set up yet)');
            console.log('⚠️ Run COMPLETE_DATABASE_SETUP.sql in Supabase SQL Editor');
            console.log('   Go to: https://supabase.com/dashboard/project/qhbrnotooiutpwwtadlx → SQL Editor');
            setConnectionStatus('connected');
          } else if (error.code === 'PGRST116') {
            // No rows returned - connection works!
            console.log('✓ Supabase connection successful');
            setConnectionStatus('connected');
          } else if (error.code === '42501') {
            // Permission denied - connection works but RLS blocking
            console.log('⚠️ Connected but permission denied. Run COPY_THIS_SQL_ONLY.sql');
            setConnectionStatus('disconnected');
          } else if (error.code === 'PGRST301' || error.message?.includes('network') || error.message?.includes('fetch') || error.message?.includes('Failed to fetch')) {
            console.error('❌ Network error detected:', error.message);
            console.error('Check:');
            console.error('1. Internet connection');
            console.error('2. Supabase project status');
            console.error('3. URL is correct:', supabase.supabaseUrl);
            console.error('4. .env.local has correct VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
            console.error('5. Dev server was restarted after updating .env.local');
            setConnectionStatus('disconnected');
          } else {
            // Other errors - log but assume disconnected
            console.error('❌ Connection test failed:', error.message);
            setConnectionStatus('disconnected');
          }
        } else {
          console.log('✓ Supabase connection successful');
          setConnectionStatus('connected');
        }
      } catch (err: any) {
        console.error('❌ Supabase connection test exception:', err);
        console.error('Error details:', {
          message: err.message,
          stack: err.stack,
          name: err.name
        });
        setConnectionStatus('disconnected');
      }
    };

    testConnection();

    // Get user ID (no auth required - works without authentication)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
      console.log('User session:', session ? 'authenticated' : 'anonymous');
      // If no session, that's fine - we can still create memories without auth
    }).catch((error) => {
      console.warn('Could not get session (this is ok for art exhibition):', error);
      setUserId(null);
    });
  }, []);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 100);
  }, []);

  // Handle ESC key to cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) {
        navigate('/');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, isProcessing]);

  useEffect(() => {
    const SpeechRecognition: any =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsTranscribing(true);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let newlyFinalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? '';
        if (result.isFinal) {
          newlyFinalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (newlyFinalTranscript) {
        finalTranscriptRef.current = `${finalTranscriptRef.current}${newlyFinalTranscript}`;
      }

      const combined = `${baseTextRef.current}${finalTranscriptRef.current}${interimTranscript}`.trim();
      if (combined) {
        setText(combined.replace(/\s+/g, ' ').trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event);
      if (event.error !== 'no-speech') {
        setTranscriptionError(event.error || 'Speech recognition failed');
        setIsTranscribing(false);
      }
    };

    recognition.onend = () => {
      if (isRecordingRef.current) {
        try {
          recognition.start();
        } catch (err) {
          console.warn('Failed to restart speech recognition:', err);
        }
      } else {
        setIsTranscribing(false);
      }
    };

    recognitionRef.current = recognition;
    setIsSpeechSupported(true);

    return () => {
      recognition.stop();
    };
  }, []);

  // Simple audio recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false, // Keep ambient sounds
          noiseSuppression: false,
          autoGainControl: false,
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      updateAudioBlob(null);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        updateAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
        if (stopPromiseResolver.current) {
          stopPromiseResolver.current(audioBlob);
          stopPromiseResolver.current = null;
        }
      };

      mediaRecorder.start(1000);
      baseTextRef.current = text ? `${text.trim()} ` : '';
      finalTranscriptRef.current = '';
      setTranscriptionError(null);
      if (recognitionRef.current && isSpeechSupported) {
        try {
          recognitionRef.current.start();
          setIsTranscribing(true);
        } catch (error) {
          console.error('Failed to start speech recognition:', error);
          setTranscriptionError('Could not start speech recognition');
        }
      }
      setIsRecording(true);
      isRecordingRef.current = true;
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = async (): Promise<Blob | null> => {
    if (recognitionRef.current && (isTranscribing || isRecording)) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.warn('Failed to stop speech recognition:', error);
      }
    }

    if (mediaRecorderRef.current && isRecording) {
      const recorder = mediaRecorderRef.current;
      const stopPromise = new Promise<Blob | null>((resolve) => {
        stopPromiseResolver.current = resolve;
      });
      recorder.stop();
      setIsRecording(false);
      isRecordingRef.current = false;
      const blob = await stopPromise;
      if (finalTranscriptRef.current) {
        const combined = `${baseTextRef.current}${finalTranscriptRef.current}`.replace(/\s+/g, ' ').trim();
        if (combined) {
          setText(combined);
        }
      }
      setIsTranscribing(false);
      return blob;
    }

    setIsRecording(false);
    isRecordingRef.current = false;
    setIsTranscribing(false);
    if (finalTranscriptRef.current) {
      const combined = `${baseTextRef.current}${finalTranscriptRef.current}`.replace(/\s+/g, ' ').trim();
      if (combined) {
        setText(combined);
      }
    }
    return audioBlobRef.current;
  };

  // Handle Enter key submission
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isProcessing) {
      handleSubmit(e as any);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isRecording) {
      toast.info('Finishing recording...');
      await stopRecording();
    }

    const capturedAudioBlob = audioBlobRef.current;
    
    if (!text.trim() && !capturedAudioBlob) {
      toast.error('Please enter text or record audio');
      return;
    }

    // Handle missing location - use default Berkeley campus location as fallback
    let lat: number;
    let lng: number;
    
    if (state?.location) {
      lat = state.location.lat;
      lng = state.location.lng;
    } else {
      // Default to Berkeley campus center if location not provided
      console.warn('No location in state, using default Berkeley campus location');
      lat = 37.8721;
      lng = -122.2585;
      toast.warning('Using default location (Berkeley campus)');
    }

    setIsProcessing(true);

    try {

      // Upload audio if available (works even without userId)
      let audioUrl: string | null = null;
      if (capturedAudioBlob) {
        try {
          const tempMemoryId = crypto.randomUUID();
          // Try to upload - if no userId, use a temporary one
          const uploadUserId = userId || 'exhibition-user-' + crypto.randomUUID();
          audioUrl = await uploadAudioToStorage(capturedAudioBlob, tempMemoryId, uploadUserId);
          if (!audioUrl) {
            console.warn('Audio upload failed, but continuing...');
            toast.warning('Memory created but audio upload failed');
          }
        } catch (audioError) {
          console.error('Audio upload error:', audioError);
          toast.warning('Memory will be saved without audio');
        }
      }

      // Test connectivity first with a simple query
      console.log('Preparing to save memory...');
      console.log('Supabase URL:', supabase.supabaseUrl);
      console.log('Supabase Key (first 20 chars):', supabase.supabaseKey?.substring(0, 20) + '...');
      console.log('Memory data:', {
        text: text.trim() || '[Voice memo]',
        lat,
        lng,
        userId: userId || 'anonymous',
        source: 'art_exhibition'
      });

      // Quick connectivity test before insert
      try {
        const testQuery = await supabase
          .from('memories')
          .select('id')
          .limit(1);
        
        if (testQuery.error && testQuery.error.code !== 'PGRST116') {
          // PGRST116 is "no rows" which is fine, but other errors indicate problems
          console.error('⚠️ Connectivity test failed:', testQuery.error);
          throw new Error(`Connection test failed: ${testQuery.error.message}`);
        }
        console.log('✓ Connectivity test passed');
      } catch (testError: any) {
        console.error('Connectivity test error:', testError);
        if (testError.message?.includes('fetch') || testError.message?.includes('Failed to fetch') || testError.message?.includes('NXDOMAIN')) {
          throw new Error('Cannot connect to Supabase. The project may not exist.\n\nPlease:\n1. Check SUPABASE_QUICK_SETUP.md for setup instructions\n2. Create a new Supabase project\n3. Update .env.local with your new project URL\n4. Run COMPLETE_DATABASE_SETUP.sql in SQL Editor\n\nCurrent URL: ' + supabase.supabaseUrl);
        }
        throw testError;
      }

      // Create memory - SIMPLIFIED, no complex extraction
      // Ensure we have a valid text value (required field)
      const memoryText = text.trim() || (capturedAudioBlob ? '[Voice memo recorded]' : '[Empty memory]');
      
      // Add timeout wrapper to catch network errors
      const insertTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Insert operation timed out after 15 seconds')), 15000)
      );

      const memoryData = {
        text: memoryText,
        lat,
        lng,
        place_name: 'Art Exhibition Entry',
        privacy: 'public' as const,
        summary: text.trim() ? (text.trim().length > 100 ? text.trim().substring(0, 100) + '...' : text.trim()) : 'Art exhibition memory',
        radius_m: 30,
        author_id: userId || null,
        extracted_people: [] as string[],
        audio_url: audioUrl || null,
        source: 'art_exhibition' as const, // Add source field
      };

      console.log('Inserting memory with data:', {
        ...memoryData,
        text: memoryData.text.substring(0, 50) + '...',
        author_id: memoryData.author_id || 'NULL'
      });

      const insertPromise = supabase
        .from('memories')
        .insert(memoryData)
        .select()
        .single();

      const { data, error } = await Promise.race([
        insertPromise,
        insertTimeout
      ]) as any;

      if (error) {
        console.error('Error creating memory:', {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          fullError: JSON.stringify(error, null, 2)
        });
        
        let errorMessage = 'Failed to save memory. ';
        
        // Handle specific error codes
        if (error.code === '42501') {
          errorMessage += 'Permission denied. Please apply the database migration (see COPY_THIS_SQL_ONLY.sql) to allow anonymous inserts.';
        } else if (error.code === '23503') {
          errorMessage += 'Database constraint violation. Check that all required fields are valid.';
        } else if (error.code === '23505') {
          errorMessage += 'This memory already exists.';
        } else if (error.code === 'PGRST116') {
          errorMessage += 'No rows returned. The insert may have failed silently.';
        } else if (error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('Failed to fetch')) {
          errorMessage += `Network error. Please check:\n1. Your internet connection\n2. Supabase project is active (not paused)\n3. URL is accessible: ${supabase.supabaseUrl}\n4. No CORS or firewall blocking`;
        } else if (error.message) {
          errorMessage += error.message;
        } else {
          errorMessage += 'Unknown error. Check browser console (F12) for details.';
        }
        
        // Provide helpful instructions for common issues
        if (error.code === '42501' || error.message?.toLowerCase().includes('permission')) {
          errorMessage += '\n\nTo fix: Run the SQL in COMPLETE_DATABASE_SETUP.sql in your Supabase SQL Editor.';
        }
        
        // Help with DNS/network errors
        if (error.message?.includes('fetch') || error.message?.includes('Failed to fetch') || error.message?.includes('NXDOMAIN')) {
          errorMessage += '\n\n⚠️ Supabase project not found. See SUPABASE_QUICK_SETUP.md for setup instructions.';
        }
        
        toast.error(errorMessage, { duration: 8000 });
        setIsProcessing(false);
        return; // Don't throw, just stop processing
      }

      console.log('✓ Memory created successfully:', data);

      // Enrich memory with extracted entities and update places table (non-blocking)
      // Use the memoryText already defined above
      if (memoryText && data?.id) {
        // Call enrichment in the background - don't wait for it
        enrichMemoryWithEntities(data.id, memoryText).catch(err => {
          console.error('Background memory enrichment failed:', err);
          // Don't show error to user - enrichment is non-critical
        });
      }

      // Navigate to receipt page with memory data
      if (data) {
        navigate('/receipt', { 
          state: { 
            memory: data,
            text: text.trim() || '[Voice memo]',
            audioUrl 
          } 
        });
      } else {
        throw new Error('Memory was created but no data returned');
      }

    } catch (error: any) {
      console.error('Failed to create memory - Full error:', error);
      console.error('Error stack:', error.stack);
      console.error('Supabase URL:', supabase.supabaseUrl);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        name: error.name,
        cause: error.cause
      });
      
      // Handle different error types
      if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
        toast.error('Request timed out. The database may be slow or unreachable. Please try again.', { duration: 6000 });
      } else if (error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('Failed to fetch')) {
        const troubleshooting = `Network error: Cannot connect to Supabase.

Troubleshooting:
1. Check internet connection
2. Verify Supabase project is active (not paused)
   → Go to: https://supabase.com/dashboard
   → Check project: iwwvjecrvgrdyptxhnwj
3. Test URL in browser: ${supabase.supabaseUrl}/rest/v1/
4. Check browser console (F12) for CORS errors
5. Try refreshing the page`;
        toast.error(troubleshooting, { duration: 10000 });
        setConnectionStatus('disconnected');
      } else if (error.code) {
        toast.error(`Database error (${error.code}): ${error.message || 'Unknown database error'}`, { duration: 6000 });
      } else {
        toast.error(`Error: ${error.message || 'Unknown error occurred. Check browser console (F12) for details.'}`, { duration: 6000 });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center font-mono">
      {/* Terminal window */}
      <div className="w-full max-w-4xl mx-4 border-2 border-white bg-black text-white shadow-2xl">
        {/* Terminal header */}
        <div className="bg-white/10 border-b border-white px-4 py-2 flex items-center justify-between">
          <span className="text-xs tracking-wide uppercase text-white/70">TERMINAL.EXE - MEMORY INPUT</span>
          <div className="flex items-center gap-3">
            <div 
              className={`text-xs font-mono cursor-help ${
                connectionStatus === 'connected' ? 'text-white' :
                connectionStatus === 'disconnected' ? 'text-white/40 underline' :
                'text-white/60'
              }`} 
              title={connectionStatus === 'disconnected' ? 'Check browser console (F12) for details. Common issues: .env.local not loaded, dev server not restarted, or database not set up.' : ''}
              onClick={() => {
                if (connectionStatus === 'disconnected') {
                  console.log('=== CONNECTION TROUBLESHOOTING ===');
                  console.log('1. Check .env.local exists with correct values');
                  console.log('2. Restart dev server (npm run dev)');
                  console.log('3. Check Supabase dashboard: https://supabase.com/dashboard/project/qhbrnotooiutpwwtadlx');
                  console.log('4. Run COMPLETE_DATABASE_SETUP.sql if table missing');
                  console.log('5. Run COPY_THIS_SQL_ONLY.sql if permission denied');
                }
              }}
            >
              {connectionStatus === 'connected' ? '● CONNECTED' :
               connectionStatus === 'disconnected' ? '● DISCONNECTED (click for help)' :
               '● CHECKING...'}
            </div>
            <div className="text-xs text-white/60">
              {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Terminal content */}
        <div className="p-6 space-y-4 min-h-[400px]">
          <div className="text-sm text-white/80 border border-dashed border-white/30 px-4 py-3">
            Press ESC at any time to cancel and return to the home screen.
          </div>
          {/* Welcome message */}
          <div className="text-white/70 text-sm mb-4">
            <div>&gt; Welcome to Time Machine Memory Terminal</div>
            <div>&gt; Enter your memory below, then press Ctrl+Enter or click SUBMIT</div>
            {state?.location ? (
              <div className="mt-2 text-white/60">
                &gt; Location: ({state.location.lat.toFixed(4)}, {state.location.lng.toFixed(4)})
              </div>
            ) : (
              <div className="mt-2 text-white/50">
                &gt; Location: Default (Berkeley campus)
              </div>
            )}
            <div className="mt-2 text-white/60">&gt; Press ESC to cancel</div>
          </div>

          {/* Input area - SIMPLIFIED */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Text input */}
            <div className="space-y-2">
              <div className="text-white/70 text-sm font-mono">
                &gt; Enter your memory:
              </div>
              <textarea
                ref={textInputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey && !isProcessing) {
                    e.preventDefault();
                    handleSubmit(e as any);
                  }
                }}
                disabled={isProcessing}
                className="w-full bg-black border border-white/60 px-3 py-2 text-white font-mono focus:outline-none focus:border-white disabled:opacity-50 min-h-[100px] resize-none"
                placeholder="Type your memory here... (Press Ctrl+Enter or click SUBMIT)"
              />
            </div>

            {/* Simple audio recording */}
            <div className="space-y-2 border-t border-white/40 pt-4">
              <div className="text-white/70 text-sm font-mono">
                &gt; Audio (optional):
              </div>
              <div className="flex items-center gap-3">
                {!audioBlob ? (
                  <button
                    type="button"
                    onClick={async () => {
                      if (isRecording) {
                        await stopRecording();
                      } else {
                        await startRecording();
                      }
                    }}
                    disabled={isProcessing}
                    className={`px-4 py-2 border border-white text-white font-mono hover:bg-white hover:text-black transition-all disabled:opacity-50 ${
                      isRecording ? 'bg-white/20 text-white animate-pulse' : ''
                    }`}
                  >
                    {isRecording ? '⏹ STOP' : '🎤 RECORD'}
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-white/70 font-mono text-sm">✓ Audio recorded</span>
                    <button
                      type="button"
                      onClick={() => updateAudioBlob(null)}
                      disabled={isProcessing}
                      className="px-3 py-1 border border-white text-white font-mono hover:bg-white hover:text-black text-sm disabled:opacity-50"
                    >
                      CLEAR
                    </button>
                  </div>
                )}
              </div>
              {!isSpeechSupported && (
                <div className="text-xs text-white/50">
                  &gt; Speech-to-text unavailable in this browser. Your audio will still be saved.
                </div>
              )}
              {isTranscribing && (
                <div className="text-xs text-white/70">
                  &gt; Transcribing your audio...
                </div>
              )}
              {transcriptionError && (
                <div className="text-xs text-white/50">
                  &gt; Transcription error: {transcriptionError}
                </div>
              )}
            </div>

            {/* Submit button - SIMPLIFIED */}
            <div className="border-t border-white/30 pt-4">
              <button
                type="submit"
                disabled={isProcessing || isRecording || (!text.trim() && !audioBlob)}
                className="w-full px-6 py-3 border-2 border-white text-white font-mono hover:bg-white hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'PROCESSING...' : 'SUBMIT (or Ctrl+Enter)'}
              </button>
            </div>

            {/* Status line */}
            <div className="text-white/60 text-xs font-mono">
              {isProcessing ? (
                <span>&gt; Saving to database...</span>
              ) : isRecording ? (
                <span>&gt; Recording audio (speech-to-text active)...</span>
              ) : isTranscribing ? (
                <span>&gt; Processing transcription...</span>
              ) : (
                <span>&gt; Ready to submit</span>
              )}
            </div>
          </form>
        </div>

        {/* Terminal footer */}
        <div className="bg-white/5 border-t border-white/30 px-4 py-2 text-xs text-white/60">
          {isProcessing ? (
            <span>&gt; Processing memory...</span>
          ) : (
            <span>&gt; Ready for input</span>
          )}
        </div>
      </div>

      {/* ESC key handler */}
      <div
        className="absolute top-4 right-4 text-white text-sm font-mono cursor-pointer hover:opacity-70 transition-opacity"
        onClick={() => navigate('/')}
      >
        [ESC] Cancel and return home
      </div>
    </div>
  );
}

