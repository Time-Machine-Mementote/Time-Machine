// The Current: Ultra-minimal UI for the generative audio walk experience

import { useEffect, useRef, useState } from 'react';
import { useCurrentWalk } from '@/modules/current/useCurrentWalk';
import { nodes } from '@/modules/current/nodes';

export default function CurrentExperienceScreen() {
  const {
    status,
    currentSegment,
    currentNode,
    togglePlay,
    cycleVoice,
    locationError,
    setDebugNode,
    isDebugMode,
  } = useCurrentWalk();

  const [showDebugPanel, setShowDebugPanel] = useState(false);

  const longPressTimerRef = useRef<number | null>(null);
  const longPressThreshold = 1000; // 1 second

  // Handle single tap (toggle play/pause)
  const handleTap = () => {
    // User interaction is required for audio playback in browsers
    // This click will enable audio context
    if (status === 'idle') {
      // Create a silent audio context to unlock audio
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
    }
    togglePlay();
  };

  // Handle double tap (cycle voice)
  const handleDoubleTap = () => {
    cycleVoice();
  };

  // Handle long press (stub for future "Leave a Time here" feature)
  const handleLongPressStart = () => {
    longPressTimerRef.current = window.setTimeout(() => {
      console.log('Long press detected - future: Leave a Time here');
      // TODO: Implement "Leave a Time here" recording
    }, longPressThreshold);
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Check for debug mode and show panel
  useEffect(() => {
    if (isDebugMode) {
      setShowDebugPanel(true);
    }
  }, [isDebugMode]);

  // Keyboard shortcut: 'D' key toggles debug panel
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'd' || e.key === 'D') {
        setShowDebugPanel((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current !== null) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black text-white overflow-hidden"
      onTouchStart={handleLongPressStart}
      onTouchEnd={handleLongPressEnd}
      onMouseDown={handleLongPressStart}
      onMouseUp={handleLongPressEnd}
      onMouseLeave={handleLongPressEnd}
      onClick={handleTap}
      onDoubleClick={handleDoubleTap}
    >
      {/* Main content - centered, minimal */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* Status text */}
        <div className="text-sm text-white/40 font-mono mb-8 text-center px-4">
          {status === 'idle' && 'Tap to enter the Current'}
          {status === 'playing' && 'The Current is flowing'}
          {status === 'paused' && 'The Current is paused'}
        </div>

        {/* Pulsing dot indicator */}
        <div
          className={`w-2 h-2 rounded-full ${
            status === 'playing' ? 'bg-white/60 animate-pulse' : 'bg-white/20'
          }`}
          style={{
            animation: status === 'playing' ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
          }}
        />

        {/* Optional: Current segment name (very subtle) */}
        {currentSegment && status === 'playing' && (
          <div className="mt-12 text-xs text-white/20 font-mono text-center px-4">
            {currentSegment.name}
          </div>
        )}

        {/* Location error message (gentle, minimal) */}
        {locationError && (
          <div className="mt-8 text-xs text-white/30 font-mono text-center px-4 max-w-xs">
            Location unavailable. The Current may not flow accurately.
          </div>
        )}
      </div>

      {/* Gesture hints (only show briefly on first load) */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-white/10 font-mono text-center px-4">
        Double tap to change voice
        {isDebugMode && ' | Press D for debug'}
      </div>

      {/* Debug Panel */}
      {showDebugPanel && isDebugMode && (
        <div className="absolute top-4 right-4 bg-black/90 border border-white/30 rounded-lg p-4 max-w-xs z-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-mono text-white">Debug Mode</h3>
            <button
              onClick={() => setShowDebugPanel(false)}
              className="text-white/60 hover:text-white text-xs"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs text-white/60 font-mono block">
              Simulate Node:
            </label>
            <select
              value={currentNode?.slug || ''}
              onChange={(e) => setDebugNode(e.target.value || null)}
              className="w-full bg-black border border-white/30 rounded px-2 py-1 text-xs text-white font-mono"
            >
              <option value="">Use GPS (default)</option>
              {nodes.map((node) => (
                <option key={node.slug} value={node.slug}>
                  {node.name} ({node.slug})
                </option>
              ))}
            </select>
            
            {currentNode && (
              <div className="mt-2 text-xs text-white/40 font-mono">
                <div>Node: {currentNode.name}</div>
                <div>Segment: {currentSegment?.name}</div>
                <div>Coords: {currentNode.lat.toFixed(4)}, {currentNode.lon.toFixed(4)}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

