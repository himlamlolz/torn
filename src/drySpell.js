export const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Parse a Torn-formatted timestamp string like "08:16:00 - 21/04/26"
 * into a Date object (UTC). Returns null for invalid/missing input.
 */
export function parseTimestamp(ts) {
  if (!ts) return null;
  const parts = ts.split(" - ");
  if (parts.length < 2) return null;
  const [time, date] = parts;
  const dp = date.split("/");
  if (dp.length < 3) return null;
  const [d, m, y] = dp;
  if (!d || !m || !y || !time) return null;
  const iso = `20${y}-${m}-${d}T${time}Z`;
  const dt = new Date(iso);
  return isNaN(dt.getTime()) ? null : dt;
}

/**
 * Compute dry-spell statistics for a given predicate over a sorted
 * (ascending by time) array of drop objects.
 *
 * @param {object[]} sorted  - drops sorted oldest → newest, each with a `.timestamp` string
 * @param {Function} predicate - returns true for a "qualifying" (non-dry) drop
 * @returns {{ current, max, since, worstDays, currentDays }}
 */
export function computeSpell(sorted, predicate) {
  const allTimes     = sorted.map(d => parseTimestamp(d.timestamp)).filter(Boolean);
  const firstDropTime = allTimes[0]                    || null;
  const lastDropTime  = allTimes[allTimes.length - 1]  || null;

  let current = 0, maxDrops = 0, lastIdx = -1;
  sorted.forEach((d, idx) => {
    if (predicate(d)) { current = 0; lastIdx = idx; }
    else { current++; if (current > maxDrops) maxDrops = current; }
  });

  const occTimes = sorted.filter(predicate).map(d => parseTimestamp(d.timestamp)).filter(Boolean);

  let worstDays = null;
  if (firstDropTime && lastDropTime) {
    const gaps = [];
    if (occTimes.length === 0) {
      gaps.push((lastDropTime - firstDropTime) / MS_PER_DAY);
    } else {
      for (let i = 1; i < occTimes.length; i++) gaps.push((occTimes[i] - occTimes[i - 1]) / MS_PER_DAY);
      gaps.push((lastDropTime - occTimes[occTimes.length - 1]) / MS_PER_DAY);
    }
    if (gaps.length > 0) worstDays = Math.round(Math.max(...gaps));
  }

  let currentDays = null;
  if (current > 0 && firstDropTime && lastDropTime) {
    if (lastIdx === -1) {
      currentDays = Math.round((lastDropTime - firstDropTime) / MS_PER_DAY);
    } else {
      const t = parseTimestamp(sorted[lastIdx].timestamp);
      if (t) currentDays = Math.round((lastDropTime - t) / MS_PER_DAY);
    }
  }

  const getSince = (idx) => {
    if (idx === -1) return firstDropTime;
    const t = parseTimestamp(sorted[idx].timestamp);
    if (!t) return null;
    const next = new Date(t.getTime());
    next.setUTCDate(next.getUTCDate() + 1);
    next.setUTCHours(0, 0, 0, 0);
    return next;
  };

  return { current, max: maxDrops, since: current > 0 ? getSince(lastIdx) : null, worstDays, currentDays };
}
