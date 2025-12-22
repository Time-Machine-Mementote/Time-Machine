// Generic hook for multi-tap/click gestures
import { useRef, useCallback } from 'react';

interface UseMultiTapOptions {
  count?: number;
  windowMs?: number;
  onTrigger: () => void;
}

interface UseMultiTapReturn {
  onPointerDown: (e: React.PointerEvent) => void;
  onClick: (e: React.MouseEvent) => void;
}

/**
 * Hook for detecting consecutive taps/clicks within a time window
 * Resets count if time between taps exceeds windowMs
 * Calls onTrigger when count is reached
 */
export function useMultiTap({
  count = 5,
  windowMs = 2500,
  onTrigger,
}: UseMultiTapOptions): UseMultiTapReturn {
  const tapCountRef = useRef(0);
  const lastTapTimeRef = useRef<number>(0);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTap = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapTimeRef.current;

    // If too much time passed, reset to 1 (this tap)
    if (timeSinceLastTap > windowMs && lastTapTimeRef.current > 0) {
      tapCountRef.current = 1;
      lastTapTimeRef.current = now;
      
      // Clear any existing reset timer
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
      
      // Set new reset timer
      resetTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
        lastTapTimeRef.current = 0;
      }, windowMs);
      
      return;
    }

    // Clear existing reset timer
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }

    // Increment tap count
    tapCountRef.current += 1;
    lastTapTimeRef.current = now;

    // Check if we've reached the required taps
    if (tapCountRef.current >= count) {
      tapCountRef.current = 0;
      lastTapTimeRef.current = 0;
      
      // Trigger haptic feedback on mobile if available
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 30, 50]);
      }
      
      // Call trigger callback
      onTrigger();
    } else {
      // Set reset timer for this tap sequence
      resetTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
        lastTapTimeRef.current = 0;
      }, windowMs);
    }
  }, [count, windowMs, onTrigger]);

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
    onPointerDown,
    onClick,
  };
}

