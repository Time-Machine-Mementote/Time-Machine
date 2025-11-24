// The Current: Location engine for GPS node detection

import type { Node } from './nodes';
import { nodes } from './nodes';

/**
 * Calculate distance between two coordinates in meters using Haversine formula
 */
export function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Find the nearest node to the given coordinates
 * Returns null if no node is within its radius
 */
export function findNearestNode(
  lat: number,
  lon: number,
  nodeList: Node[] = nodes
): Node | null {
  let nearest: Node | null = null;
  let minDistance = Infinity;

  for (const node of nodeList) {
    const distance = distanceMeters(lat, lon, node.lat, node.lon);
    if (distance <= node.radius && distance < minDistance) {
      minDistance = distance;
      nearest = node;
    }
  }

  return nearest;
}

/**
 * Find all nodes within a given radius (for debugging or multi-node detection)
 */
export function findNodesWithinRadius(
  lat: number,
  lon: number,
  radiusMeters: number,
  nodeList: Node[] = nodes
): Node[] {
  return nodeList.filter((node) => {
    const distance = distanceMeters(lat, lon, node.lat, node.lon);
    return distance <= radiusMeters;
  });
}

