import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { PhoneModal } from '@/components/PhoneModal';
import { DevPortal } from '@/components/DevPortal';
import { DevPortalCodeWindow } from '@/components/DevPortalCodeWindow';
import { AuthModal } from '@/components/AuthModal';
import { useRecorder } from '@/hooks/useRecorder';
import { usePhoneLead } from '@/hooks/usePhoneLead';
import { useAuth } from '@/contexts/AuthContext';
import { useLocationHeader } from '@/hooks/useLocationHeader';
import { supabase } from '@/integrations/supabase/client';
import { uploadAudioToStorage } from '@/utils/audioStorage';
import { isDevUnlocked } from '@/utils/devPortalUnlock';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

type InputPageMode = 'normal' | 'exhibition';

interface InputPageProps {
  mode: InputPageMode;
}

export function InputPage({ mode }: InputPageProps) {
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showDevPortal, setShowDevPortal] = useState(false);
  const [showDevPortalCode, setShowDevPortalCode] = useState(false);
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  
  const { phone, isCollected, isLoading: phoneLoading } = usePhoneLead();
  const { user, openAuthModal, isAuthModalOpen, closeAuthModal } = useAuth();
  const recordingCountRef = useRef(0);
  const locationHeader = useLocationHeader(location);

  // Request geolocation on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('Geolocation error:', error);
          setLocationError('Location access denied');
        }
      );
    } else {
      setLocationError('Geolocation not supported');
    }
  }, []);

  // Keyboard shortcut for Dev Portal (desktop)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'D' || e.key === 'd') {
        if (isDevUnlocked()) {
          setShowDevPortal(true);
        } else {
          setShowDevPortalCode(true);
        }
      }
      if (e.key === 'Escape' && (showDevPortal || showDevPortalCode)) {
        setShowDevPortal(false);
        setShowDevPortalCode(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showDevPortal, showDevPortalCode]);

  // Corner tap sequence for Dev Portal access (3 taps per corner, 4 corners)
  type Corner = 'tl' | 'tr' | 'bl' | 'br';
  const cornerOrder: Corner[] = ['tl', 'tr', 'bl', 'br'];
  const [currentCornerIndex, setCurrentCornerIndex] = useState(0);
  const cornerTapCountsRef = useRef<Record<Corner, number>>({ tl: 0, tr: 0, bl: 0, br: 0 });
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapTimeRef = useRef<number>(Date.now());

  const handleCornerTap = (corner: Corner) => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapTimeRef.current;
    lastTapTimeRef.current = now;

    // Reset if too much time passed (8 seconds)
    if (timeSinceLastTap > 8000) {
      cornerTapCountsRef.current = { tl: 0, tr: 0, bl: 0, br: 0 };
      setCurrentCornerIndex(0);
      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
      }
    }

    const currentCorner = cornerOrder[currentCornerIndex];
    
    // In strict order mode: only accept taps for the current corner
    if (corner !== currentCorner) {
      // Wrong corner - reset sequence
      cornerTapCountsRef.current = { tl: 0, tr: 0, bl: 0, br: 0 };
      setCurrentCornerIndex(0);
      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
      }
      return;
    }

    // Increment tap count for current corner
    cornerTapCountsRef.current[corner] += 1;

    // Clear existing timer
    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
    }

    // If we've completed 3 taps for this corner
    if (cornerTapCountsRef.current[corner] >= 3) {
      // Move to next corner
      if (currentCornerIndex < cornerOrder.length - 1) {
        setCurrentCornerIndex(currentCornerIndex + 1);
        cornerTapCountsRef.current[corner] = 0; // Reset this corner's count
      } else {
        // All corners completed! Trigger dev portal unlock flow
        cornerTapCountsRef.current = { tl: 0, tr: 0, bl: 0, br: 0 };
        setCurrentCornerIndex(0);
        
        if (isDevUnlocked()) {
          setShowDevPortal(true);
        } else {
          setShowDevPortalCode(true);
        }
      }
    } else {
      // Reset counter after 2 seconds if no more taps
      tapTimerRef.current = setTimeout(() => {
        cornerTapCountsRef.current = { tl: 0, tr: 0, bl: 0, br: 0 };
        setCurrentCornerIndex(0);
      }, 2000);
    }
  };

  const uploadRecording = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setRecordingError(null); // Clear any previous errors

    try {
      // Get current phone from hook (will be updated after phone submission)
      const currentPhone = phone || localStorage.getItem('tm_phone_number');
      
      // Generate temp ID for upload
      const tempMemoryId = crypto.randomUUID();
      
      // Upload audio to storage (anonymous)
      const audioUrl = await uploadAudioToStorage(
        audioBlob,
        tempMemoryId,
        null,
        true // isAnonymous
      );

      if (!audioUrl) {
        console.error('Failed to upload audio to storage');
        setRecordingError('The recording could not be saved. Please try again.');
        setIsProcessing(false);
        return;
      }

      // Insert memory record
      const { error } = await supabase
        .from('memories')
        .insert({
          text: '[Voice recording]',
          lat: location?.lat ?? null,
          lng: location?.lng ?? null,
          place_name: location 
            ? `Memory at ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
            : 'Unknown location',
          privacy: 'public',
          summary: 'Voice recording',
          radius_m: 30,
          author_id: null, // Anonymous
          extracted_people: [],
          audio_url: audioUrl,
          phone: currentPhone,
        });

      if (error) {
        console.error('Error saving memory to database:', error);
        setRecordingError('The recording could not be saved. Please try again.');
        setIsProcessing(false);
        return;
      }

      // Success - recording is saved
      // In exhibition mode, show phone popup after successful save
      if (mode === 'exhibition') {
        setShowPhoneModal(true);
      }
      // In normal mode, no phone popup - just return silently
    } catch (error) {
      console.error('Error uploading recording:', error);
      setRecordingError('The recording could not be saved. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecordingComplete = async (audioBlob: Blob) => {
    // Always upload and save first (non-blocking)
    await uploadRecording(audioBlob);
  };

  const { isRecording, startRecording, stopRecording, error: recorderError } = useRecorder({
    onRecordingComplete: handleRecordingComplete,
  });

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative">
      {/* Login Header - only show in normal mode */}
      {mode === 'normal' && (
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
          <div className="font-mono text-white text-sm">Time Machine</div>
          <div className="flex gap-2">
            {user ? (
              <span className="font-mono text-white text-sm">{user.email}</span>
            ) : (
              <>
                <Button
                  onClick={openAuthModal}
                  variant="outline"
                  size="sm"
                  className="font-mono bg-black text-white border-white hover:bg-white hover:text-black"
                >
                  Log in
                </Button>
                <Button
                  onClick={openAuthModal}
                  variant="outline"
                  size="sm"
                  className="font-mono bg-black text-white border-white hover:bg-white hover:text-black"
                >
                  Sign up
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Corner tap zones for Dev Portal unlock (3 taps per corner, 4 corners) */}
      {/* Top Left */}
      <div
        className="fixed top-0 left-0 w-16 h-16 z-50 pointer-events-auto"
        onClick={() => handleCornerTap('tl')}
        aria-hidden="true"
      />
      {/* Top Right */}
      <div
        className="fixed top-0 right-0 w-16 h-16 z-50 pointer-events-auto"
        onClick={() => handleCornerTap('tr')}
        aria-hidden="true"
      />
      {/* Bottom Left */}
      <div
        className="fixed bottom-0 left-0 w-16 h-16 z-50 pointer-events-auto"
        onClick={() => handleCornerTap('bl')}
        aria-hidden="true"
      />
      {/* Bottom Right */}
      <div
        className="fixed bottom-0 right-0 w-16 h-16 z-50 pointer-events-auto"
        onClick={() => handleCornerTap('br')}
        aria-hidden="true"
      />

      {/* Live date/time + location header */}
      <div className="w-full max-w-2xl mb-4">
        <div className="font-mono text-sm md:text-base text-white opacity-80 px-6 md:px-8">
          {locationHeader.day && locationHeader.date && locationHeader.time && locationHeader.town ? (
            `${locationHeader.day} · ${locationHeader.date} · ${locationHeader.time} · ${locationHeader.town}`
          ) : (
            locationHeader.isLoading ? 'Locating…' : 'Unknown location'
          )}
        </div>
      </div>

      {/* Terminal-style description */}
      <div className="w-full max-w-2xl mb-8">
        <div className="font-mono text-lg md:text-xl lg:text-2xl text-gray-400 leading-loose p-6 md:p-8">
          This is a <span className="text-[0.4em]">(fucking)</span> Time Machine. We believe this could change the world, and we need your help. Record now, and come back to your current location in the future to interact with the sound of the past. Thank you for your time.
        </div>
      </div>

      {/* Record and Output Buttons */}
      <div className="flex flex-col items-center space-y-4">
        {isProcessing ? (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
            <p className="text-sm text-gray-400 font-mono">Saving recording...</p>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            {/* Record Button */}
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              size="lg"
              className={`text-2xl px-12 py-8 font-mono rounded-none border-2 ${
                isRecording
                  ? 'bg-red-600 text-white border-red-700 hover:bg-red-700'
                  : 'bg-white text-black border-white hover:bg-gray-100'
              }`}
              disabled={isProcessing}
            >
              {isRecording ? 'Stop' : 'Record'}
            </Button>

            {/* Output Button (Coming Soon) */}
            <div className="flex flex-col items-center">
              <Button
                onClick={() => setShowComingSoonModal(true)}
                size="lg"
                className="text-2xl px-12 py-8 font-mono rounded-none border-2 border-dashed opacity-60 bg-black text-white border-white hover:opacity-80 hover:bg-black hover:text-white"
                disabled={isProcessing}
              >
                OUTPUT
              </Button>
              <p className="text-xs text-gray-400 font-mono mt-1 uppercase">Coming Soon</p>
            </div>
          </div>
        )}

        {/* Status line */}
        {isRecording && (
          <p className="text-sm text-gray-400 font-mono">Recording...</p>
        )}

        {/* Recorder error (mic access, blob creation) */}
        {recorderError && (
          <p className="text-sm text-red-400 font-mono max-w-md text-center">{recorderError}</p>
        )}
      </div>

      {/* Phone Modal - only in exhibition mode, after successful save */}
      {mode === 'exhibition' && (
        <PhoneModal 
          isOpen={showPhoneModal} 
          onClose={() => setShowPhoneModal(false)}
          autoFocus={true}
        />
      )}

      {/* Coming Soon Modal */}
      <Dialog open={showComingSoonModal} onOpenChange={setShowComingSoonModal}>
        <DialogContent className="bg-black border-2 border-white text-white sm:max-w-md [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="font-mono text-white text-xl">
              Output is coming soon.
            </DialogTitle>
            <DialogDescription className="font-mono text-white text-sm mt-2">
              This is where you'll return to hear the past.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex justify-end">
            <Button
              onClick={() => setShowComingSoonModal(false)}
              className="bg-white text-black border-2 border-white hover:bg-gray-200 font-mono rounded-none"
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recording Error Modal */}
      <Dialog open={!!recordingError} onOpenChange={(open) => !open && setRecordingError(null)}>
        <DialogContent className="bg-black border-2 border-white text-white sm:max-w-md [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="font-mono text-white text-lg">
              Something went wrong.
            </DialogTitle>
            <DialogDescription className="font-mono text-white text-sm mt-2">
              The recording could not be saved.
              <br />
              Please try again.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex justify-end">
            <Button
              onClick={() => setRecordingError(null)}
              className="bg-white text-black border-2 border-white hover:bg-gray-200 font-mono rounded-none"
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Auth Modal - only in normal mode */}
      {mode === 'normal' && (
        <AuthModal 
          isOpen={isAuthModalOpen} 
          onClose={closeAuthModal}
          onSuccess={() => {
            toast.success('Logged in successfully');
          }}
        />
      )}

      {/* Dev Portal Code Window - appears after secret points */}
      <DevPortalCodeWindow
        isOpen={showDevPortalCode}
        onClose={() => setShowDevPortalCode(false)}
      />

      {/* Dev Portal - Only accessible if unlocked */}
      {isDevUnlocked() && (
        <DevPortal
          isOpen={showDevPortal}
          onClose={() => setShowDevPortal(false)}
          userLocation={location ? { lat: location.lat, lng: location.lng } : null}
          userId={user?.id}
        />
      )}
    </div>
  );
}

