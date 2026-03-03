import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Moon, Sun, Upload, X, ChevronUp, ChevronDown, ChevronsUpDown, PlusCircle } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// ─── helpers ────────────────────────────────────────────────────────────────

function parseTimestamp(ts) {
  // "HH:MM:SS - DD/MM/YY"
  if (!ts) return null;
  const [timePart, datePart] = ts.split(' - ');
  if (!timePart || !datePart) return null;
  const [hh, mm, ss] = timePart.split(':');
  const [dd, mo, yy] = datePart.split('/');
  return new Date(`20${yy}-${mo}-${dd}T${hh}:${mm}:${ss}`);
}

function formatDate(d) {
  if (!d) return '';
  return d.toISOString().slice(0, 10);
}

function parseBonuses(bonus) {
  if (!bonus) return ['—', '—'];
  if (bonus.includes('&')) {
    const parts = bonus.split('&').map(s => s.trim());
    return [parts[0] || '—', parts[1] || '—'];
  }
  return [bonus.trim(), '—'];
}

const CACHE_TYPES_WEAPON = ['Small Arms', 'Melee', 'Medium Arms', 'Heavy Arms'];
const RARITIES = ['Red', 'Orange', 'Yellow'];
const RARITY_COLOR = {
  Red: 'bg-red-600 text-white',
  Orange: 'bg-orange-500 text-white',
  Yellow: 'bg-yellow-400 text-black',
};

function RarityBadge({ rarity }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${RARITY_COLOR[rarity] || 'bg-gray-400 text-white'}`}>
      {rarity}
    </span>
  );
}

// ─── sort hook ──────────────────────────────────────────────────────────────

function useSortState(defaultKey) {
  const [sort, setSort] = useState({ key: defaultKey, dir: 'desc' });
  const toggle = (key) => {
    setSort(prev =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    );
  };
  return [sort, toggle];
}

function SortIcon({ sortKey, sort }) {
  if (sort.key !== sortKey) return <ChevronsUpDown className="inline w-3 h-3 ml-1 opacity-40" />;
  return sort.dir === 'asc'
    ? <ChevronUp className="inline w-3 h-3 ml-1" />
    : <ChevronDown className="inline w-3 h-3 ml-1" />;
}

function sortData(data, key, dir) {
  if (!key) return data;
  return [...data].sort((a, b) => {
    let av = a[key], bv = b[key];
    if (key === 'timestamp') {
      av = parseTimestamp(av)?.getTime() ?? 0;
      bv = parseTimestamp(bv)?.getTime() ?? 0;
    }
    if (av == null) av = '';
    if (bv == null) bv = '';
    if (av < bv) return dir === 'asc' ? -1 : 1;
    if (av > bv) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}

// ─── Th helper ──────────────────────────────────────────────────────────────

function Th({ children, sortKey, sort, onSort, dark }) {
  const base = `px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide cursor-pointer select-none whitespace-nowrap ${dark ? 'text-gray-300' : 'text-gray-600'}`;
  return (
    <th className={base} onClick={() => onSort(sortKey)}>
      {children}
      <SortIcon sortKey={sortKey} sort={sort} />
    </th>
  );
}

// ─── Table wrapper ───────────────────────────────────────────────────────────

function TableWrapper({ dark, children }) {
  return (
    <div className="overflow-auto max-h-[60vh] rounded-lg border border-opacity-20 border-gray-400">
      <table className={`min-w-full text-sm ${dark ? 'text-gray-200' : 'text-gray-800'}`}>
        {children}
      </table>
    </div>
  );
}

// ─── StatCard ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, dark }) {
  return (
    <div className={`rounded-xl p-4 flex flex-col gap-1 ${dark ? 'bg-gray-800' : 'bg-white shadow'}`}>
      <div className={`text-xs font-semibold uppercase tracking-wide ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</div>
      <div className={`text-3xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{value}</div>
      {sub && <div className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{sub}</div>}
    </div>
  );
}

// ─── FreqBar ─────────────────────────────────────────────────────────────────

function FreqBar({ label, count, max, dark }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`w-40 truncate flex-shrink-0 ${dark ? 'text-gray-300' : 'text-gray-700'}`} title={label}>{label}</div>
      <div className={`flex-1 rounded-full h-3 ${dark ? 'bg-gray-700' : 'bg-gray-200'}`}>
        <div className="h-3 rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
      </div>
      <div className={`w-8 text-right text-xs font-mono ${dark ? 'text-gray-400' : 'text-gray-600'}`}>{count}</div>
    </div>
  );
}

// ─── OverviewTab ─────────────────────────────────────────────────────────────

function OverviewTab({ data, dark }) {
  const total = data.length;

  const rarityCount = useMemo(() => {
    const c = { Red: 0, Orange: 0, Yellow: 0 };
    data.forEach(d => { if (c[d.rarity] !== undefined) c[d.rarity]++; });
    return c;
  }, [data]);

  // Dry spell: streak of openings without Red or double-bonus Orange
  const { currentStreak, longestStreak } = useMemo(() => {
    let cur = 0, longest = 0;
    for (let i = data.length - 1; i >= 0; i--) {
      const d = data[i];
      const isRare = d.rarity === 'Red' || (d.rarity === 'Orange' && d.doubleBonus);
      if (isRare) break;
      cur++;
    }
    let run = 0;
    for (const d of data) {
      const isRare = d.rarity === 'Red' || (d.rarity === 'Orange' && d.doubleBonus);
      if (isRare) { longest = Math.max(longest, run); run = 0; }
      else run++;
    }
    longest = Math.max(longest, run);
    return { currentStreak: cur, longestStreak: longest };
  }, [data]);

  let drySpellColor = dark ? 'text-white' : 'text-gray-900';
  if (longestStreak > 0 && currentStreak >= longestStreak * 0.8) drySpellColor = 'text-red-500';
  else if (longestStreak > 0 && currentStreak >= longestStreak * 0.5) drySpellColor = 'text-yellow-500';

  const bonusFreq = useMemo(() => {
    const map = {};
    data.forEach(d => {
      if (!d.bonus) return;
      d.bonus.split('&').map(s => s.trim()).forEach(b => {
        if (b) map[b] = (map[b] || 0) + 1;
      });
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [data]);

  const weaponFreq = useMemo(() => {
    const map = {};
    data.forEach(d => {
      const name = d.weaponName || d.armorName || d.itemName;
      if (name) map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [data]);

  const cacheTypeFreq = useMemo(() => {
    const map = {};
    data.forEach(d => { if (d.cacheType) map[d.cacheType] = (map[d.cacheType] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [data]);

  const maxBonus = bonusFreq[0]?.[1] ?? 1;
  const maxWeapon = weaponFreq[0]?.[1] ?? 1;
  const maxCache = cacheTypeFreq[0]?.[1] ?? 1;

  const card = dark ? 'bg-gray-800' : 'bg-white shadow';
  const heading = dark ? 'text-white' : 'text-gray-900';
  const sub = dark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className="space-y-6">
      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Openings" value={total} dark={dark} />
        <StatCard label="Red Drops" value={rarityCount.Red} sub={`${total > 0 ? ((rarityCount.Red / total) * 100).toFixed(1) : 0}%`} dark={dark} />
        <StatCard label="Orange Drops" value={rarityCount.Orange} sub={`${total > 0 ? ((rarityCount.Orange / total) * 100).toFixed(1) : 0}%`} dark={dark} />
        <StatCard label="Yellow Drops" value={rarityCount.Yellow} sub={`${total > 0 ? ((rarityCount.Yellow / total) * 100).toFixed(1) : 0}%`} dark={dark} />
      </div>

      {/* Dry spell */}
      <div className={`rounded-xl p-4 ${card}`}>
        <h3 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${sub}`}>Dry Spell Tracker</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className={`text-xs ${sub}`}>Current Streak</div>
            <div className={`text-3xl font-bold ${drySpellColor}`}>{currentStreak}</div>
            <div className={`text-xs ${sub}`}>openings without rare</div>
          </div>
          <div>
            <div className={`text-xs ${sub}`}>Longest Streak</div>
            <div className={`text-3xl font-bold ${heading}`}>{longestStreak}</div>
            <div className={`text-xs ${sub}`}>all-time record</div>
          </div>
        </div>
        {longestStreak > 0 && (
          <div className="mt-3">
            <div className={`flex justify-between text-xs mb-1 ${sub}`}>
              <span>Progress to record</span>
              <span>{Math.round((currentStreak / longestStreak) * 100)}%</span>
            </div>
            <div className={`h-2 rounded-full ${dark ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <div
                className={`h-2 rounded-full transition-all ${currentStreak >= longestStreak ? 'bg-red-500' : currentStreak >= longestStreak * 0.5 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(100, (currentStreak / longestStreak) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bonus frequency */}
        <div className={`rounded-xl p-4 ${card}`}>
          <h3 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${sub}`}>Top 10 Bonuses</h3>
          <div className="space-y-2">
            {bonusFreq.length === 0 && <div className={`text-sm ${sub}`}>No data</div>}
            {bonusFreq.map(([name, count]) => (
              <FreqBar key={name} label={name} count={count} max={maxBonus} dark={dark} />
            ))}
          </div>
        </div>

        {/* Weapon frequency */}
        <div className={`rounded-xl p-4 ${card}`}>
          <h3 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${sub}`}>Top 10 Items</h3>
          <div className="space-y-2">
            {weaponFreq.length === 0 && <div className={`text-sm ${sub}`}>No data</div>}
            {weaponFreq.map(([name, count]) => (
              <FreqBar key={name} label={name} count={count} max={maxWeapon} dark={dark} />
            ))}
          </div>
        </div>
      </div>

      {/* Cache type breakdown */}
      <div className={`rounded-xl p-4 ${card}`}>
        <h3 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${sub}`}>Cache Type Breakdown</h3>
        <div className="space-y-2">
          {cacheTypeFreq.length === 0 && <div className={`text-sm ${sub}`}>No data</div>}
          {cacheTypeFreq.map(([name, count]) => (
            <FreqBar key={name} label={name} count={count} max={maxCache} dark={dark} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── RareDropsTab ────────────────────────────────────────────────────────────

function RareDropsTab({ data, dark }) {
  const [sort, toggleSort] = useSortState('timestamp');

  const rareData = useMemo(() => {
    return data.filter(d => d.rarity === 'Red' || (d.rarity === 'Orange' && d.doubleBonus));
  }, [data]);

  const sorted = useMemo(() => sortData(rareData, sort.key, sort.dir), [rareData, sort]);

  const thProps = { sort, onSort: toggleSort, dark };
  const rowBg = (i) => dark
    ? (i % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750')
    : (i % 2 === 0 ? 'bg-white' : 'bg-gray-50');

  return (
    <div>
      <div className={`mb-3 text-sm ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
        {sorted.length} rare drop{sorted.length !== 1 ? 's' : ''} (Red drops & double-bonus Orange)
      </div>
      <TableWrapper dark={dark}>
        <thead className={`sticky top-0 ${dark ? 'bg-gray-900' : 'bg-gray-100'}`}>
          <tr>
            <Th sortKey="rarity" {...thProps}>Rarity</Th>
            <Th sortKey="weaponName" {...thProps}>Weapon / Item</Th>
            <Th sortKey="bonus" {...thProps}>Bonus</Th>
            <Th sortKey="cacheType" {...thProps}>Cache Type</Th>
            <Th sortKey="timestamp" {...thProps}>Timestamp</Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i} className={rowBg(i)}>
              <td className="px-3 py-2"><RarityBadge rarity={row.rarity} /></td>
              <td className="px-3 py-2 font-medium">{row.weaponName || row.armorName || row.itemName || '—'}</td>
              <td className="px-3 py-2">{row.bonus || '—'}</td>
              <td className="px-3 py-2">{row.cacheType || '—'}</td>
              <td className="px-3 py-2 text-xs font-mono">{row.timestamp}</td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr><td colSpan={5} className={`px-3 py-8 text-center text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>No rare drops found</td></tr>
          )}
        </tbody>
      </TableWrapper>
    </div>
  );
}

// ─── AllOpeningsWeapons ───────────────────────────────────────────────────────

const DEFAULT_WEAPONS_FILTERS = {
  rarities: { Red: true, Orange: true, Yellow: true },
  cacheTypes: { 'Small Arms': true, 'Melee': true, 'Medium Arms': true, 'Heavy Arms': true },
  bonusSearch: '',
};

const DEFAULT_ARMOR_FILTERS = {
  rarities: { Red: true, Orange: true, Yellow: true },
  bonusSearch: '',
};

function AllOpeningsWeapons({ data, dark }) {
  const [filters, setFilters] = useState(() => {
    try {
      const saved = localStorage.getItem('openingsFilters_weapons');
      if (saved) return JSON.parse(saved);
    } catch (err) { console.error('Failed to parse openingsFilters_weapons:', err); }
    return DEFAULT_WEAPONS_FILTERS;
  });

  useEffect(() => {
    localStorage.setItem('openingsFilters_weapons', JSON.stringify(filters));
  }, [filters]);

  const [sort, toggleSort] = useSortState('timestamp');

  // counts for checkboxes
  const counts = useMemo(() => {
    const rar = { Red: 0, Orange: 0, Yellow: 0 };
    const ct = { 'Small Arms': 0, 'Melee': 0, 'Medium Arms': 0, 'Heavy Arms': 0 };
    data.forEach(d => {
      if (rar[d.rarity] !== undefined) rar[d.rarity]++;
      if (ct[d.cacheType] !== undefined) ct[d.cacheType]++;
    });
    return { rar, ct };
  }, [data]);

  const filtered = useMemo(() => {
    return data.filter(d => {
      if (!filters.rarities[d.rarity]) return false;
      if (!filters.cacheTypes[d.cacheType]) return false;
      if (filters.bonusSearch) {
        const q = filters.bonusSearch.toLowerCase();
        if (!(d.bonus || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [data, filters]);

  const sorted = useMemo(() => {
    const withBonuses = filtered.map(d => {
      const [b1, b2] = parseBonuses(d.bonus);
      return { ...d, bonus1: b1, bonus2: b2 };
    });
    if (sort.key === 'bonus1' || sort.key === 'bonus2') {
      return [...withBonuses].sort((a, b) => {
        const av = a[sort.key], bv = b[sort.key];
        if (av < bv) return sort.dir === 'asc' ? -1 : 1;
        if (av > bv) return sort.dir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortData(withBonuses, sort.key, sort.dir);
  }, [filtered, sort]);

  const toggleRarity = (r) => setFilters(f => ({ ...f, rarities: { ...f.rarities, [r]: !f.rarities[r] } }));
  const toggleCacheType = (c) => setFilters(f => ({ ...f, cacheTypes: { ...f.cacheTypes, [c]: !f.cacheTypes[c] } }));
  const clearAll = () => setFilters(DEFAULT_WEAPONS_FILTERS);

  const thProps = { sort, onSort: toggleSort, dark };
  const rowBg = (i) => dark ? (i % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850') : (i % 2 === 0 ? 'bg-white' : 'bg-gray-50');
  const card = dark ? 'bg-gray-800' : 'bg-white shadow';
  const sub = dark ? 'text-gray-400' : 'text-gray-500';
  const labelCls = dark ? 'text-gray-300' : 'text-gray-700';

  return (
    <div className="space-y-4">
      {/* Filter card */}
      <div className={`rounded-xl p-4 ${card}`}>
        <div className="flex flex-wrap gap-6">
          {/* Rarity */}
          <div>
            <div className={`text-xs font-semibold uppercase mb-2 ${sub}`}>Rarity</div>
            <div className="flex flex-col gap-1">
              {RARITIES.map(r => (
                <label key={r} className={`flex items-center gap-2 cursor-pointer text-sm ${labelCls}`}>
                  <input type="checkbox" checked={filters.rarities[r]} onChange={() => toggleRarity(r)} className="accent-blue-500" />
                  <RarityBadge rarity={r} />
                  <span className={sub}>({counts.rar[r]})</span>
                </label>
              ))}
            </div>
          </div>
          {/* Cache Type */}
          <div>
            <div className={`text-xs font-semibold uppercase mb-2 ${sub}`}>Cache Type</div>
            <div className="flex flex-col gap-1">
              {CACHE_TYPES_WEAPON.map(c => (
                <label key={c} className={`flex items-center gap-2 cursor-pointer text-sm ${labelCls}`}>
                  <input type="checkbox" checked={filters.cacheTypes[c]} onChange={() => toggleCacheType(c)} className="accent-blue-500" />
                  {c}
                  <span className={sub}>({counts.ct[c]})</span>
                </label>
              ))}
            </div>
          </div>
          {/* Bonus search */}
          <div className="flex-1 min-w-[180px]">
            <div className={`text-xs font-semibold uppercase mb-2 ${sub}`}>Bonus Search</div>
            <div className="relative">
              <input
                type="text"
                value={filters.bonusSearch}
                onChange={e => setFilters(f => ({ ...f, bonusSearch: e.target.value }))}
                placeholder="Search bonuses…"
                className={`w-full rounded-lg px-3 py-2 pr-8 text-sm border ${dark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {filters.bonusSearch && (
                <button
                  onClick={() => setFilters(f => ({ ...f, bonusSearch: '' }))}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 ${dark ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-700'}`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          {/* Clear + count */}
          <div className="flex flex-col justify-end gap-2">
            <button
              onClick={clearAll}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${dark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}
            >
              Clear All Filters
            </button>
            <div className={`text-sm font-medium ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
              Results: <span className="font-bold">{sorted.length}</span> openings
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <TableWrapper dark={dark}>
        <thead className={`sticky top-0 ${dark ? 'bg-gray-900' : 'bg-gray-100'}`}>
          <tr>
            <Th sortKey="rarity" {...thProps}>Rarity</Th>
            <Th sortKey="weaponName" {...thProps}>Weapon Name</Th>
            <Th sortKey="bonus1" {...thProps}>Bonus 1</Th>
            <Th sortKey="bonus2" {...thProps}>Bonus 2</Th>
            <Th sortKey="cacheType" {...thProps}>Cache Type</Th>
            <Th sortKey="timestamp" {...thProps}>Timestamp</Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i} className={rowBg(i)}>
              <td className="px-3 py-2"><RarityBadge rarity={row.rarity} /></td>
              <td className="px-3 py-2 font-medium">{row.weaponName || '—'}</td>
              <td className="px-3 py-2">{row.bonus1}</td>
              <td className="px-3 py-2">{row.bonus2}</td>
              <td className="px-3 py-2">{row.cacheType}</td>
              <td className="px-3 py-2 text-xs font-mono">{row.timestamp}</td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr><td colSpan={6} className={`px-3 py-8 text-center text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>No results match your filters</td></tr>
          )}
        </tbody>
      </TableWrapper>
    </div>
  );
}

// ─── AllOpeningsArmor ─────────────────────────────────────────────────────────

function AllOpeningsArmor({ data, dark }) {
  const [filters, setFilters] = useState(() => {
    try {
      const saved = localStorage.getItem('openingsFilters_armor');
      if (saved) return JSON.parse(saved);
    } catch (err) { console.error('Failed to parse openingsFilters_armor:', err); }
    return DEFAULT_ARMOR_FILTERS;
  });

  useEffect(() => {
    localStorage.setItem('openingsFilters_armor', JSON.stringify(filters));
  }, [filters]);

  const [sort, toggleSort] = useSortState('timestamp');

  const counts = useMemo(() => {
    const rar = { Red: 0, Orange: 0, Yellow: 0 };
    data.forEach(d => { if (rar[d.rarity] !== undefined) rar[d.rarity]++; });
    return rar;
  }, [data]);

  const filtered = useMemo(() => {
    return data.filter(d => {
      if (!filters.rarities[d.rarity]) return false;
      if (filters.bonusSearch) {
        const q = filters.bonusSearch.toLowerCase();
        if (!(d.bonus || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [data, filters]);

  const sorted = useMemo(() => sortData(filtered, sort.key, sort.dir), [filtered, sort]);

  const toggleRarity = (r) => setFilters(f => ({ ...f, rarities: { ...f.rarities, [r]: !f.rarities[r] } }));
  const clearAll = () => setFilters(DEFAULT_ARMOR_FILTERS);

  const thProps = { sort, onSort: toggleSort, dark };
  const rowBg = (i) => dark ? (i % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850') : (i % 2 === 0 ? 'bg-white' : 'bg-gray-50');
  const card = dark ? 'bg-gray-800' : 'bg-white shadow';
  const sub = dark ? 'text-gray-400' : 'text-gray-500';
  const labelCls = dark ? 'text-gray-300' : 'text-gray-700';

  return (
    <div className="space-y-4">
      <div className={`rounded-xl p-4 ${card}`}>
        <div className="flex flex-wrap gap-6">
          <div>
            <div className={`text-xs font-semibold uppercase mb-2 ${sub}`}>Rarity</div>
            <div className="flex flex-col gap-1">
              {RARITIES.map(r => (
                <label key={r} className={`flex items-center gap-2 cursor-pointer text-sm ${labelCls}`}>
                  <input type="checkbox" checked={filters.rarities[r]} onChange={() => toggleRarity(r)} className="accent-blue-500" />
                  <RarityBadge rarity={r} />
                  <span className={sub}>({counts[r]})</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex-1 min-w-[180px]">
            <div className={`text-xs font-semibold uppercase mb-2 ${sub}`}>Bonus Search</div>
            <div className="relative">
              <input
                type="text"
                value={filters.bonusSearch}
                onChange={e => setFilters(f => ({ ...f, bonusSearch: e.target.value }))}
                placeholder="Search bonuses…"
                className={`w-full rounded-lg px-3 py-2 pr-8 text-sm border ${dark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {filters.bonusSearch && (
                <button
                  onClick={() => setFilters(f => ({ ...f, bonusSearch: '' }))}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 ${dark ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-700'}`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-col justify-end gap-2">
            <button
              onClick={clearAll}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${dark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}
            >
              Clear All Filters
            </button>
            <div className={`text-sm font-medium ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
              Results: <span className="font-bold">{sorted.length}</span> openings
            </div>
          </div>
        </div>
      </div>

      <TableWrapper dark={dark}>
        <thead className={`sticky top-0 ${dark ? 'bg-gray-900' : 'bg-gray-100'}`}>
          <tr>
            <Th sortKey="rarity" {...thProps}>Rarity</Th>
            <Th sortKey="armorName" {...thProps}>Armor Name</Th>
            <Th sortKey="bonus" {...thProps}>Bonus</Th>
            <Th sortKey="timestamp" {...thProps}>Timestamp</Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i} className={rowBg(i)}>
              <td className="px-3 py-2"><RarityBadge rarity={row.rarity} /></td>
              <td className="px-3 py-2 font-medium">{row.armorName || row.weaponName || row.itemName || '—'}</td>
              <td className="px-3 py-2">{row.bonus || '—'}</td>
              <td className="px-3 py-2 text-xs font-mono">{row.timestamp}</td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr><td colSpan={4} className={`px-3 py-8 text-center text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>No results match your filters</td></tr>
          )}
        </tbody>
      </TableWrapper>
    </div>
  );
}

// ─── AllOpeningsTab ───────────────────────────────────────────────────────────

function AllOpeningsTab({ data, dark }) {
  const [subTab, setSubTab] = useState('weapons');

  const weaponData = useMemo(() => data.filter(d => d.cacheType !== 'Armor'), [data]);
  const armorData = useMemo(() => data.filter(d => d.cacheType === 'Armor'), [data]);

  const sub = dark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[['weapons', 'Weapons'], ['armor', 'Armor']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              subTab === key
                ? 'bg-blue-600 text-white'
                : dark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {subTab === 'weapons' ? (
        <AllOpeningsWeapons data={weaponData} dark={dark} />
      ) : (
        <AllOpeningsArmor data={armorData} dark={dark} />
      )}
    </div>
  );
}

// ─── TrendTab ─────────────────────────────────────────────────────────────────

function TrendTab({ data, dark }) {
  const chartData = useMemo(() => {
    if (data.length === 0) return [];

    const dates = data.map(d => parseTimestamp(d.timestamp)).filter(Boolean);
    if (dates.length === 0) return [];

    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    const rangeDays = (maxDate - minDate) / (1000 * 60 * 60 * 24);

    let groupFn;
    let labelFn;
    if (rangeDays <= 31) {
      // group by day
      groupFn = (d) => d.toISOString().slice(0, 10);
      labelFn = (k) => k;
    } else if (rangeDays <= 180) {
      // group by week
      groupFn = (d) => {
        const startOfWeek = new Date(d);
        startOfWeek.setDate(d.getDate() - d.getDay());
        return startOfWeek.toISOString().slice(0, 10);
      };
      labelFn = (k) => `Week of ${k}`;
    } else {
      // group by month
      groupFn = (d) => d.toISOString().slice(0, 7);
      labelFn = (k) => k;
    }

    const map = {};
    data.forEach(d => {
      const dt = parseTimestamp(d.timestamp);
      if (!dt) return;
      const key = groupFn(dt);
      if (!map[key]) map[key] = { key, openings: 0, red: 0, orange: 0, yellow: 0 };
      map[key].openings++;
      if (d.rarity === 'Red') map[key].red++;
      else if (d.rarity === 'Orange') map[key].orange++;
      else if (d.rarity === 'Yellow') map[key].yellow++;
    });

    return Object.values(map)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(v => ({ ...v, label: labelFn(v.key) }));
  }, [data]);

  const axisColor = dark ? '#9ca3af' : '#6b7280';
  const gridColor = dark ? '#374151' : '#e5e7eb';
  const tooltipBg = dark ? '#1f2937' : '#ffffff';
  const tooltipBorder = dark ? '#374151' : '#e5e7eb';

  if (chartData.length === 0) {
    return <div className={`text-center py-16 text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>No data to display</div>;
  }

  return (
    <div className={`rounded-xl p-4 ${dark ? 'bg-gray-800' : 'bg-white shadow'}`}>
      <h3 className={`text-sm font-semibold uppercase tracking-wide mb-4 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Openings Over Time</h3>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="label" tick={{ fill: axisColor, fontSize: 11 }} tickLine={false} />
          <YAxis tick={{ fill: axisColor, fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8 }}
            labelStyle={{ color: dark ? '#f3f4f6' : '#111827', fontWeight: 600 }}
            itemStyle={{ color: dark ? '#d1d5db' : '#374151' }}
          />
          <Legend wrapperStyle={{ color: axisColor, fontSize: 12 }} />
          <Line type="monotone" dataKey="openings" stroke="#3b82f6" strokeWidth={2} dot={false} name="Total" />
          <Line type="monotone" dataKey="red" stroke="#ef4444" strokeWidth={1.5} dot={false} name="Red" />
          <Line type="monotone" dataKey="orange" stroke="#f97316" strokeWidth={1.5} dot={false} name="Orange" />
          <Line type="monotone" dataKey="yellow" stroke="#eab308" strokeWidth={1.5} dot={false} name="Yellow" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── LandingPage ──────────────────────────────────────────────────────────────

function LandingPage({ onLoad, dark, toggleDark }) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const processFile = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        if (arr.length === 0 || !arr[0].timestamp) {
          setError('Invalid file: expected an array of cache opening records.');
          return;
        }
        setError('');
        onLoad(arr);
      } catch (err) {
        setError(`Failed to parse JSON file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  }, [onLoad]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    processFile(e.dataTransfer.files[0]);
  };

  const handleChange = (e) => processFile(e.target.files[0]);

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Dark mode toggle */}
      <button
        onClick={toggleDark}
        className={`fixed top-4 right-4 p-2 rounded-full transition-colors ${dark ? 'bg-gray-700 text-yellow-300 hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-100 shadow'}`}
        aria-label="Toggle dark mode"
      >
        {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <div className="w-full max-w-lg space-y-6 text-center">
        <div>
          <h1 className={`text-4xl font-bold mb-2 ${dark ? 'text-white' : 'text-gray-900'}`}>Torn Cache Analyzer</h1>
          <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Upload your JSON export to analyze your cache openings</p>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-12 cursor-pointer transition-colors ${
            dragging
              ? 'border-blue-500 bg-blue-500/10'
              : dark
                ? 'border-gray-600 hover:border-blue-500 bg-gray-800'
                : 'border-gray-300 hover:border-blue-500 bg-white'
          }`}
        >
          <input ref={inputRef} type="file" accept=".json" className="hidden" onChange={handleChange} />
          <Upload className={`w-12 h-12 mx-auto mb-4 ${dark ? 'text-gray-500' : 'text-gray-400'}`} />
          <p className={`font-medium ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Drop your JSON file here</p>
          <p className={`text-sm mt-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>or click to browse</p>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl px-4 py-3 text-sm text-left">
            <X className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main TornDashboard ───────────────────────────────────────────────────────

export default function TornDashboard() {
  const [dark, setDark] = useState(true);
  const [rawData, setRawData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [addFileError, setAddFileError] = useState('');
  const addFileRef = useRef(null);

  const toggleDark = () => setDark(d => !d);

  const handleLoad = useCallback((arr) => {
    setRawData(arr);
    // auto-populate date range
    const dates = arr.map(d => parseTimestamp(d.timestamp)).filter(Boolean);
    if (dates.length) {
      setDateFrom(formatDate(new Date(Math.min(...dates.map(d => d.getTime())))));
      setDateTo(formatDate(new Date(Math.max(...dates.map(d => d.getTime())))));
    }
  }, []);

  const handleAddFile = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        setRawData(prev => {
          const merged = [...(prev || []), ...arr];
          // deduplicate by timestamp+weaponName
          const seen = new Set();
          return merged.filter(d => {
            const key = `${d.timestamp}|${d.weaponName || d.armorName || ''}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        });
        // extend date range
        const dates = arr.map(d => parseTimestamp(d.timestamp)).filter(Boolean);
        if (dates.length) {
          const newMin = formatDate(new Date(Math.min(...dates.map(d => d.getTime()))));
          const newMax = formatDate(new Date(Math.max(...dates.map(d => d.getTime()))));
          setDateFrom(prev => (!prev || newMin < prev) ? newMin : prev);
          setDateTo(prev => (!prev || newMax > prev) ? newMax : prev);
        }
      } catch (err) {
        console.error('Failed to merge file:', err);
        setAddFileError(`Failed to merge file: ${err.message}`);
        setTimeout(() => setAddFileError(''), 4000);
      }
    };
    reader.readAsText(file);
  }, []);

  const filteredData = useMemo(() => {
    if (!rawData) return [];
    return rawData.filter(d => {
      const dt = parseTimestamp(d.timestamp);
      if (!dt) return true;
      const ds = formatDate(dt);
      if (dateFrom && ds < dateFrom) return false;
      if (dateTo && ds > dateTo) return false;
      return true;
    });
  }, [rawData, dateFrom, dateTo]);

  if (!rawData) {
    return <LandingPage onLoad={handleLoad} dark={dark} toggleDark={toggleDark} />;
  }

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'rare', label: 'Rare Drops' },
    { key: 'all', label: 'All Openings' },
    { key: 'trend', label: 'Trend' },
  ];

  const bg = dark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900';
  const headerBg = dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm';
  const inputCls = dark
    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400';

  return (
    <div className={`min-h-screen ${bg}`}>
      {/* Header */}
      <div className={`sticky top-0 z-10 border-b ${headerBg}`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          <h1 className="text-lg font-bold mr-2">Torn Cache Analyzer</h1>

          {/* Date range */}
          <div className="flex items-center gap-2 text-sm">
            <span className={dark ? 'text-gray-400' : 'text-gray-500'}>From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className={`rounded-lg px-2 py-1 text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputCls}`}
            />
            <span className={dark ? 'text-gray-400' : 'text-gray-500'}>To</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className={`rounded-lg px-2 py-1 text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputCls}`}
            />
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Add file */}
          <input
            ref={addFileRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={e => { handleAddFile(e.target.files[0]); e.target.value = ''; }}
          />
          <button
            onClick={() => addFileRef.current?.click()}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${dark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            <PlusCircle className="w-4 h-4" />
            Add File
          </button>

          {/* Dark mode toggle */}
          <button
            onClick={toggleDark}
            className={`p-2 rounded-full transition-colors ${dark ? 'bg-gray-700 text-yellow-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Tabs */}
        <div className={`max-w-7xl mx-auto px-4 flex gap-1 pb-0`}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === t.key
                  ? 'border-blue-500 text-blue-500'
                  : dark
                    ? 'border-transparent text-gray-400 hover:text-gray-200'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {addFileError && (
          <div className="mb-4 flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl px-4 py-3 text-sm">
            <X className="w-4 h-4 flex-shrink-0" />
            {addFileError}
          </div>
        )}
        {activeTab === 'overview' && <OverviewTab data={filteredData} dark={dark} />}
        {activeTab === 'rare' && <RareDropsTab data={filteredData} dark={dark} />}
        {activeTab === 'all' && <AllOpeningsTab data={filteredData} dark={dark} />}
        {activeTab === 'trend' && <TrendTab data={filteredData} dark={dark} />}
      </div>
    </div>
  );
}