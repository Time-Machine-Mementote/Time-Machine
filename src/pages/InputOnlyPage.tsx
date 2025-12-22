import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PhoneModal } from '@/components/PhoneModal';
import { DevPortal } from '@/components/DevPortal';
import { DevPortalCodeWindow } from '@/components/DevPortalCodeWindow';
import { AuthModal } from '@/components/AuthModal';
import { useRecorder } from '@/hooks/useRecorder';
import { usePhoneLead } from '@/hooks/usePhoneLead';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { uploadAudioToStorage } from '@/utils/audioStorage';
import { isDevUnlocked } from '@/utils/devPortalUnlock';
import { useSecretTapUnlock } from '@/hooks/useSecretTapUnlock';
import { useMultiTap } from '@/hooks/useMultiTap';
import { useOutputPlayback } from '@/hooks/useOutputPlayback';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export function InputOnlyPage() {
  const navigate = useNavigate();
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showDevPortal, setShowDevPortal] = useState(false);
  const [showDevPortalCode, setShowDevPortalCode] = useState(false);
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingRecording, setPendingRecording] = useState<Blob | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  
  const { phone, isCollected, isLoading: phoneLoading } = usePhoneLead();
  const { user, openAuthModal, isAuthModalOpen, closeAuthModal } = useAuth();
  
  // Output playback hook (shared with Ghost Mode) - must be after useAuth() to access user
  // Request location function - ensures location is available before starting playback
  const requestLocationIfNeeded = useCallback(async (): Promise<import('@/types/memory').UserLocation | null> => {
    return new Promise((resolve) => {
      if (location && location.lat && location.lng) {
        resolve({ lat: location.lat, lng: location.lng, accuracy: 0, timestamp: Date.now() });
        return;
      }

      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now(),
          };
          setLocation({ lat: newLocation.lat, lng: newLocation.lng });
          resolve(newLocation);
        },
        (error) => {
          console.warn('Geolocation error:', error);
          setLocationError('Location access denied');
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }, [location]);

  const { isOutputEnabled, toggleOutput } = useOutputPlayback({
    enabled: false, // Controlled by gesture, not prop
    userId: user?.id,
    location: location ? { lat: location.lat, lng: location.lng, accuracy: 0, timestamp: Date.now() } : null,
    requestLocation: requestLocationIfNeeded,
  });

  // 5-tap gesture on description text - toggle output playback
  const { onPointerDown: onDescriptionTap, onClick: onDescriptionClick } = useMultiTap({
    count: 5,
    windowMs: 2500,
    onTrigger: async () => {
      console.log('🔊 5-tap gesture on description - toggling output playback');
      await toggleOutput();
    },
  });

  // 2-tap gesture on "Coming Soon" modal - open dev portal
  const { onPointerDown: onComingSoonTap, onClick: onComingSoonClick } = useMultiTap({
    count: 2,
    windowMs: 2000,
    onTrigger: () => {
      console.log('🔓 2-tap gesture on coming soon modal - opening dev portal');
      setShowComingSoonModal(false); // Close the modal first
      toast.info('Opening Dev Portal...');
      // Use setTimeout to ensure navigation happens after toast is shown
      setTimeout(() => {
        navigate('/dev');
      }, 100);
    },
  });
  const recordingCountRef = useRef(0);

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
          // Continue without location - will save nulls
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      setLocationError('Geolocation not supported');
    }
  }, []);

  // Secret points detection - double click on page (not on buttons)
  useEffect(() => {
    let clickCount = 0;
    let clickTimer: NodeJS.Timeout;

    const handleClick = (e: MouseEvent) => {
      // Only trigger on page area (not on buttons or inputs)
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('input') || target.closest('form')) return;

      clickCount++;
      
      if (clickCount === 1) {
        clickTimer = setTimeout(() => {
          clickCount = 0;
        }, 500); // 500ms window for double click
      } else if (clickCount === 2) {
        clearTimeout(clickTimer);
        setShowDevPortalCode(true);
        clickCount = 0;
      }
    };

    window.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('click', handleClick);
      if (clickTimer) clearTimeout(clickTimer);
    };
  }, []);

  // Keyboard shortcut for Dev Portal (press 'D' key) - desktop only
  // Only works if already unlocked
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Press 'D' or 'd' to open Dev Portal (when not typing in an input)
      if ((e.key === 'D' || e.key === 'd') && e.target === document.body) {
        e.preventDefault();
        // Check if unlocked - if not, show code window
        if (isDevUnlocked()) {
          setShowDevPortal(true);
        } else {
          setShowDevPortalCode(true);
        }
      }
      // Press Escape to close Dev Portal
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

  const handleRecordingComplete = async (audioBlob: Blob) => {
    recordingCountRef.current += 1;
    const isFirstRecording = recordingCountRef.current === 1;

    // If this is the first completed recording and phone not collected, show modal
    if (isFirstRecording && !isCollected && !phoneLoading) {
      setPendingRecording(audioBlob);
      setShowPhoneModal(true);
      return; // Don't upload yet, wait for phone submission
    }

    // Upload the recording
    await uploadRecording(audioBlob);
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

      // Success - no UI feedback, just return to idle state
    } catch (error) {
      console.error('Error uploading recording:', error);
      setRecordingError('The recording could not be saved. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle phone modal close - upload pending recording if exists
  const handlePhoneModalClose = async () => {
    setShowPhoneModal(false);
    
    // Small delay to ensure phone is updated in localStorage and hook state
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // If we have a pending recording, upload it now (phone should be collected)
    if (pendingRecording) {
      await uploadRecording(pendingRecording);
      setPendingRecording(null);
    }
  };

  const { isRecording, startRecording, stopRecording, error: recorderError } = useRecorder({
    onRecordingComplete: handleRecordingComplete,
  });

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative">
      {/* Login Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
        {/* Time Machine text */}
        <div className="font-mono text-white text-sm select-text" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
          Time Machine
        </div>
      </div>

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

      {/* Terminal-style description - 5 taps to toggle output playback */}
      <div className="w-full max-w-2xl mb-8">
        <div 
          className="font-mono text-lg md:text-xl lg:text-2xl text-gray-400 leading-loose p-6 md:p-8 cursor-text select-text"
          onPointerDown={onDescriptionTap}
          onClick={onDescriptionClick}
          style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
        >
          This is a (fucking) Time Machine. We believe this could change the world, and we need your help. Record now, and come back to your current location in the future to interact with the sound of the past. Thank you for your time.
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

      {/* Phone Modal */}
      <PhoneModal isOpen={showPhoneModal} onClose={handlePhoneModalClose} />

      {/* Coming Soon Modal */}
      <Dialog open={showComingSoonModal} onOpenChange={setShowComingSoonModal}>
        <DialogContent 
          className="bg-black border-2 border-white text-white sm:max-w-md [&>button]:hidden"
          onPointerDown={onComingSoonTap}
          onClick={onComingSoonClick}
        >
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

      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={closeAuthModal}
        onSuccess={() => {
          toast.success('Logged in successfully');
        }}
      />

      {/* Dev Portal Code Window - appears after secret points */}
      <DevPortalCodeWindow
        isOpen={showDevPortalCode}
        onClose={() => setShowDevPortalCode(false)}
      />

      {/* Dev Portal - Only accessible if unlocked */}
      <DevPortal
        isOpen={showDevPortal}
        onClose={() => setShowDevPortal(false)}
        userLocation={location ? { lat: location.lat, lng: location.lng } : null}
        userId={user?.id}
      />
    </div>
  );
}

