// Audio Queue System for Berkeley Memory Map
import type { Memory, AudioQueueItem, UserLocation } from '@/types/memory';
import { PRIORITY_WEIGHTS } from '@/types/memory';

export class AudioQueue {
  private queue: AudioQueueItem[] = [];
  private currentlyPlaying: AudioQueueItem | null = null;
  private currentlyPlaying2: AudioQueueItem | null = null; // Second audio track
  private lastPlayedTimes: Map<string, number> = new Map();
  private lastPlayedSegments: Map<string, number> = new Map(); // Track which segment was last played for each memory
  private audioElement: HTMLAudioElement | null = null;
  private audioElement2: HTMLAudioElement | null = null; // Second audio element
  private isMuted = true; // Start muted - user must click Output to start
  private cooldownMs = 15000; // 15 seconds default cooldown (reduced from 90s)
  private segmentDuration = 5; // 5 seconds per segment
  private segmentTimeout: NodeJS.Timeout | null = null;
  private segmentTimeout2: NodeJS.Timeout | null = null; // Second timeout
  private playbackMonitorInterval: NodeJS.Timeout | null = null; // Monitor to keep playback going

  constructor() {
    // Initialize first audio element
    this.audioElement = new Audio();
    this.audioElement.preload = 'auto';
    this.audioElement.crossOrigin = 'anonymous';
    
    // Initialize second audio element
    this.audioElement2 = new Audio();
    this.audioElement2.preload = 'auto';
    this.audioElement2.crossOrigin = 'anonymous';
    
    // Handle page visibility changes to maintain playback
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !this.isMuted) {
        if (this.currentlyPlaying && this.audioElement && this.audioElement.paused) {
          this.audioElement.play().catch(err => {
            console.warn('Failed to resume audio 1 after visibility change:', err);
          });
        }
        if (this.currentlyPlaying2 && this.audioElement2 && this.audioElement2.paused) {
          this.audioElement2.play().catch(err => {
            console.warn('Failed to resume audio 2 after visibility change:', err);
          });
        }
      }
    });
    
    // Handle page unload - ensure audio continues if possible
    window.addEventListener('beforeunload', () => {
      // Audio should continue playing in background if Media Session is set up
      if ((this.currentlyPlaying || this.currentlyPlaying2) && 'mediaSession' in navigator) {
        // Media Session API will handle lock screen controls
      }
    });
    
    // First audio element events
    this.audioElement.addEventListener('ended', () => {
      this.currentlyPlaying = null;
      if (this.segmentTimeout) {
        clearTimeout(this.segmentTimeout);
        this.segmentTimeout = null;
      }
      this.playNext();
    });

    this.audioElement.addEventListener('loadedmetadata', () => {
      if (this.currentlyPlaying && this.audioElement) {
        this.handleSegmentPlayback(this.audioElement, this.currentlyPlaying, 1);
      }
    });

    this.audioElement.addEventListener('error', (error) => {
      console.error('Audio 1 playback error:', error);
      this.currentlyPlaying = null;
      if (this.segmentTimeout) {
        clearTimeout(this.segmentTimeout);
        this.segmentTimeout = null;
      }
      this.playNext();
    });

    // Second audio element events
    this.audioElement2.addEventListener('ended', () => {
      this.currentlyPlaying2 = null;
      if (this.segmentTimeout2) {
        clearTimeout(this.segmentTimeout2);
        this.segmentTimeout2 = null;
      }
      this.playNext();
    });

    this.audioElement2.addEventListener('loadedmetadata', () => {
      if (this.currentlyPlaying2 && this.audioElement2) {
        this.handleSegmentPlayback(this.audioElement2, this.currentlyPlaying2, 2);
      }
    });

    this.audioElement2.addEventListener('error', (error) => {
      console.error('Audio 2 playback error:', error);
      this.currentlyPlaying2 = null;
      if (this.segmentTimeout2) {
        clearTimeout(this.segmentTimeout2);
        this.segmentTimeout2 = null;
      }
      // Don't stop - keep trying to play next
      this.playNext();
    });

    // Add pause event listeners to detect unexpected pauses
    this.audioElement.addEventListener('pause', () => {
      // If not muted and we have something playing, resume
      if (!this.isMuted && this.currentlyPlaying) {
        console.log('Audio 1 paused unexpectedly, resuming...');
        this.audioElement?.play().catch(err => {
          console.warn('Failed to resume audio 1 after pause:', err);
        });
      }
    });

    this.audioElement2.addEventListener('pause', () => {
      // If not muted and we have something playing, resume
      if (!this.isMuted && this.currentlyPlaying2) {
        console.log('Audio 2 paused unexpectedly, resuming...');
        this.audioElement2?.play().catch(err => {
          console.warn('Failed to resume audio 2 after pause:', err);
        });
      }
    });

    // Start playback monitor to ensure continuous playback
    this.startPlaybackMonitor();

    // Set up Media Session API for lock screen controls
    this.setupMediaSession();
  }

  // Add memory to queue with priority calculation
  addMemory(memory: Memory, userLocation: UserLocation, isOwner: boolean, isFriend: boolean, skipDistanceCheck: boolean = false) {
    // Skip if memory doesn't have audio
    if (!memory.audio_url) {
      console.log('Skipping memory without audio_url:', memory.id);
      return;
    }

    const now = Date.now();
    const lastPlayed = this.lastPlayedTimes.get(memory.id) || 0;
    
    // Skip if still in cooldown
    if (now - lastPlayed < this.cooldownMs) {
      console.log('Memory still in cooldown:', memory.id, 'cooldown remaining:', this.cooldownMs - (now - lastPlayed), 'ms');
      return;
    }

    // Calculate distance (simplified - in real app use proper distance calculation)
    const distance = this.calculateDistance(
      userLocation.lat, userLocation.lng,
      memory.lat, memory.lng
    );

    // Skip if too far (unless distance check is skipped for exhibition mode)
    if (!skipDistanceCheck && distance > memory.radius_m) {
      console.log('Memory too far:', memory.id, 'distance:', distance, 'radius:', memory.radius_m);
      return;
    }

    console.log('Adding memory to audio queue:', memory.id, 'audio_url:', memory.audio_url, 'distance:', distance);

    // Calculate priority
    let priority = 0;
    if (isOwner) priority += PRIORITY_WEIGHTS.OWNER;
    else if (isFriend) priority += PRIORITY_WEIGHTS.FRIEND;
    else priority += PRIORITY_WEIGHTS.PUBLIC;

    // Distance bonus (closer = higher priority)
    priority += (memory.radius_m - distance) * PRIORITY_WEIGHTS.DISTANCE;

    // Freshness bonus
    const ageHours = (now - new Date(memory.created_at).getTime()) / (1000 * 60 * 60);
    priority += Math.max(0, 24 - ageHours) * PRIORITY_WEIGHTS.FRESHNESS;

    const queueItem: AudioQueueItem = {
      memory,
      priority,
      distance,
      queuedAt: now,
    };

    // Remove existing item for this memory if present
    this.queue = this.queue.filter(item => item.memory.id !== memory.id);
    
    // Add new item
    this.queue.push(queueItem);
    
    // Randomize the queue order instead of sorting by priority
    this.shuffleQueue();

    // Start playing if nothing is currently playing
    if (!this.currentlyPlaying && !this.isMuted) {
      this.playNext();
    }
  }

  // Fisher-Yates shuffle algorithm to randomize queue order
  private shuffleQueue() {
    for (let i = this.queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
    }
  }

  // Set up Media Session API for lock screen controls
  private setupMediaSession() {
    if ('mediaSession' in navigator) {
      // Set up action handlers
      navigator.mediaSession.setActionHandler('play', () => {
        if (this.audioElement && this.currentlyPlaying && this.isMuted) {
          this.unmute();
        }
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        if (this.audioElement && this.currentlyPlaying) {
          this.mute();
        }
      });

      navigator.mediaSession.setActionHandler('stop', () => {
        this.mute();
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        this.skip();
      });

      // Preload next track action (if supported)
      if (navigator.mediaSession.setActionHandler.length > 0) {
        try {
          navigator.mediaSession.setActionHandler('previoustrack', () => {
            // Not implemented - memories play in order
          });
        } catch (e) {
          // Some browsers don't support all actions
        }
      }
    }
  }

  // Update Media Session metadata
  private updateMediaSession(item: AudioQueueItem | null) {
    if ('mediaSession' in navigator && item) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: item.memory.summary || 'Memory',
        artist: item.memory.place_name || 'Time Machine',
        album: 'Time Machine Memories',
        artwork: [
          {
            src: '/favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
        ],
      });
    } else if ('mediaSession' in navigator) {
      // Clear metadata when nothing is playing
      navigator.mediaSession.metadata = null;
    }
  }

  // Handle 5-second segment playback
  private handleSegmentPlayback(audioElement: HTMLAudioElement, item: AudioQueueItem, trackNumber: number) {
    if (!item || !audioElement) return;

    const memoryId = item.memory.id;
    const duration = audioElement.duration;
    
    if (!duration || isNaN(duration)) {
      console.warn(`Audio ${trackNumber} duration not available, playing full audio`);
      return;
    }

    // Get the last played segment index for this memory (default to -1 for first play)
    const lastSegment = this.lastPlayedSegments.get(memoryId) ?? -1;
    
    // Calculate next segment (rotate through segments)
    const totalSegments = Math.ceil(duration / this.segmentDuration);
    const nextSegment = (lastSegment + 1) % totalSegments;
    const segmentStart = nextSegment * this.segmentDuration;
    const segmentEnd = Math.min(segmentStart + this.segmentDuration, duration);

    // Update the segment index for next time
    this.lastPlayedSegments.set(memoryId, nextSegment);

    // Set the start time
    audioElement.currentTime = segmentStart;

    console.log(`Track ${trackNumber}: Playing segment ${nextSegment + 1}/${totalSegments} (${segmentStart.toFixed(1)}s - ${segmentEnd.toFixed(1)}s) for memory:`, memoryId);

    // Set up timeout to stop after 5 seconds
    const timeoutRef = trackNumber === 1 ? this.segmentTimeout : this.segmentTimeout2;
    if (timeoutRef) {
      clearTimeout(timeoutRef);
    }

    const timeout = setTimeout(() => {
      if (audioElement && item) {
        audioElement.pause();
        console.log(`Track ${trackNumber}: Segment playback completed, moving to next`);
        if (trackNumber === 1) {
          this.currentlyPlaying = null;
          this.segmentTimeout = null;
        } else {
          this.currentlyPlaying2 = null;
          this.segmentTimeout2 = null;
        }
        this.playNext();
      }
    }, this.segmentDuration * 1000);

    if (trackNumber === 1) {
      this.segmentTimeout = timeout;
    } else {
      this.segmentTimeout2 = timeout;
    }
  }

  // Play the next item in queue (plays up to 2 simultaneously)
  private playNext() {
    if (this.isMuted) {
      console.log('Audio queue is muted, skipping playback');
      return;
    }

    // Try to fill both audio slots
    while ((!this.currentlyPlaying || !this.currentlyPlaying2) && this.queue.length > 0) {
      // Randomly select next item from queue
      const randomIndex = Math.floor(Math.random() * this.queue.length);
      const nextItem = this.queue.splice(randomIndex, 1)[0];
      if (!nextItem || !nextItem.memory.audio_url) {
        continue;
      }

      // Determine which track to use
      const useTrack1 = !this.currentlyPlaying;
      const audioElement = useTrack1 ? this.audioElement! : this.audioElement2!;
      const trackNumber = useTrack1 ? 1 : 2;

      if (useTrack1) {
        this.currentlyPlaying = nextItem;
      } else {
        this.currentlyPlaying2 = nextItem;
      }

      this.lastPlayedTimes.set(nextItem.memory.id, Date.now());

      console.log(`Track ${trackNumber}: Playing audio for memory:`, nextItem.memory.id, 'URL:', nextItem.memory.audio_url);
      
      // Set volume to a reasonable level
      audioElement.volume = 0.7;
      
      audioElement.src = nextItem.memory.audio_url;
      // Load the audio to start buffering immediately
      audioElement.load();
      
      // Update Media Session metadata (use first track)
      if (useTrack1) {
        this.updateMediaSession(nextItem);
      }
      
      // Try to play - browsers may require user interaction first
      const playPromise = audioElement.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log(`✅ Track ${trackNumber}: Audio playback started successfully for memory:`, nextItem.memory.id);
            // Update playback state in Media Session
            if ('mediaSession' in navigator && useTrack1) {
              navigator.mediaSession.playbackState = 'playing';
            }
            // Handle segment playback once metadata is loaded
            // If duration is already available, handle it immediately
            if (audioElement.duration && !isNaN(audioElement.duration)) {
              this.handleSegmentPlayback(audioElement, nextItem, trackNumber);
            }
          })
          .catch(error => {
            console.error(`❌ Track ${trackNumber}: Failed to play audio:`, error.name, error.message);
            // If autoplay is blocked, we'll need user interaction
            if (error.name === 'NotAllowedError' || error.name === 'NotSupportedError') {
              console.warn(`⚠️ Track ${trackNumber}: Autoplay blocked. User interaction required. Adding back to queue.`);
              // Add back to queue to try again
              this.queue.push(nextItem);
              if (useTrack1) {
                this.currentlyPlaying = null;
              } else {
                this.currentlyPlaying2 = null;
              }
              if (useTrack1) {
                this.updateMediaSession(null);
              }
            } else {
              // Other errors - skip this item
              console.error(`Track ${trackNumber}: Audio error details:`, error);
              if (useTrack1) {
                this.currentlyPlaying = null;
              } else {
                this.currentlyPlaying2 = null;
              }
              if (useTrack1) {
                this.updateMediaSession(null);
              }
            }
          });
      } else {
        // Fallback if play() does not return a promise
        console.log(`Track ${trackNumber}: Audio play() did not return a promise, assuming it started`);
        if ('mediaSession' in navigator && useTrack1) {
          navigator.mediaSession.playbackState = 'playing';
        }
        if (audioElement.duration && !isNaN(audioElement.duration)) {
          this.handleSegmentPlayback(audioElement, nextItem, trackNumber);
        }
      }
    }

    // If queue is empty and nothing is playing, keep waiting
    // The playback monitor will check periodically and resume when new memories are added
    if (this.queue.length === 0 && !this.currentlyPlaying && !this.currentlyPlaying2) {
      console.log('Audio queue is empty, waiting for more memories...');
      // Don't update media session - keep it ready
      // The geofencing system will add more memories as user moves
      // The playback monitor will automatically start playing when queue has items
    }
  }

  // Calculate distance between two points (Haversine formula)
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Public methods
  mute() {
    this.isMuted = true;
    if (this.audioElement) {
      this.audioElement.pause();
    }
    if (this.audioElement2) {
      this.audioElement2.pause();
    }
    if (this.segmentTimeout) {
      clearTimeout(this.segmentTimeout);
      this.segmentTimeout = null;
    }
    if (this.segmentTimeout2) {
      clearTimeout(this.segmentTimeout2);
      this.segmentTimeout2 = null;
    }
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
    }
    // Stop playback monitor when muted
    this.stopPlaybackMonitor();
  }

  unmute() {
    this.isMuted = false;
    // Resume both audio tracks if they were playing
    if (this.currentlyPlaying && this.audioElement) {
      this.audioElement.play().catch(err => {
        console.warn('Failed to resume audio 1:', err);
        this.currentlyPlaying = null;
      });
    }
    if (this.currentlyPlaying2 && this.audioElement2) {
      this.audioElement2.play().catch(err => {
        console.warn('Failed to resume audio 2:', err);
        this.currentlyPlaying2 = null;
      });
    }
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing';
    }
    // If nothing is playing, start playing
    if (!this.currentlyPlaying && !this.currentlyPlaying2) {
      this.playNext();
    }
    // Restart playback monitor
    this.startPlaybackMonitor();
  }

  // Unlock audio for mobile browsers - MUST be called directly from user gesture (click/tap)
  // This plays a silent sound to "warm up" the audio elements so they can play later
  async unlockAudio(): Promise<boolean> {
    console.log('🔓 Attempting to unlock audio for mobile...');
    
    try {
      // Create AudioContext and resume it (required for some browsers)
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const audioContext = new AudioContext();
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
          console.log('✅ AudioContext resumed');
        }
        
        // Play a silent sound to fully unlock
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0; // Silent
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.001);
      }

      // Also try to play/pause on both audio elements to unlock them
      if (this.audioElement) {
        // Set a data URL for a tiny silent audio
        const silentAudio = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
        this.audioElement.src = silentAudio;
        this.audioElement.volume = 0;
        await this.audioElement.play();
        this.audioElement.pause();
        this.audioElement.src = '';
        this.audioElement.volume = 0.7;
        console.log('✅ Audio element 1 unlocked');
      }

      if (this.audioElement2) {
        const silentAudio = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
        this.audioElement2.src = silentAudio;
        this.audioElement2.volume = 0;
        await this.audioElement2.play();
        this.audioElement2.pause();
        this.audioElement2.src = '';
        this.audioElement2.volume = 0.7;
        console.log('✅ Audio element 2 unlocked');
      }

      console.log('🔓 Audio unlock complete!');
      return true;
    } catch (error) {
      console.warn('⚠️ Audio unlock failed:', error);
      return false;
    }
  }

  // Check if audio is likely locked (for mobile detection)
  isLikelyMobile(): boolean {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  }

  // Monitor to ensure playback continues
  private startPlaybackMonitor() {
    // Clear existing monitor
    if (this.playbackMonitorInterval) {
      clearInterval(this.playbackMonitorInterval);
    }

    // Check every 2 seconds to ensure playback continues
    this.playbackMonitorInterval = setInterval(() => {
      if (this.isMuted) {
        return; // Don't monitor if muted
      }

      // Check if audio 1 should be playing but isn't
      if (this.currentlyPlaying && this.audioElement && this.audioElement.paused) {
        console.log('Audio 1 is paused but should be playing, resuming...');
        this.audioElement.play().catch(err => {
          console.warn('Failed to resume audio 1 in monitor:', err);
          // If resume fails, try playing next
          this.currentlyPlaying = null;
          this.playNext();
        });
      }

      // Check if audio 2 should be playing but isn't
      if (this.currentlyPlaying2 && this.audioElement2 && this.audioElement2.paused) {
        console.log('Audio 2 is paused but should be playing, resuming...');
        this.audioElement2.play().catch(err => {
          console.warn('Failed to resume audio 2 in monitor:', err);
          // If resume fails, try playing next
          this.currentlyPlaying2 = null;
          this.playNext();
        });
      }

      // If nothing is playing and queue is empty, try to play next (in case new memories were added)
      if (!this.currentlyPlaying && !this.currentlyPlaying2 && this.queue.length > 0) {
        console.log('Nothing playing but queue has items, starting playback...');
        this.playNext();
      }
    }, 2000); // Check every 2 seconds
  }

  private stopPlaybackMonitor() {
    if (this.playbackMonitorInterval) {
      clearInterval(this.playbackMonitorInterval);
      this.playbackMonitorInterval = null;
    }
  }

  skip() {
    if (this.audioElement) {
      this.audioElement.pause();
    }
    if (this.audioElement2) {
      this.audioElement2.pause();
    }
    if (this.segmentTimeout) {
      clearTimeout(this.segmentTimeout);
      this.segmentTimeout = null;
    }
    if (this.segmentTimeout2) {
      clearTimeout(this.segmentTimeout2);
      this.segmentTimeout2 = null;
    }
    this.currentlyPlaying = null;
    this.currentlyPlaying2 = null;
    this.updateMediaSession(null);
    this.playNext();
  }

  clear() {
    this.queue = [];
    if (this.audioElement) {
      this.audioElement.pause();
    }
    if (this.audioElement2) {
      this.audioElement2.pause();
    }
    if (this.segmentTimeout) {
      clearTimeout(this.segmentTimeout);
      this.segmentTimeout = null;
    }
    if (this.segmentTimeout2) {
      clearTimeout(this.segmentTimeout2);
      this.segmentTimeout2 = null;
    }
    this.currentlyPlaying = null;
    this.currentlyPlaying2 = null;
    this.updateMediaSession(null);
    this.stopPlaybackMonitor();
  }

  getCurrentlyPlaying(): AudioQueueItem | null {
    return this.currentlyPlaying;
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  getQueue(): AudioQueueItem[] {
    return [...this.queue];
  }

  getPrimaryAudioElement(): HTMLAudioElement | null {
    return this.audioElement;
  }

  setCooldown(cooldownMs: number) {
    this.cooldownMs = cooldownMs;
  }

  // Clean up old play times to prevent memory leaks
  cleanup() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [memoryId, timestamp] of this.lastPlayedTimes.entries()) {
      if (now - timestamp > maxAge) {
        this.lastPlayedTimes.delete(memoryId);
      }
    }
  }
}

// Singleton instance
export const audioQueue = new AudioQueue();
