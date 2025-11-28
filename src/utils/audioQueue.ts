// Audio Queue System for Berkeley Memory Map
// Uses memory scoring and Turf.js for distance calculation
import type { Memory, AudioQueueItem, UserLocation } from '@/types/memory';
import { PRIORITY_WEIGHTS } from '@/types/memory';
import { computeMemoryScore } from './memoryScoring';
import distance from '@turf/distance';
import { point } from '@turf/helpers';

export class AudioQueue {
  private queue: AudioQueueItem[] = [];
  private currentlyPlaying: AudioQueueItem | null = null;
  private lastPlayedTimes: Map<string, number> = new Map();
  private audioElement: HTMLAudioElement | null = null;
  private isMuted = false;
  private cooldownMs = 90000; // 90 seconds default cooldown

  constructor() {
    this.audioElement = new Audio();
    this.audioElement.preload = 'none';
    
    this.audioElement.addEventListener('ended', () => {
      this.currentlyPlaying = null;
      this.playNext();
    });

    this.audioElement.addEventListener('error', (error) => {
      console.error('Audio playback error:', error);
      this.currentlyPlaying = null;
      this.playNext();
    });
  }

  // Add memory to queue with priority calculation
  addMemory(memory: Memory, userLocation: UserLocation, isOwner: boolean, isFriend: boolean) {
    const now = Date.now();
    const lastPlayed = this.lastPlayedTimes.get(memory.id) || 0;
    
    // Skip if still in cooldown
    if (now - lastPlayed < this.cooldownMs) {
      return;
    }

    // Calculate distance using Turf.js
    const userPoint = point([userLocation.lng, userLocation.lat]);
    const memoryPoint = point([memory.lng, memory.lat]);
    const dist = distance(userPoint, memoryPoint, { units: 'meters' });

    // Skip if too far
    if (dist > memory.radius_m) {
      return;
    }

    // Use memory scoring system (combines distance + emotion)
    const memoryScore = computeMemoryScore(memory, {
      lat: userLocation.lat,
      lng: userLocation.lng,
    });

    // Calculate base priority from relationship
    let priority = 0;
    if (isOwner) priority += PRIORITY_WEIGHTS.OWNER;
    else if (isFriend) priority += PRIORITY_WEIGHTS.FRIEND;
    else priority += PRIORITY_WEIGHTS.PUBLIC;

    // Multiply by memory score (0-1) for weighted scoring
    priority *= memoryScore;

    // Freshness bonus
    const ageHours = (now - new Date(memory.created_at).getTime()) / (1000 * 60 * 60);
    priority += Math.max(0, 24 - ageHours) * PRIORITY_WEIGHTS.FRESHNESS;

    const queueItem: AudioQueueItem = {
      memory,
      priority,
      distance: dist,
      queuedAt: now,
    };

    // Remove existing item for this memory if present
    this.queue = this.queue.filter(item => item.memory.id !== memory.id);
    
    // Add new item
    this.queue.push(queueItem);
    
    // Sort by priority (highest first)
    this.queue.sort((a, b) => b.priority - a.priority);

    // Start playing if nothing is currently playing
    if (!this.currentlyPlaying && !this.isMuted) {
      this.playNext();
    }
  }

  // Play the next item in queue with fade transitions
  private async playNext() {
    if (this.isMuted || this.queue.length === 0) {
      return;
    }

    const nextItem = this.queue.shift();
    if (!nextItem) return;

    // Fade out current audio if playing
    if (this.audioElement && !this.audioElement.paused) {
      await this.fadeOut(this.audioElement, 500); // 500ms fade out
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }

    this.currentlyPlaying = nextItem;
    this.lastPlayedTimes.set(nextItem.memory.id, Date.now());

    if (nextItem.memory.audio_url) {
      try {
        // Validate URL format
        if (!nextItem.memory.audio_url || !nextItem.memory.audio_url.startsWith('http')) {
          throw new Error('Invalid audio URL format');
        }

        this.audioElement!.src = nextItem.memory.audio_url;
        this.audioElement!.volume = 0; // Start at 0 for fade in
        
        // Set up error handler before loading
        this.audioElement!.onerror = (e) => {
          console.error('Audio element error:', e);
          console.error('Audio URL:', nextItem.memory.audio_url);
          console.error('Memory ID:', nextItem.memory.id);
          this.currentlyPlaying = null;
          this.playNext();
        };
        
        // Set up end handler
        this.audioElement!.onended = () => {
          this.currentlyPlaying = null;
          this.playNext();
        };
        
        // Load and play
        await this.audioElement!.load();
        await this.audioElement!.play();
        await this.fadeIn(this.audioElement!, 500); // 500ms fade in
        
      } catch (error: any) {
        console.error('Failed to play audio:', error);
        console.error('Audio URL:', nextItem.memory.audio_url);
        console.error('Memory ID:', nextItem.memory.id);
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          code: error.code,
        });
        
        // More detailed error logging
        if (error.message?.includes('load') || error.message?.includes('Invalid')) {
          console.error('❌ Audio file failed to load. Possible causes:');
          console.error('  1. URL is invalid or file does not exist in Supabase Storage');
          console.error('  2. File may not be publicly accessible');
          console.error('  3. CORS issue with storage bucket');
          console.error('  → Click on memory marker to regenerate audio');
        } else if (error.message?.includes('play') || error.name === 'NotAllowedError') {
          console.error('⚠️ Audio playback was blocked. Browser requires user interaction first.');
          console.error('  → Try clicking on a memory marker to play audio');
        } else {
          console.error('❌ Unknown audio playback error');
        }
        
        this.currentlyPlaying = null;
        this.playNext();
      }
    } else {
      console.warn('No audio URL for memory:', nextItem.memory.id, '- Memory needs audio generation');
      console.warn('Memory text:', nextItem.memory.text?.substring(0, 50) + '...');
      // Skip this memory - it needs audio generation first
      // In a real scenario, you might want to trigger audio generation here
      this.currentlyPlaying = null;
      this.playNext();
    }
  }

  // Fade out audio
  private fadeOut(audio: HTMLAudioElement, duration: number): Promise<void> {
    return new Promise((resolve) => {
      const startVolume = audio.volume;
      const startTime = Date.now();
      
      const fade = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        audio.volume = startVolume * (1 - progress);
        
        if (progress < 1) {
          requestAnimationFrame(fade);
        } else {
          resolve();
        }
      };
      
      fade();
    });
  }

  // Fade in audio
  private fadeIn(audio: HTMLAudioElement, duration: number): Promise<void> {
    return new Promise((resolve) => {
      const targetVolume = 1.0;
      const startTime = Date.now();
      
      const fade = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        audio.volume = targetVolume * progress;
        
        if (progress < 1) {
          requestAnimationFrame(fade);
        } else {
          resolve();
        }
      };
      
      fade();
    });
  }


  // Public methods
  mute() {
    this.isMuted = true;
    if (this.audioElement) {
      this.audioElement.pause();
    }
  }

  unmute() {
    this.isMuted = false;
    if (!this.currentlyPlaying) {
      this.playNext();
    }
  }

  skip() {
    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.currentlyPlaying = null;
    this.playNext();
  }

  clear() {
    this.queue = [];
    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.currentlyPlaying = null;
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
