export type VectorClock = Record<string, number>;

/**
 * Increments the vector clock value for a specific client ID.
 */
export function increment(clock: VectorClock, clientId: string): VectorClock {
  const nextClock = { ...clock };
  nextClock[clientId] = (nextClock[clientId] || 0) + 1;
  return nextClock;
}

/**
 * Merges two vector clocks, taking the maximum value for each client ID.
 */
export function merge(clockA: VectorClock, clockB: VectorClock): VectorClock {
  const merged: VectorClock = { ...clockA };
  for (const [clientId, value] of Object.entries(clockB)) {
    merged[clientId] = Math.max(merged[clientId] || 0, value);
  }
  return merged;
}

/**
 * Compares two vector clocks.
 * Returns -1 if clockA < clockB
 * Returns 1 if clockA > clockB
 * Returns 0 if clockA === clockB
 * Returns null if clockA and clockB are concurrent (conflict)
 */
export function compare(clockA: VectorClock, clockB: VectorClock): number | null {
  let aGreater = false;
  let bGreater = false;

  const allKeys = new Set([...Object.keys(clockA), ...Object.keys(clockB)]);

  for (const key of allKeys) {
    const valA = clockA[key] || 0;
    const valB = clockB[key] || 0;

    if (valA > valB) {
      aGreater = true;
    } else if (valB > valA) {
      bGreater = true;
    }
  }

  if (aGreater && bGreater) {
    return null; // Concurrent / conflict
  }
  if (aGreater) {
    return 1; // clockA is newer
  }
  if (bGreater) {
    return -1; // clockB is newer
  }
  return 0; // identical
}
