// Audio Queue System for Berkeley Memory Map
import type { Memory, AudioQueueItem, UserLocation } from '@/types/memory';
import { PRIORITY_WEIGHTS } from '@/types/memory';

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

    // Calculate distance (simplified - in real app use proper distance calculation)
    const distance = this.calculateDistance(
      userLocation.lat, userLocation.lng,
      memory.lat, memory.lng
    );

    // Skip if too far
    if (distance > memory.radius_m) {
      return;
    }

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
    
    // Sort by priority (highest first)
    this.queue.sort((a, b) => b.priority - a.priority);

    // Start playing if nothing is currently playing
    if (!this.currentlyPlaying && !this.isMuted) {
      this.playNext();
    }
  }

  // Play the next item in queue
  private playNext() {
    if (this.isMuted || this.queue.length === 0) {
      return;
    }

    const nextItem = this.queue.shift();
    if (!nextItem) return;

    this.currentlyPlaying = nextItem;
    this.lastPlayedTimes.set(nextItem.memory.id, Date.now());

    if (nextItem.memory.audio_url) {
      this.audioElement!.src = nextItem.memory.audio_url;
      this.audioElement!.play().catch(error => {
        console.error('Failed to play audio:', error);
        this.currentlyPlaying = null;
        this.playNext();
      });
    } else {
      console.warn('No audio URL for memory:', nextItem.memory.id);
      this.currentlyPlaying = null;
      this.playNext();
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
