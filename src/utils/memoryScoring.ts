// Memory Scoring System for Geo-Audio Output
// Uses Turf.js for distance calculation and weighted scoring
import distance from '@turf/distance';
import { point } from '@turf/helpers';
import type { Memory, UserLocation } from '@/types/memory';

/**
 * Compute memory score based on distance and emotion
 * Uses Gaussian falloff for distance and weighted emotion factor
 * 
 * @param memory - The memory to score
 * @param userCoords - User's current location
 * @returns Score between 0 and 1 (higher = more priority)
 */
export function computeMemoryScore(
  memory: Memory,
  userCoords: { lat: number; lng: number }
): number {
  // Calculate distance using Turf.js (in meters)
  const userPoint = point([userCoords.lng, userCoords.lat]);
  const memoryPoint = point([memory.lng, memory.lat]);
  const d = distance(userPoint, memoryPoint, { units: 'meters' });

  // Gaussian falloff for distance (sigma = 10 meters)
  // Closer memories get exponentially higher scores
  const distanceFactor = Math.exp(-Math.pow(d, 2) / (2 * Math.pow(10, 2)));

  // Emotion factor (0-1, default 0.5 if not set)
  const emotionFactor = memory.emotion ?? 0.5;

  // Weighted combination: 70% distance, 30% emotion
  const score = 0.7 * distanceFactor + 0.3 * emotionFactor;

  return Math.max(0, Math.min(1, score)); // Clamp to [0, 1]
}

/**
 * Get the best memory to play from a list of nearby memories
 * Uses scoring to prioritize which memory should play
 */
export function getBestMemory(
  memories: Memory[],
  userCoords: { lat: number; lng: number }
): Memory | null {
  if (memories.length === 0) return null;

  // Score all memories
  const scored = memories.map(memory => ({
    memory,
    score: computeMemoryScore(memory, userCoords),
  }));

  // Sort by score (highest first)
  scored.sort((a, b) => b.score - a.score);

  // Return the highest scoring memory
  return scored[0].memory;
}

/**
 * Filter memories within radius and return sorted by score
 */
export function filterAndScoreMemories(
  memories: Memory[],
  userCoords: { lat: number; lng: number },
  maxRadius: number = 20
): Memory[] {
  const userPoint = point([userCoords.lng, userCoords.lat]);

  return memories
    .filter(memory => {
      const memoryPoint = point([memory.lng, memory.lat]);
      const d = distance(userPoint, memoryPoint, { units: 'meters' });
      return d <= maxRadius;
    })
    .map(memory => ({
      memory,
      score: computeMemoryScore(memory, userCoords),
    }))
    .sort((a, b) => b.score - a.score)
    .map(item => item.memory);
}

