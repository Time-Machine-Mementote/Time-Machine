// The Current: Static path and node definitions
// Defines 4 segments and 12-14 nodes along the Wurster → Campanile route

export type Segment = {
  id: string;
  name: string;
  slug: string;
  order: number;
  theme: string;
  ambientUrl?: string | null;
};

export type Node = {
  id: string;
  segmentId: string;
  name: string;
  slug: string;
  lat: number;
  lon: number;
  radius: number; // meters
  order: number;
  description: string;
};

// UC Berkeley approximate coordinates
// Wurster Courtyard: ~37.8705, -122.2545
// 4.0 Hill: ~37.8715, -122.2555
// Strawberry Creek bridge: ~37.8725, -122.2565
// Campanile: ~37.8720, -122.2580

export const segments: Segment[] = [
  {
    id: 'seg-wurster',
    name: 'Wurster / Concrete Current',
    slug: 'seg-wurster',
    order: 1,
    theme: 'Concrete canopy, drafting tables, echo under the Morrison eave.',
    ambientUrl: null, // Placeholder for ambient audio
  },
  {
    id: 'seg-hill',
    name: '4.0 Hill / Sloping Current',
    slug: 'seg-hill',
    order: 2,
    theme: 'Grass slope, warm afternoons, bodies lying in the amphitheater of west-facing grass.',
    ambientUrl: null,
  },
  {
    id: 'seg-creek',
    name: 'Strawberry Creek / Crossing Current',
    slug: 'seg-creek',
    order: 3,
    theme: 'Water folding through campus time beneath the small bridge.',
    ambientUrl: null,
  },
  {
    id: 'seg-campanile',
    name: 'Campanile / Vertical Current',
    slug: 'seg-campanile',
    order: 4,
    theme: 'Stone, bells, and the western slit of sky framing the Golden Gate.',
    ambientUrl: null,
  },
];

export const nodes: Node[] = [
  // Segment Wurster
  {
    id: 'node-wurster-center',
    segmentId: 'seg-wurster',
    name: 'Wurster Center',
    slug: 'node-wurster-center',
    lat: 37.8705,
    lon: -122.2545,
    radius: 15,
    order: 1,
    description: 'You stand in the middle of Wurster Courtyard. Concrete slabs rise around you, studio windows watching.',
  },
  {
    id: 'node-morrison-eave',
    segmentId: 'seg-wurster',
    name: 'Morrison Eave',
    slug: 'node-morrison-eave',
    lat: 37.8707,
    lon: -122.2547,
    radius: 10,
    order: 2,
    description: 'You stand under the Morrison eave, where the concrete overhang creates an echo chamber. The sound of your footsteps folds back on itself.',
  },
  {
    id: 'node-wurster-exit',
    segmentId: 'seg-wurster',
    name: 'Wurster Exit',
    slug: 'node-wurster-exit',
    lat: 37.8709,
    lon: -122.2550,
    radius: 12,
    order: 3,
    description: 'You reach the edge of Wurster Courtyard, facing toward 4.0 Hill. The concrete gives way to grass and sky.',
  },
  // Segment 4.0 Hill
  {
    id: 'node-hill-base',
    segmentId: 'seg-hill',
    name: '4.0 Hill Base',
    slug: 'node-hill-base',
    lat: 37.8712,
    lon: -122.2553,
    radius: 15,
    order: 1,
    description: 'You stand at the base of 4.0 Hill, where the path begins to slope upward. The grass stretches ahead of you.',
  },
  {
    id: 'node-hill-mid',
    segmentId: 'seg-hill',
    name: '4.0 Hill Mid',
    slug: 'node-hill-mid',
    lat: 37.8715,
    lon: -122.2555,
    radius: 20,
    order: 2,
    description: 'You are mid-slope on 4.0 Hill, where people usually sit on the grass. The amphitheater of west-facing grass opens around you.',
  },
  {
    id: 'node-hill-lip',
    segmentId: 'seg-hill',
    name: '4.0 Hill Lip',
    slug: 'node-hill-lip',
    lat: 37.8718,
    lon: -122.2557,
    radius: 15,
    order: 3,
    description: 'You reach the western lip of 4.0 Hill, the top of the slope. The view opens toward Strawberry Creek.',
  },
  {
    id: 'node-hill-exit',
    segmentId: 'seg-hill',
    name: '4.0 Hill Exit',
    slug: 'node-hill-exit',
    lat: 37.8720,
    lon: -122.2559,
    radius: 12,
    order: 4,
    description: 'You transition from grass back to paved path, heading toward the bridge over Strawberry Creek.',
  },
  // Segment Strawberry Creek
  {
    id: 'node-creek-approach',
    segmentId: 'seg-creek',
    name: 'Creek Approach',
    slug: 'node-creek-approach',
    lat: 37.8722,
    lon: -122.2562,
    radius: 10,
    order: 1,
    description: 'You approach the bridge over Strawberry Creek. The sound of water begins to reach you.',
  },
  {
    id: 'node-creek-center',
    segmentId: 'seg-creek',
    name: 'Creek Center',
    slug: 'node-creek-center',
    lat: 37.8725,
    lon: -122.2565,
    radius: 12,
    order: 2,
    description: 'You stand in the middle of the small bridge over Strawberry Creek, water folding under you and trees overhead.',
  },
  {
    id: 'node-creek-exit',
    segmentId: 'seg-creek',
    name: 'Creek Exit',
    slug: 'node-creek-exit',
    lat: 37.8727,
    lon: -122.2568,
    radius: 10,
    order: 3,
    description: 'You step off the bridge, heading toward the Campanile. The water sound fades behind you.',
  },
  // Segment Campanile
  {
    id: 'node-camp-approach',
    segmentId: 'seg-campanile',
    name: 'Campanile Approach',
    slug: 'node-camp-approach',
    lat: 37.8720,
    lon: -122.2575,
    radius: 15,
    order: 1,
    description: 'You enter the Campanile plaza from the west. The stone tower rises ahead of you.',
  },
  {
    id: 'node-camp-base',
    segmentId: 'seg-campanile',
    name: 'Campanile Base',
    slug: 'node-camp-base',
    lat: 37.8720,
    lon: -122.2580,
    radius: 20,
    order: 2,
    description: 'You stand at the base of the Campanile, at the west face. The stone tower looms above, and bells may ring.',
  },
  {
    id: 'node-camp-overlook',
    segmentId: 'seg-campanile',
    name: 'Campanile Overlook',
    slug: 'node-camp-overlook',
    lat: 37.8718,
    lon: -122.2582,
    radius: 15,
    order: 3,
    description: 'You stand at the west edge of the Campanile plaza, where on clear days the Golden Gate hangs low in the distance.',
  },
  {
    id: 'node-camp-linger',
    segmentId: 'seg-campanile',
    name: 'Campanile Linger',
    slug: 'node-camp-linger',
    lat: 37.8722,
    lon: -122.2583,
    radius: 12,
    order: 4,
    description: 'You linger slightly off to the side, taking in the full view. The Campanile, the sky, the memory of the walk.',
  },
];

// Helper functions
export function getNodeBySlug(slug: string): Node | undefined {
  return nodes.find((node) => node.slug === slug);
}

export function getSegmentById(id: string): Segment | undefined {
  return segments.find((segment) => segment.id === id);
}

export function getSegmentBySlug(slug: string): Segment | undefined {
  return segments.find((segment) => segment.slug === slug);
}

export function getNodesForSegment(segmentId: string): Node[] {
  return nodes.filter((node) => node.segmentId === segmentId).sort((a, b) => a.order - b.order);
}

