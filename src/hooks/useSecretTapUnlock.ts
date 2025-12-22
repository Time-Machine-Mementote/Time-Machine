// Hook for secret tap unlock gesture (5 consecutive taps within time window)
import { useState, useRef, useCallback } from 'react';

interface UseSecretTapUnlockOptions {
  tapsRequired?: number;
  windowMs?: number;
  onUnlock: () => void;
}

interface UseSecretTapUnlockReturn {
  unlocked: boolean;
  tapCount: number;
  onPointerDown: (e: React.PointerEvent) => void;
  onClick: (e: React.MouseEvent) => void;
}

/**
 * Hook for detecting consecutive taps/clicks within a time window
 * Resets count if time between taps exceeds windowMs
 * Calls onUnlock when tapsRequired is reached
 */
export function useSecretTapUnlock({
  tapsRequired = 5,
  windowMs = 2000,
  onUnlock,
}: UseSecretTapUnlockOptions): UseSecretTapUnlockReturn {
  const [unlocked, setUnlocked] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const lastTapTimeRef = useRef<number>(0);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTap = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapTimeRef.current;

    // If too much time passed, reset to 1 (this tap)
    if (timeSinceLastTap > windowMs && lastTapTimeRef.current > 0) {
      setTapCount(1);
      lastTapTimeRef.current = now;
      
      // Clear any existing reset timer
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
      
      // Set new reset timer
      resetTimerRef.current = setTimeout(() => {
        setTapCount(0);
        lastTapTimeRef.current = 0;
      }, windowMs);
      
      return;
    }

    // Clear existing reset timer
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }

    // Increment tap count
    const newCount = tapCount + 1;
    setTapCount(newCount);
    lastTapTimeRef.current = now;

    // Check if we've reached the required taps
    if (newCount >= tapsRequired) {
      setUnlocked(true);
      setTapCount(0);
      lastTapTimeRef.current = 0;
      
      // Trigger haptic feedback on mobile if available
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 30, 50]);
      }
      
      // Call unlock callback
      onUnlock();
    } else {
      // Set reset timer for this tap sequence
      resetTimerRef.current = setTimeout(() => {
        setTapCount(0);
        lastTapTimeRef.current = 0;
      }, windowMs);
    }
  }, [tapCount, tapsRequired, windowMs, onUnlock]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Only handle primary pointer (mouse left, touch)
    if (e.isPrimary) {
      handleTap();
    }
  }, [handleTap]);

  const onClick = useCallback((e: React.MouseEvent) => {
    handleTap();
  }, [handleTap]);

  return {
    unlocked,
    tapCount,
    onPointerDown,
    onClick,
  };
}

