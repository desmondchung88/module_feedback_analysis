// Deterministic PRNG (mulberry32) so mock data is identical on every load.
export function createRandom(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    pick: (items) => items[Math.floor(next() * items.length)],
    weighted(weights) {
      const entries = Object.entries(weights);
      const total = entries.reduce((sum, [, w]) => sum + w, 0);
      let roll = next() * total;
      for (const [key, w] of entries) {
        roll -= w;
        if (roll <= 0) return key;
      }
      return entries[entries.length - 1][0];
    },
  };
}
