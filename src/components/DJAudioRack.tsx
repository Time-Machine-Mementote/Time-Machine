// DJ Audio Rack Component - Web Audio API Processing
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface DJAudioRackProps {
  audioElement?: HTMLAudioElement | null;
}

type Preset = 'archivist' | 'ghost' | 'confessional' | 'noise';

interface PresetConfig {
  intensity: number;
  space: number;
  grit: number;
  motion: number;
}

const PRESETS: Record<Preset, PresetConfig> = {
  archivist: { intensity: 0.2, space: 0.3, grit: 0.1, motion: 0.2 },
  ghost: { intensity: 0.6, space: 0.8, grit: 0.3, motion: 0.5 },
  confessional: { intensity: 0.4, space: 0.5, grit: 0.2, motion: 0.3 },
  noise: { intensity: 0.9, space: 0.2, grit: 0.9, motion: 0.8 },
};

// WeakMap to track source nodes per audio element (prevents multiple source nodes)
const sourceNodeMap = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>();

export function DJAudioRack({ audioElement }: DJAudioRackProps) {
  const [preset, setPreset] = useState<Preset>('archivist');
  const [intensity, setIntensity] = useState(0.2);
  const [space, setSpace] = useState(0.3);
  const [grit, setGrit] = useState(0.1);
  const [motion, setMotion] = useState(0.2);
  const [isReady, setIsReady] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Debug: log when component renders
  useEffect(() => {
    console.log('DJAudioRack rendered, audioElement:', audioElement ? 'present' : 'null');
  }, [audioElement]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const delayNodeRef = useRef<DelayNode | null>(null);
  const reverbConvolverRef = useRef<ConvolverNode | null>(null);
  const distortionRef = useRef<WaveShaperNode | null>(null);
  const lfoRef = useRef<OscillatorNode | null>(null);
  const lfoGainRef = useRef<GainNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const outputGainRef = useRef<GainNode | null>(null);
  const currentAudioElementRef = useRef<HTMLAudioElement | null>(null);

  // Mount portal target
  useEffect(() => {
    setMounted(true);
    console.log('DJAudioRack: Component mounted, ready to render');
  }, []);

  // Debug: log when component renders
  useEffect(() => {
    console.log('DJAudioRack rendered, audioElement:', audioElement ? 'present' : 'null', 'mounted:', mounted);
  }, [audioElement, mounted]);

  // Create simple reverb impulse response
  const createReverbImpulse = useCallback(() => {
    if (!audioContextRef.current || !reverbConvolverRef.current) return;
    
    const sampleRate = audioContextRef.current.sampleRate;
    const length = sampleRate * 2; // 2 seconds
    const impulse = audioContextRef.current.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 1.5);
      }
    }
    
    reverbConvolverRef.current.buffer = impulse;
  }, []);

  // Create distortion curve
  const makeDistortionCurve = (amount: number) => {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    
    return curve;
  };

  // Initialize Web Audio graph (only after user gesture)
  const initializeAudioGraph = useCallback(async () => {
    if (!audioElement) {
      console.warn('DJ Audio Rack: No audio element provided');
      return;
    }

    try {
      // Create AudioContext on first user gesture
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass();
        console.log('DJ Audio Rack: AudioContext created');
      }

      // Resume if suspended (user gesture required)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        console.log('[DJ RACK] AudioContext resumed');
      }

      // Check if we already have a source node for this element
      let sourceNode = sourceNodeMap.get(audioElement);
      
      if (!sourceNode) {
        // Create source from audio element (only once per element!)
        sourceNode = audioContextRef.current.createMediaElementSource(audioElement);
        sourceNodeMap.set(audioElement, sourceNode);
        console.log('DJ Audio Rack: MediaElementSource created');
      } else {
        console.log('DJ Audio Rack: Reusing existing MediaElementSource');
      }

      sourceNodeRef.current = sourceNode;
      currentAudioElementRef.current = audioElement;

      // Only create processing nodes if they don't exist
      if (!gainNodeRef.current) {
        gainNodeRef.current = audioContextRef.current.createGain();
        delayNodeRef.current = audioContextRef.current.createDelay(1.0);
        filterRef.current = audioContextRef.current.createBiquadFilter();
        filterRef.current.type = 'lowpass';
        outputGainRef.current = audioContextRef.current.createGain();
        outputGainRef.current.gain.value = 1.0; // Ensure output is audible (gain > 0)
        
        // Create distortion (WaveShaper)
        distortionRef.current = audioContextRef.current.createWaveShaper();
        distortionRef.current.curve = makeDistortionCurve(0);
        distortionRef.current.oversample = '4x';
        
        // Create LFO for motion
        lfoRef.current = audioContextRef.current.createOscillator();
        lfoRef.current.type = 'sine';
        lfoRef.current.frequency.value = 0.5;
        lfoGainRef.current = audioContextRef.current.createGain();
        lfoGainRef.current.gain.value = 0;
        
        // Create reverb (simple impulse response)
        reverbConvolverRef.current = audioContextRef.current.createConvolver();
        createReverbImpulse();
        
        // Connect: source -> gain -> filter -> delay -> reverb -> distortion -> output -> destination
        sourceNode
          .connect(gainNodeRef.current)
          .connect(filterRef.current)
          .connect(delayNodeRef.current)
          .connect(reverbConvolverRef.current)
          .connect(distortionRef.current)
          .connect(outputGainRef.current)
          .connect(audioContextRef.current.destination);
        
        // Connect LFO to filter frequency
        lfoRef.current.connect(lfoGainRef.current);
        lfoGainRef.current.connect(filterRef.current.frequency);
        lfoRef.current.start();
        
        console.log('[DJ RACK] Output connected');
        console.log('[DJ RACK] Output gain:', outputGainRef.current.gain.value);
        console.log('[DJ RACK] AudioContext state:', audioContextRef.current.state);
        console.log('[DJ RACK] Audio element playing:', !audioElement.paused);
        console.log('[DJ RACK] Audio element src:', audioElement.src || 'no src');
      } else {
        // If nodes exist but element changed, reconnect
        if (currentAudioElementRef.current !== audioElement) {
          // Disconnect old connections
          if (sourceNodeRef.current) {
            sourceNodeRef.current.disconnect();
          }
          
          // Ensure output gain is set
          if (outputGainRef.current) {
            outputGainRef.current.gain.value = 1.0;
          }
          
          // Reconnect with new source
          sourceNode
            .connect(gainNodeRef.current!)
            .connect(filterRef.current!)
            .connect(delayNodeRef.current!)
            .connect(reverbConvolverRef.current!)
            .connect(distortionRef.current!)
            .connect(outputGainRef.current!)
            .connect(audioContextRef.current!.destination);
          
          sourceNodeRef.current = sourceNode;
          currentAudioElementRef.current = audioElement;
          console.log('[DJ RACK] Reconnected to new audio element');
          console.log('[DJ RACK] Output connected');
        }
      }

      setIsReady(true);
      console.log('DJ Audio Rack: Initialized and ready');
    } catch (error) {
      console.error('DJ Audio Rack: Error initializing:', error);
      setIsReady(false);
    }
  }, [audioElement, createReverbImpulse]);

  // Update processing parameters
  useEffect(() => {
    if (!isReady || !audioContextRef.current) return;

    // Intensity: controls overall gain and filter resonance
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = 0.5 + intensity * 0.5;
    }
    if (filterRef.current) {
      filterRef.current.Q.value = 1 + intensity * 10;
    }

    // Space: controls delay and reverb mix
    if (delayNodeRef.current) {
      delayNodeRef.current.delayTime.value = space * 0.5;
    }

    // Grit: controls distortion amount
    if (distortionRef.current) {
      distortionRef.current.curve = makeDistortionCurve(grit * 50);
    }

    // Motion: controls LFO modulation depth
    if (lfoGainRef.current && filterRef.current) {
      const baseFreq = 2000;
      const modDepth = motion * 1000;
      lfoGainRef.current.gain.value = modDepth;
      filterRef.current.frequency.value = baseFreq;
    }
    
    // Ensure output gain is always > 0 (never muted)
    if (outputGainRef.current && outputGainRef.current.gain.value === 0) {
      outputGainRef.current.gain.value = 1.0;
    }
  }, [intensity, space, grit, motion, isReady]);

  // Apply preset
  const applyPreset = useCallback((presetName: Preset) => {
    const config = PRESETS[presetName];
    setPreset(presetName);
    setIntensity(config.intensity);
    setSpace(config.space);
    setGrit(config.grit);
    setMotion(config.motion);
  }, []);

  // Start audio context (user gesture required)
  const startAudioContext = useCallback(async () => {
    console.log('[DJ RACK] Output button clicked');
    await initializeAudioGraph();
    
    // Verify audio element is playing
    if (audioElement && audioContextRef.current) {
      const isPlaying = !audioElement.paused && audioElement.currentTime > 0;
      console.log('[DJ RACK] Audio playing:', isPlaying);
      console.log('[DJ RACK] AudioContext state:', audioContextRef.current.state);
      console.log('[DJ RACK] Output gain:', outputGainRef.current?.gain.value);
      
      // If audio element exists but isn't playing, try to play it
      if (!isPlaying && audioElement.src) {
        try {
          await audioElement.play();
          console.log('[DJ RACK] Audio element playback started');
        } catch (error) {
          console.warn('[DJ RACK] Could not start audio playback:', error);
        }
      }
    }
  }, [initializeAudioGraph, audioElement]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (lfoRef.current) {
        try {
          lfoRef.current.stop();
        } catch (e) {
          // Ignore errors on cleanup
        }
      }
    };
  }, []);

  const panelContent = (
    <div
      className="pointer-events-auto select-none"
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        zIndex: 2147483647, // Maximum z-index
        pointerEvents: 'auto',
        visibility: 'visible',
        display: 'block',
      }}
      onMouseEnter={() => console.log('DJ Rack panel is visible and interactive')}
    >
      <div className="bg-black border-2 border-white p-4 font-terminal text-white min-w-[320px]" style={{ borderRadius: '0' }}>
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white pb-2">
            <h3 className="text-sm font-bold">&gt; DJ_RACK</h3>
            {!isReady && (
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('[DJ RACK] Output button clicked');
                  startAudioContext();
                }}
                variant="outline"
                size="sm"
                className="pointer-events-auto text-xs border-white text-white hover:bg-white hover:text-black font-robotic"
                style={{ borderRadius: '0', pointerEvents: 'auto' }}
                disabled={false}
              >
                Start Audio
              </Button>
            )}
            {isReady && (
              <span className="text-xs text-green-400">● READY</span>
            )}
          </div>

          {/* Preset Selector */}
          <div className="space-y-2 pointer-events-auto">
            <label className="text-xs">PRESET:</label>
            <div className="grid grid-cols-2 gap-2">
              {(['archivist', 'ghost', 'confessional', 'noise'] as Preset[]).map((p) => (
                <Button
                  key={p}
                  onClick={() => applyPreset(p)}
                  variant={preset === p ? 'default' : 'outline'}
                  size="sm"
                  className={`pointer-events-auto text-xs border-white font-robotic ${
                    preset === p
                      ? 'bg-white text-black'
                      : 'text-white hover:bg-white hover:text-black'
                  }`}
                  style={{ borderRadius: '0' }}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* Macro Sliders */}
          <div className="space-y-3 pointer-events-auto">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>INTENSITY</span>
                <span>{(intensity * 100).toFixed(0)}%</span>
              </div>
              <div className="pointer-events-auto">
                <Slider
                  value={[intensity]}
                  onValueChange={([value]) => setIntensity(value)}
                  min={0}
                  max={1}
                  step={0.01}
                  className="w-full pointer-events-auto"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>SPACE</span>
                <span>{(space * 100).toFixed(0)}%</span>
              </div>
              <div className="pointer-events-auto">
                <Slider
                  value={[space]}
                  onValueChange={([value]) => setSpace(value)}
                  min={0}
                  max={1}
                  step={0.01}
                  className="w-full pointer-events-auto"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>GRIT</span>
                <span>{(grit * 100).toFixed(0)}%</span>
              </div>
              <div className="pointer-events-auto">
                <Slider
                  value={[grit]}
                  onValueChange={([value]) => setGrit(value)}
                  min={0}
                  max={1}
                  step={0.01}
                  className="w-full pointer-events-auto"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>MOTION</span>
                <span>{(motion * 100).toFixed(0)}%</span>
              </div>
              <div className="pointer-events-auto">
                <Slider
                  value={[motion]}
                  onValueChange={([value]) => setMotion(value)}
                  min={0}
                  max={1}
                  step={0.01}
                  className="w-full pointer-events-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render via portal to ensure it's above everything
  if (!mounted) {
    console.log('DJAudioRack: Not mounted yet, returning null');
    return null;
  }
  
  console.log('DJAudioRack: Rendering panel via portal to document.body');
  return createPortal(panelContent, document.body);
}
 