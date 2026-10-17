const ADJECTIVES = [
  'Silent', 'Swift', 'Solar', 'Lunar', 'Velvet', 'Cobalt', 'Amber', 'Emerald',
  'Echo', 'Silver', 'Neon', 'Cosmic', 'Shadow', 'Frost', 'Golden', 'Mystic',
  'Atlas', 'Vortex', 'Zephyr', 'Orion', 'Crimson', 'Azure', 'Nova', 'Pulse'
];

const ANIMALS = [
  'Falcon', 'Lynx', 'Fox', 'Owl', 'Otter', 'Raven', 'Panther', 'Wolf',
  'Badger', 'Hawk', 'Tiger', 'Panda', 'Stag', 'Bear', 'Eagle', 'Dolphin',
  'Phoenix', 'Cheetah', 'Jaguar', 'Koala', 'Leopard', 'Robin', 'Bison'
];

export const AVATAR_COLORS = [
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#14B8A6', // Teal
  '#F43F5E', // Rose
];

export function generateRandomName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${adj} ${animal}`;
}

export function getRandomColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

export function generateRoomCode(): string {
  const prefixes = ['SKY', 'NEO', 'ECHO', 'FOX', 'LNX', 'WISP', 'ORB', 'ZEN', 'SOL', 'LUM'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${num}`;
}
