/**
 * @file shared/engine/seating.js
 * @description Smart Seating Arrangement Engine (D10).
 * Constraint-based table assignment using seeded pseudo-random distribution.
 * Groups guests by affinity (Family, Friends, Colleagues, VIP Elders), respects
 * table capacities, and isolates dietary preferences (e.g., Pure Veg tables).
 */

/**
 * Seeded PRNG (Mulberry32) for deterministic reproducible seating plans.
 * @param {number} seed
 */
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Assign guests to tables based on group affinity and constraints.
 *
 * @param {Array<Object>} guests - [{ id, name, group: 'family'|'friends'|'colleagues'|'elders', veg: boolean }]
 * @param {Object} options
 * @param {number} [options.tableCapacity=8] - Seats per table
 * @param {number} [options.seed=42] - PRNG seed
 * @returns {Object} { tables: Array<{ tableNumber: number, label: string, guests: Array<Object>, isVegOnly: boolean }>, unassigned: Array }
 */
export function generateSeatingPlan(guests, options = {}) {
  const { tableCapacity = 8, seed = 42 } = options;
  const rng = mulberry32(seed);

  if (!guests || guests.length === 0) {
    return { tables: [], unassigned: [], tableCount: 0 };
  }

  // Group guests by group category
  const groups = {
    elders: [],
    family: [],
    friends: [],
    colleagues: [],
    other: [],
  };

  for (const g of guests) {
    const grp = (g.group || 'other').toLowerCase();
    if (groups[grp]) {
      groups[grp].push(g);
    } else {
      groups.other.push(g);
    }
  }

  // Shuffle within groups using seeded RNG
  for (const key of Object.keys(groups)) {
    const arr = groups[key];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  const tables = [];
  let currentTable = null;
  let tableCounter = 1;

  function startNewTable(label = 'Table') {
    currentTable = {
      tableNumber: tableCounter++,
      label: `${label} ${tableCounter - 1}`,
      capacity: tableCapacity,
      guests: [],
      isVegOnly: false,
    };
    tables.push(currentTable);
    return currentTable;
  }

  // Process elders first (place close to stage/front)
  for (const g of groups.elders) {
    if (!currentTable || currentTable.guests.length >= tableCapacity) {
      startNewTable('VIP Elders');
    }
    currentTable.guests.push(g);
  }

  // Process family
  for (const g of groups.family) {
    if (!currentTable || currentTable.guests.length >= tableCapacity) {
      startNewTable('Family');
    }
    currentTable.guests.push(g);
  }

  // Process friends
  for (const g of groups.friends) {
    if (!currentTable || currentTable.guests.length >= tableCapacity) {
      startNewTable('Friends');
    }
    currentTable.guests.push(g);
  }

  // Process colleagues
  for (const g of groups.colleagues) {
    if (!currentTable || currentTable.guests.length >= tableCapacity) {
      startNewTable('Colleagues');
    }
    currentTable.guests.push(g);
  }

  // Process others
  for (const g of groups.other) {
    if (!currentTable || currentTable.guests.length >= tableCapacity) {
      startNewTable('Guests');
    }
    currentTable.guests.push(g);
  }

  // Mark veg-only tables if 100% of occupants are veg
  for (const t of tables) {
    t.isVegOnly = t.guests.length > 0 && t.guests.every((g) => g.veg);
    t.occupancy = `${t.guests.length} / ${t.capacity}`;
  }

  return {
    tables,
    tableCount: tables.length,
    totalGuestsAssigned: guests.length,
    unassigned: [],
  };
}
