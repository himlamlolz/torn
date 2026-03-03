import React, { useState, useMemo, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { Sun, Moon, Copy, Check, ChevronDown, ChevronUp, Upload, Info, AlertTriangle, Plus, Loader } from "lucide-react";

const RARITY_COLORS = { Yellow: "#facc15", Orange: "#fb923c", Red: "#ef4444" };
const TABS = ["All Cache Drops", "Small Arms", "Melee", "Medium Arms", "Heavy Arms", "Armor"];

const ANALYZER_URL   = "https://torn-cache-dashboard.vercel.app/";
const GREASYFORK_URL = "https://greasyfork.org/en/scripts/568130-torn-cache-log-exporter";

const DATE_PRESETS = [
  { label: "Last Month",    getValue: () => { const now = new Date(); const s = new Date(now); s.setMonth(s.getMonth() - 1);       return [fmt(s), fmt(now)]; }},
  { label: "Last 3 Months", getValue: () => { const now = new Date(); const s = new Date(now); s.setMonth(s.getMonth() - 3);       return [fmt(s), fmt(now)]; }},
  { label: "Last 6 Months", getValue: () => { const now = new Date(); const s = new Date(now); s.setMonth(s.getMonth() - 6);       return [fmt(s), fmt(now)]; }},
  { label: "Last Year",     getValue: () => { const now = new Date(); const s = new Date(now); s.setFullYear(s.getFullYear() - 1); return [fmt(s), fmt(now)]; }},
  { label: "2026", getValue: () => ["2026-01-01", "2026-12-31"] },
  { label: "2025", getValue: () => ["2025-01-01", "2025-12-31"] },
  { label: "2024", getValue: () => ["2024-01-01", "2024-12-31"] },
  { label: "2023", getValue: () => ["2023-01-01", "2023-12-31"] },
  { label: "2022", getValue: () => ["2022-01-01", "2022-12-31"] },
  { label: "2021", getValue: () => ["2021-01-01", "2021-12-31"] },
  { label: "All Time", getValue: () => ["", ""] },
];

function fmt(d) { return d.toISOString().split("T")[0]; }

function formatShortDate(dt) {
  if (!dt) return null;
  return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function getSpellWarningColor(current, max, rarityColor) {
  if (max === 0 || current === 0) return null;
  const ratio = current / max;
  if (ratio >= 0.9) return rarityColor;
  if (ratio >= 0.7) return "#f59e0b";
  return null;
}

function validateCacheData(parsed) {
  if (!Array.isArray(parsed))
    return "This file doesn't look like a valid cache export — expected a list of drops.";
  if (parsed.length === 0)
    return "The file is empty — no drops were found.";
  const s = parsed[0];
  if (!s || typeof s !== "object")
    return "The file format is invalid.";
  if (!("timestamp" in s) || !("cacheType" in s) || !("rarity" in s))
    return "This doesn't look like a valid cache export — make sure you used the Tampermonkey script.";
  return null;
}

// ── CHANGED: version bump 9.1 → 9.3; renamed file, added auto-open analyzer tab ──
const TAMPERMONKEY_SCRIPT = `// ==UserScript==
// @name         Torn Cache Log Exporter (Fast Auto Scroll + Armor)
// @namespace    torn.cache.export
// @version      9.3
// @description  Fast auto-scroll + export all caches including Armor; quick-jump button on main log page; auto-opens analyzer after export
// @match        https://www.torn.com/page.php?sid=log*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const params = new URLSearchParams(window.location.search);

    // ── On any log page that is NOT the cache log, show a quick-jump button ──
    function addNavButton() {
        if (document.getElementById("cacheNavBtn")) return;
        const btn = document.createElement("button");
        btn.id = "cacheNavBtn";
        btn.innerText = "\\uD83D\\uDCE6 Go to Cache Logs";
        btn.style.position = "fixed";
        btn.style.top = "100px";
        btn.style.right = "20px";
        btn.style.zIndex = "9999";
        btn.style.padding = "10px 16px";
        btn.style.background = "#7c3aed";
        btn.style.color = "white";
        btn.style.border = "none";
        btn.style.borderRadius = "8px";
        btn.style.cursor = "pointer";
        btn.style.fontWeight = "bold";
        btn.style.fontSize = "13px";
        btn.style.boxShadow = "0 2px 8px rgba(0,0,0,0.35)";
        btn.style.transition = "background 0.15s";
        btn.onmouseenter = () => { btn.style.background = "#6d28d9"; };
        btn.onmouseleave = () => { btn.style.background = "#7c3aed"; };
        btn.onclick = () => { window.location.href = "https://www.torn.com/page.php?sid=log&log=2615"; };
        document.body.appendChild(btn);
    }

    if (params.get("log") !== "2615") {
        window.addEventListener("load", () => { setTimeout(addNavButton, 1000); });
        return;
    }

    // ── Cache log page (log=2615) ─────────────────────────────────────────────
    let scrolling = false;
    let stopRequested = false;

    function addUI() {
        if (document.getElementById("cacheExportContainer")) return;
        const container = document.createElement("div");
        container.id = "cacheExportContainer";
        container.style.position = "fixed";
        container.style.top = "100px";
        container.style.right = "20px";
        container.style.zIndex = "9999";
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.gap = "8px";
        const scrollBtn = createButton("Fast Auto Scroll", "#2563eb", startScroll);
        const stopBtn = createButton("Stop", "#dc2626", () => stopRequested = true);
        const exportBtn = createButton("Export Logs", "#16a34a", exportLogs);
        container.appendChild(scrollBtn);
        container.appendChild(stopBtn);
        container.appendChild(exportBtn);
        document.body.appendChild(container);
    }

    function createButton(text, color, onClick) {
        const btn = document.createElement("button");
        btn.innerText = text;
        btn.style.padding = "8px 12px";
        btn.style.background = color;
        btn.style.color = "white";
        btn.style.border = "none";
        btn.style.borderRadius = "6px";
        btn.style.cursor = "pointer";
        btn.style.fontWeight = "bold";
        btn.onclick = onClick;
        return btn;
    }

    async function startScroll() {
        if (scrolling) return;
        scrolling = true;
        stopRequested = false;
        let lastHeight = 0;
        let stableCount = 0;
        while (stableCount < 6 && !stopRequested) {
            window.scrollTo(0, document.body.scrollHeight);
            await sleep(300);
            const newHeight = document.body.scrollHeight;
            if (newHeight === lastHeight) { stableCount++; } else { stableCount = 0; lastHeight = newHeight; }
        }
        scrolling = false;
    }

    function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

    function parseCacheType(text) {
        if (text.includes("Armor Cache")) return "Armor";
        if (text.includes("Melee Cache")) return "Melee";
        if (text.includes("Small Arms Cache")) return "Small Arms";
        if (text.includes("Medium Arms Cache")) return "Medium Arms";
        if (text.includes("Heavy Arms Cache")) return "Heavy Arms";
        return null;
    }

    function detectRarity(el) {
        const cls = el.className.toLowerCase();
        if (cls.includes("text-red")) return "Red";
        if (cls.includes("text-orange")) return "Orange";
        if (cls.includes("text-yellow")) return "Yellow";
        return "Unknown";
    }

    function extractTimestamp(entry) {
        const parent = entry.closest("li, tr, div");
        if (!parent) return null;
        const match = parent.innerText.match(/\\d{2}:\\d{2}:\\d{2}\\s-\\s\\d{2}\\/\\d{2}\\/\\d{2}/);
        return match ? match[0] : null;
    }

    function exportLogs() {
        const logEntries = document.querySelectorAll("span.log-text");
        const results = [];
        logEntries.forEach(entry => {
            const text = entry.innerText;
            if (!text.includes("Cache") || !text.includes("gained")) return;
            const cacheType = parseCacheType(text);
            if (!cacheType) return;
            const colored = entry.querySelector(".text-yellow, .text-orange, .text-red");
            if (!colored) return;
            const rarity = detectRarity(colored);
            const timestamp = extractTimestamp(entry);
            const fullText = colored.innerText.trim();
            const bonusMatch = fullText.match(/\\((.*?)\\)/);
            const bonus = bonusMatch ? bonusMatch[1] : null;
            const itemName = bonusMatch ? fullText.replace(/\\(.*?\\)/, "").trim() : fullText;
            results.push({ timestamp, cacheType, weaponName: itemName, bonus, doubleBonus: cacheType === "Armor" ? false : (bonus && bonus.includes("&")) || false, rarity });
        });
        downloadJSON(results);
    }

    function downloadJSON(data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "torn_cache_logs.json";
        a.click();
        URL.revokeObjectURL(url);
        setTimeout(() => { window.open("${ANALYZER_URL}", "_blank"); }, 500);
    }

    window.addEventListener("load", () => { setTimeout(addUI, 1000); });
})();`;

function parseTimestamp(ts) {
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

function freq(arr, keyFn) {
  const map = {};
  arr.forEach(item => {
    const keys = keyFn(item);
    (Array.isArray(keys) ? keys : [keys]).forEach(k => {
      if (k) map[k] = (map[k] || 0) + 1;
    });
  });
  return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

function getTrendGrouping(startDate, endDate, active) {
  let spanDays = null;
  if (startDate && endDate) {
    spanDays = (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24);
  } else if (active.length > 0) {
    const dates = active.map(d => parseTimestamp(d.timestamp)).filter(Boolean);
    if (dates.length > 1)
      spanDays = (Math.max(...dates.map(d => d.getTime())) - Math.min(...dates.map(d => d.getTime()))) / (1000 * 60 * 60 * 24);
  }
  if (spanDays === null || spanDays > 180) return "monthly";
  if (spanDays > 42) return "weekly";
  return "daily";
}

function buildTrendData(active, grouping) {
  const c = {};
  active.forEach(d => {
    const dt = parseTimestamp(d.timestamp);
    if (!dt) return;
    let key;
    if (grouping === "daily") {
      key = dt.toISOString().split("T")[0];
    } else if (grouping === "weekly") {
      const day = dt.getUTCDay();
      const diff = (day === 0 ? -6 : 1) - day;
      const mon = new Date(dt);
      mon.setUTCDate(dt.getUTCDate() + diff);
      key = mon.toISOString().split("T")[0];
    } else {
      key = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
    }
    c[key] = (c[key] || 0) + 1;
  });
  return Object.entries(c).sort(([a], [b]) => a.localeCompare(b)).map(([label, count]) => ({ label, count }));
}

function trendMeta(grouping, n) {
  if (grouping === "daily")  return { title: "Trend", groupLabel: "Grouped by day",   unit: "day",   subtitle: `${n} day${n !== 1 ? "s" : ""}` };
  if (grouping === "weekly") return { title: "Trend", groupLabel: "Grouped by week",  unit: "week",  subtitle: `${n} week${n !== 1 ? "s" : ""}` };
  return                            { title: "Trend", groupLabel: "Grouped by month", unit: "month", subtitle: `${n} month${n !== 1 ? "s" : ""}` };
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function Footer({ light }) {
  const borderCls = light ? "border-gray-200" : "border-slate-700";
  const textCls   = light ? "text-gray-400"   : "text-slate-500";
  const linkCls   = light ? "text-indigo-600 hover:text-indigo-500 font-semibold transition-colors" : "text-indigo-400 hover:text-indigo-300 font-semibold transition-colors";
  const hlCls     = light ? "bg-amber-50 border border-amber-200 text-amber-800" : "bg-amber-950 border border-amber-800 text-amber-300";
  const shopCls   = light ? "text-amber-700 hover:text-amber-600 font-bold transition-colors underline underline-offset-2" : "text-amber-400 hover:text-amber-300 font-bold transition-colors underline underline-offset-2";
  return (
    <footer className={`mt-10 pt-6 pb-8 border-t ${borderCls}`}>
      <div className="max-w-3xl mx-auto flex flex-col items-center gap-4 text-center">
        <div className={`w-full rounded-xl px-5 py-4 ${hlCls}`}>
          <p className="text-sm font-medium mb-1">🗡️ Want to buy or sell RW weapons?</p>
          <a href="https://www.torn.com/forums.php#/p=threads&f=10&t=16416628&b=0&a=0" target="_blank" rel="noopener noreferrer" className={shopCls}>HLZZ's RW Marketplace</a>
        </div>
        <p className={`text-xs ${textCls}`}>Made by{" "}<a href="https://www.torn.com/profiles.php?XID=3129515" target="_blank" rel="noopener noreferrer" className={linkCls}>HLZZ [3129515]</a></p>
      </div>
    </footer>
  );
}

function DrySpellLegend({ light }) {
  const [open, setOpen] = useState(false);
  const borderCls = light ? "border-gray-200" : "border-slate-700";
  const bgCls     = light ? "bg-gray-50"      : "bg-slate-900";
  const textCls   = light ? "text-gray-600"   : "text-slate-300";
  const dimCls    = light ? "text-gray-400"   : "text-slate-500";
  const btnCls    = light ? "text-indigo-600 hover:text-indigo-500" : "text-indigo-400 hover:text-indigo-300";
  const rows = [
    { color: "#6b7280", label: "Normal",          desc: "Current dry spell is under 70% of your personal record. You're fine." },
    { color: "#f59e0b", label: "Getting unlucky", desc: "Current dry spell (drops or days) has reached 70–89% of your record. Starting to sting." },
    { color: "#ef4444", label: "Near record ⚠",  desc: "Current dry spell has hit 90%+ of your all-time record — you're close to breaking it." },
  ];
  return (
    <div className={`mt-4 pt-3 border-t ${borderCls}`}>
      <p className={`text-xs mb-2 ${dimCls}`}>
        <span className="font-semibold">Current</span> — consecutive drops &amp; calendar days without that rarity.{" "}
        <span className="font-semibold">Longest</span> — your all-time record in the loaded data.
      </p>
      <button onClick={() => setOpen(o => !o)} className={`flex items-center gap-1.5 text-xs font-medium ${btnCls} transition-colors`}>
        <Info size={13} />
        Color &amp; warning guide
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {open && (
        <div className={`mt-3 rounded-lg border ${borderCls} ${bgCls} p-4 space-y-4`}>
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${dimCls}`}>Columns</p>
            <div className="space-y-1.5">
              <div className={`text-xs ${textCls}`}><span className="font-bold">Current</span> — How many consecutive drops you've gone without hitting that rarity, and how many calendar days since your last one.</div>
              <div className={`text-xs ${textCls}`}><span className="font-bold">Longest</span> — Your all-time longest dry spell in the loaded data, in both drops and calendar days.</div>
              <div className={`text-xs ${textCls}`}><span className="font-bold">Date shown</span> — The date your current dry spell started (the day after your last qualifying drop).</div>
            </div>
          </div>
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${dimCls}`}>Color &amp; Warning Guide</p>
            <div className="space-y-2">
              {rows.map(({ color, label, desc }) => (
                <div key={label} className="flex items-start gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: color }} />
                  <div>
                    <span className="text-xs font-semibold" style={{ color }}>{label}</span>
                    <span className={`text-xs ${dimCls}`}> — {desc}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className={`text-xs mt-3 ${dimCls}`}>Both the <span className="font-semibold">drop count</span> and the <span className="font-semibold">day count</span> are colored independently — you could be near your record in days but not in drops, or vice versa.</p>
          </div>
          <div className={`text-xs ${dimCls} pt-1 border-t ${borderCls}`}>
            <span className="font-semibold">Note:</span> Tracking is based only on loaded data. If your export doesn't cover your full history, the "Longest" figures may be underestimated.
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ message = "No data for this selection", light }) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 gap-3 ${light ? "text-gray-400" : "text-slate-500"}`}>
      <div className="text-4xl">📭</div>
      <p className="text-sm">{message}</p>
    </div>
  );
}

function Card({ title, subtitle, children, light }) {
  return (
    <div className={`${light ? "bg-white border-gray-200" : "bg-slate-800 border-slate-700"} border rounded-xl p-5`}>
      {(title || subtitle) && (
        <div className="flex items-baseline justify-between mb-4">
          {title    && <h3 className={`text-xs uppercase tracking-widest ${light ? "text-gray-500" : "text-slate-400"}`}>{title}</h3>}
          {subtitle && <span className={`text-xs font-semibold ${light ? "text-gray-400" : "text-slate-400"}`}>{subtitle}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

function Stat({ label, value, light }) {
  return (
    <div className={`${light ? "bg-white border-gray-200" : "bg-slate-800 border-slate-700"} border rounded-lg p-4`}>
      <div className={`text-xs uppercase tracking-wide ${light ? "text-gray-500" : "text-slate-400"}`}>{label}</div>
      <div className={`text-2xl font-bold mt-1 ${light ? "text-gray-900" : "text-white"}`}>{value}</div>
    </div>
  );
}

function RarityCountCard({ rarity, count, total, light }) {
  const pct   = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
  const color = RARITY_COLORS[rarity] || "#6b7280";
  return (
    <div className={`${light ? "bg-white border-gray-200" : "bg-slate-800 border-slate-700"} border rounded-lg p-4`}>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <div className={`text-xs uppercase tracking-wide ${light ? "text-gray-500" : "text-slate-400"}`}>{rarity}</div>
      </div>
      <div className={`text-2xl font-bold mt-1 ${light ? "text-gray-900" : "text-white"}`}>{count}</div>
      <div className="text-xs mt-1 font-semibold" style={{ color }}>{pct}% of drops</div>
    </div>
  );
}

function CustomTooltip({ active, payload, light, grouping }) {
  if (!active || !payload || !payload.length) return null;
  const lbl          = payload[0]?.payload?.label || payload[0]?.payload?.name;
  const displayLabel = grouping === "weekly" ? `Week of ${lbl}` : lbl;
  return (
    <div className={`${light ? "bg-white border-gray-300" : "bg-slate-900 border-slate-600"} border rounded-lg px-4 py-3 shadow-xl`}>
      <p className={`font-semibold text-sm mb-1 ${light ? "text-gray-900" : "text-white"}`}>{displayLabel}</p>
      <p className={`text-sm font-mono ${light ? "text-indigo-600" : "text-indigo-300"}`}>{payload[0]?.value} drops</p>
    </div>
  );
}

function HorizontalBarChart({ data, color, light, total }) {
  const maxVal      = Math.max(...data.map(d => d.count), 1);
  const denominator = total != null ? total : data.reduce((s, d) => s + d.count, 0);
  return (
    <div>
      <div className={`flex items-center justify-end mb-3 pb-2 border-b ${light ? "border-gray-100" : "border-slate-700"}`}>
        <span className={`text-xs font-semibold ${light ? "text-gray-600" : "text-slate-300"}`}>{denominator.toLocaleString()} total drops</span>
      </div>
      <div className="space-y-1.5">
        {data.map((item, i) => {
          const pctWidth   = (item.count / maxVal) * 100;
          const pctTotal   = denominator > 0 ? ((item.count / denominator) * 100).toFixed(1) : "0.0";
          const labelText  = `${item.count} (${pctTotal}%)`;
          const showInside = pctWidth > 35;
          return (
            <div key={i} className="flex items-center gap-3 group">
              <div className="w-36 flex-shrink-0 text-right">
                <span title={item.name} className={`text-xs ${light ? "text-gray-600 group-hover:text-gray-900" : "text-slate-300 group-hover:text-white"} transition-colors truncate block`}>
                  {item.name}
                </span>
              </div>
              <div className="flex-1 relative h-5 min-w-0">
                <div className={`absolute inset-0 rounded-full ${light ? "bg-gray-200" : "bg-slate-700"}`} />
                <div className="absolute left-0 top-0 h-full rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-2 overflow-hidden"
                  style={{ width: `${Math.max(pctWidth, 2)}%`, backgroundColor: color }}>
                  {showInside && <span className="text-xs font-bold text-white drop-shadow whitespace-nowrap">{labelText}</span>}
                </div>
                {!showInside && (
                  <span className={`absolute top-0 flex items-center h-full text-xs font-semibold whitespace-nowrap ${light ? "text-gray-600" : "text-slate-300"}`}
                    style={{ left: `calc(${Math.max(pctWidth, 2)}% + 6px)` }}>
                    {labelText}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConfirmModal({ message, onConfirm, onCancel, light }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black opacity-50" onClick={onCancel} />
      <div className={`relative z-10 rounded-xl border p-6 max-w-sm w-full shadow-2xl ${light ? "bg-white border-gray-200" : "bg-slate-800 border-slate-700"}`}>
        <p className={`text-sm mb-5 ${light ? "text-gray-700" : "text-slate-300"}`}>{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${light ? "bg-gray-100 hover:bg-gray-200 text-gray-700" : "bg-slate-700 hover:bg-slate-600 text-slate-200"}`}>
            Cancel
          </button>
          <button onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white transition-colors">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ── CHANGED: Setup Guide now reflects the new quick-jump button (step 4) ──
function LandingPage({ onFileLoad, light, onToggleLight }) {
  const [copied,       setCopied]       = useState(false);
  const [showScript,   setShowScript]   = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const [uploadError,  setUploadError]  = useState(null);
  const [loading,      setLoading]      = useState(false);

  const copyScript = () => {
    navigator.clipboard.writeText(TAMPERMONKEY_SCRIPT).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadError(null);
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const err    = validateCacheData(parsed);
        if (err) { setUploadError(err); setLoading(false); return; }
        onFileLoad(parsed);
      } catch {
        setUploadError("Failed to read the file — make sure it's a valid JSON export.");
        setLoading(false);
      }
    };
    reader.onerror = () => { setUploadError("Failed to read the file."); setLoading(false); };
    reader.readAsText(file);
    e.target.value = "";
  };

  const bg      = light ? "bg-gray-50"  : "bg-slate-900";
  const text    = light ? "text-gray-900" : "text-white";
  const subtext = light ? "text-gray-500" : "text-slate-400";
  const cardBg  = light ? "bg-white border-gray-200" : "bg-slate-800 border-slate-700";
  const codeBg  = light ? "bg-gray-100 text-gray-800" : "bg-slate-950 text-slate-300";
  const stepBg  = light ? "bg-indigo-50 border-indigo-200 text-indigo-900" : "bg-indigo-950 border-indigo-800 text-indigo-200";
  const stepNum = "bg-indigo-600 text-white";
  const stepSub = light ? "text-indigo-700" : "text-indigo-300";

  // Updated tutorial: users can now install directly from Greasy Fork
  const steps = [
    ["Install Tampermonkey",         "Get the Tampermonkey browser extension from your browser's extension store (Chrome, Firefox, Edge, Safari)."],
    ["Install the Script from Greasy Fork", `Click the button below (or visit ${GREASYFORK_URL}) and click "Install this script". The script is now active on torn.com automatically.`],
    ["Go to Your Torn Log Page",     `Navigate to torn.com/page.php?sid=log. A purple "📦 Go to Cache Logs" button will appear — click it to jump straight to the cache log. Or navigate directly to torn.com/page.php?sid=log&log=2615.`],
    ["Auto-Scroll to Load All Logs", `Click "⚡ Fast Auto Scroll" to load all your cache log entries. A notification will appear at the bottom when scrolling is complete.`],
    ["Export & Upload",              `Click "💾 Export Logs" to download torn_cache_logs.json. The analyzer will open automatically — then upload your file above.`],
  ];

  return (
    <div className={`min-h-screen ${bg} ${text} p-6`}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Torn Cache Analyzer</h1>
            <p className={`${subtext} text-sm mt-1`}>Track, analyze, and visualize your cache drops</p>
          </div>
          <button onClick={onToggleLight}
            className={`p-2 rounded-lg ${light ? "bg-gray-200 hover:bg-gray-300 text-gray-700" : "bg-slate-700 hover:bg-slate-600 text-slate-200"} transition-colors`}>
            {light ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>

        <div className={`${cardBg} border rounded-xl p-8 text-center`}>
          <Upload size={40} className={`mx-auto mb-4 ${subtext}`} />
          <h2 className="text-lg font-semibold mb-2">Upload Cache Data</h2>
          <p className={`${subtext} text-sm mb-5`}>Select your exported torn_cache_logs.json file</p>
          {loading ? (
            <div className={`flex items-center justify-center gap-2 py-3 ${subtext}`}>
              <Loader size={18} className="animate-spin" />
              <span className="text-sm">Reading file…</span>
            </div>
          ) : (
            <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-500 transition-colors px-8 py-3 rounded-lg font-medium text-sm text-white inline-block">
              Choose JSON File
              <input type="file" accept=".json" onChange={handleFileChange} className="hidden" />
            </label>
          )}
          {uploadError && (
            <div className={`mt-4 flex items-start gap-2 text-left px-4 py-3 rounded-lg border text-xs ${light ? "bg-red-50 border-red-200 text-red-700" : "bg-red-950 border-red-800 text-red-300"}`}>
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>

        <div className={`${cardBg} border rounded-xl p-6`}>
          <button onClick={() => setShowTutorial(!showTutorial)} className="flex items-center justify-between w-full text-left">
            <h2 className="text-lg font-semibold">Setup Guide</h2>
            {showTutorial ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {showTutorial && (
            <div className="mt-5 space-y-4">
              {steps.map(([title, desc], idx) => (
                <div key={idx} className={`${stepBg} border rounded-lg p-4 flex gap-3`}>
                  <span className={`${stepNum} w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5`}>{idx + 1}</span>
                  <div>
                    <p className="font-semibold text-sm">{title}</p>
                    <p className={`text-xs mt-1 ${stepSub}`}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={`${cardBg} border rounded-xl p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Get the Script</h2>
          </div>
          <div className="flex flex-col items-start gap-3">
            <a
              href={GREASYFORK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 transition-colors text-white font-semibold px-5 py-2.5 rounded-lg text-sm"
            >
              Install from Greasy Fork
            </a>
            <p className={`text-xs ${subtext}`}>Recommended — click Install on the Greasy Fork page and the script activates on torn.com automatically.</p>
          </div>
          <div className={`mt-5 pt-4 border-t ${light ? "border-gray-200" : "border-slate-700"}`}>
            <button onClick={() => setShowScript(!showScript)} className={`flex items-center gap-1.5 text-xs font-medium ${light ? "text-indigo-600 hover:text-indigo-500" : "text-indigo-400 hover:text-indigo-300"} transition-colors`}>
              {showScript ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {showScript ? "Hide" : "Show"} manual install (for local use)
            </button>
            {showScript && (
              <div className="mt-3">
                <p className={`text-xs mb-3 ${subtext}`}>If you're running this site locally, copy the script below and create a new userscript in Tampermonkey manually.</p>
                <div className="flex justify-end mb-2">
                  <button onClick={copyScript}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${copied ? "bg-green-600 text-white" : light ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200" : "bg-indigo-600 text-white hover:bg-indigo-500"}`}>
                    {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy Script</>}
                  </button>
                </div>
                <pre className={`${codeBg} rounded-lg p-4 text-xs overflow-auto max-h-64 leading-relaxed`}>{TAMPERMONKEY_SCRIPT}</pre>
              </div>
            )}
          </div>
        </div>

        <Footer light={light} />
      </div>
    </div>
  );
}

export default function TornDashboard() {
  const [light, setLight] = useState(false);
  const toggleLight = useCallback(() => setLight(p => !p), []);

  const [data,            setData]            = useState(null);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [mergeError,      setMergeError]      = useState(null);
  const [mergeInfo,       setMergeInfo]       = useState(null);

  const handleFileLoad = useCallback((parsed) => setData(parsed), []);
  const confirmBack    = useCallback(() => { setData(null); setShowBackConfirm(false); }, []);

  const handleMergeFileSelect = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMergeError(null);
    setMergeInfo(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed   = JSON.parse(ev.target.result);
        const validErr = validateCacheData(parsed);
        if (validErr) { setMergeError(validErr); return; }
        const base       = data || [];
        const keyOf      = d => `${d.timestamp}|${d.cacheType}|${d.weaponName}|${d.bonus}|${d.rarity}`;
        const existing   = new Set(base.map(keyOf));
        const newEntries = parsed.filter(d => !existing.has(keyOf(d)));
        const skipped    = parsed.length - newEntries.length;
        setData([...base, ...newEntries]);
        setMergeInfo(
          newEntries.length === 0
            ? "No new drops found — all entries are already loaded."
            : `Added ${newEntries.length.toLocaleString()} new drop${newEntries.length !== 1 ? "s" : ""}${skipped > 0 ? ` (${skipped.toLocaleString()} duplicate${skipped !== 1 ? "s" : ""} skipped)` : ""}.`
        );
      } catch {
        setMergeError("Couldn't parse this file — make sure it's a valid cache export JSON.");
      }
    };
    reader.onerror = () => setMergeError("Failed to read the file.");
    reader.readAsText(file);
    e.target.value = "";
  }, [data]);

  const [tab,          setTab]          = useState("All Cache Drops");
  const [startDate,    setStartDate]    = useState("");
  const [endDate,      setEndDate]      = useState("");
  const [activePreset, setActivePreset] = useState("All Time");
  const [sortCol,      setSortCol]      = useState("date");
  const [sortDir,      setSortDir]      = useState("desc");
  const [showAllRare,  setShowAllRare]  = useState(false);

  const applyPreset = (preset) => {
    const [s, e] = preset.getValue();
    setStartDate(s); setEndDate(e); setActivePreset(preset.label); setShowAllRare(false);
  };

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir(col === "date" ? "desc" : "asc"); }
  };
  const sortIcon = (col) => sortCol === col ? (sortDir === "asc" ? " ↑" : " ↓") : " ↕";

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter(d => {
      const dt = parseTimestamp(d.timestamp);
      if (!dt) return false;
      if (startDate && dt < new Date(startDate + "T00:00:00Z")) return false;
      if (endDate   && dt > new Date(endDate   + "T23:59:59Z")) return false;
      return true;
    });
  }, [data, startDate, endDate]);

  const skippedCount = useMemo(() => {
    if (!data) return 0;
    return data.filter(d => !parseTimestamp(d.timestamp)).length;
  }, [data]);

  const dateRangeError = useMemo(() => {
    if (!startDate || !endDate) return null;
    return new Date(startDate) > new Date(endDate)
      ? "End date is before start date — no drops will be shown." : null;
  }, [startDate, endDate]);

  const dataSummary = useMemo(() => {
    if (!data || data.length === 0) return null;
    const times = data.map(d => parseTimestamp(d.timestamp)).filter(Boolean).map(d => d.getTime());
    if (times.length === 0) return null;
    const cacheTypes = [...new Set(data.map(d => d.cacheType).filter(Boolean))].sort();
    return { total: data.length, minDate: formatShortDate(new Date(Math.min(...times))), maxDate: formatShortDate(new Date(Math.max(...times))), cacheTypes };
  }, [data]);

  const buckets = useMemo(() => ({
    "All Cache Drops": filtered,
    Melee:             filtered.filter(d => d.cacheType === "Melee"),
    "Small Arms":      filtered.filter(d => d.cacheType === "Small Arms"),
    "Medium Arms":     filtered.filter(d => d.cacheType === "Medium Arms"),
    "Heavy Arms":      filtered.filter(d => d.cacheType === "Heavy Arms"),
    Armor:             filtered.filter(d => d.cacheType === "Armor"),
  }), [filtered]);

  const active  = buckets[tab] || [];
  const isAll   = tab === "All Cache Drops";
  const isArmor = tab === "Armor";

  const rarityCounts = useMemo(() => {
    const c = { Yellow: 0, Orange: 0, Red: 0 };
    active.forEach(d => { if (c[d.rarity] !== undefined) c[d.rarity]++; });
    return c;
  }, [active]);

  const bonuses          = useMemo(() => freq(active, d => d.bonus ? d.bonus.split("&").map(b => b.trim()).filter(Boolean) : []), [active]);
  const weapons          = useMemo(() => freq(active, d => d.weaponName || "Unknown"), [active]);
  const doubleBonusCount = useMemo(() => active.filter(d => d.doubleBonus === true).length, [active]);

  const cacheTypeBreakdown = useMemo(() => {
    if (!isAll) return [];
    const map = {};
    active.forEach(d => { if (d.cacheType) map[d.cacheType] = (map[d.cacheType] || 0) + 1; });
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [active, isAll]);

  const rareDrops = useMemo(() => active.filter(d => {
    if (d.rarity === "Red") return true;
    if (d.rarity === "Orange") { if (isArmor) return true; return d.doubleBonus === true; }
    return false;
  }), [active, isArmor]);

  const sortedRareDrops = useMemo(() => [...rareDrops].sort((a, b) => {
    let av, bv;
    switch (sortCol) {
      case "rarity":    { const o = { Red: 3, Orange: 2, Yellow: 1 }; av = o[a.rarity]||0; bv = o[b.rarity]||0; break; }
      case "item":      av = (a.weaponName||"").toLowerCase(); bv = (b.weaponName||"").toLowerCase(); break;
      case "cacheType": av = (a.cacheType||"").toLowerCase();  bv = (b.cacheType||"").toLowerCase();  break;
      case "bonus":     av = (a.bonus||"").toLowerCase();      bv = (b.bonus||"").toLowerCase();      break;
      default:          av = parseTimestamp(a.timestamp)?.getTime()||0; bv = parseTimestamp(b.timestamp)?.getTime()||0;
    }
    if (av < bv) return sortDir === "asc" ? -1 :  1;
    if (av > bv) return sortDir === "asc" ?  1 : -1;
    return 0;
  }), [rareDrops, sortCol, sortDir]);

  const drySpells = useMemo(() => {
    if (!active.length) return null;
    const sorted = [...active].sort((a, b) => {
      const da = parseTimestamp(a.timestamp), db = parseTimestamp(b.timestamp);
      if (!da || !db) return 0;
      return da - db;
    });
    const allTimes      = sorted.map(d => parseTimestamp(d.timestamp)).filter(Boolean);
    const firstDropTime = allTimes[0]                   || null;
    const lastDropTime  = allTimes[allTimes.length - 1] || null;

    const computeSpell = (predicate) => {
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
          gaps.push((occTimes[0] - firstDropTime) / MS_PER_DAY);
          for (let i = 1; i < occTimes.length; i++) gaps.push((occTimes[i] - occTimes[i-1]) / MS_PER_DAY);
          gaps.push((lastDropTime - occTimes[occTimes.length - 1]) / MS_PER_DAY);
        }
        worstDays = Math.round(Math.max(...gaps));
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
    };

    return {
      red:    computeSpell(d => d.rarity === "Red"),
      dbl:    computeSpell(d => d.rarity === "Orange" && d.doubleBonus),
      orange: computeSpell(d => d.rarity === "Orange"),
    };
  }, [active]);

  const grouping  = useMemo(() => getTrendGrouping(startDate, endDate, active), [startDate, endDate, active]);
  const trendData = useMemo(() => buildTrendData(active, grouping), [active, grouping]);
  const { title: trendTitle, groupLabel: trendGroupLabel, unit: trendUnit, subtitle: trendSubtitle } = trendMeta(grouping, trendData.length);
  const trendTotal = useMemo(() => trendData.reduce((s, d) => s + d.count, 0), [trendData]);
  const trendAvg   = trendData.length > 0 ? (trendTotal / trendData.length).toFixed(1) : "0";

  const xAngle    = trendData.length > 12 ? -35 : 0;
  const xAnchor   = trendData.length > 12 ? "end" : "middle";
  const xHeight   = trendData.length > 12 ? 48 : 30;
  const xInterval = trendData.length > 16 ? Math.ceil(trendData.length / 8) : 0;

  if (!data) return <LandingPage onFileLoad={handleFileLoad} light={light} onToggleLight={toggleLight} />;

  const bg          = light ? "bg-gray-50"    : "bg-slate-900";
  const text        = light ? "text-gray-900" : "text-slate-100";
  const subtext     = light ? "text-gray-500" : "text-slate-400";
  const dimText     = light ? "text-gray-400" : "text-slate-500";
  const btnActive   = "bg-indigo-600 text-white";
  const btnInactive = light ? "bg-gray-200 text-gray-700 hover:bg-gray-300" : "bg-slate-800 text-slate-300 hover:bg-slate-700";
  const pActive     = "bg-indigo-600 text-white";
  const pInactive   = light ? "bg-gray-200 text-gray-600 hover:bg-gray-300" : "bg-slate-700 text-slate-300 hover:bg-slate-600";
  const pCustom     = light ? "bg-amber-100 text-amber-700 border border-amber-300" : "bg-amber-900 text-amber-300 border border-amber-700";
  const inputBg     = light ? "bg-white border-gray-300 text-gray-900" : "bg-slate-700 border-slate-600 text-white";
  const gridStroke  = light ? "#e5e7eb" : "#334155";
  const tickFill    = light ? "#6b7280" : "#94a3b8";
  const lineStroke  = light ? "#6366f1" : "#818cf8";
  const thCls       = light ? "text-gray-400 border-gray-200 bg-white"    : "text-slate-400 border-slate-700 bg-slate-800";
  const trHoverCls  = light ? "border-gray-100 hover:bg-gray-50"           : "border-slate-700 hover:bg-slate-700";
  const aInfo    = light ? "bg-blue-50 border-blue-200 text-blue-800"     : "bg-blue-950 border-blue-800 text-blue-300";
  const aWarn    = light ? "bg-amber-50 border-amber-200 text-amber-800"  : "bg-amber-950 border-amber-800 text-amber-300";
  const aSuccess = light ? "bg-green-50 border-green-200 text-green-800"  : "bg-green-950 border-green-800 text-green-300";
  const aError   = light ? "bg-red-50 border-red-200 text-red-700"        : "bg-red-950 border-red-800 text-red-300";

  const activeTabLabel = isAll ? "Total Drops" : `${tab} Drops`;
  const stat3Label     = isArmor ? "Unique Pieces" : "Double Bonuses";
  const stat3Value     = isArmor ? weapons.length  : doubleBonusCount;
  const freqLabel      = isArmor ? "Item Frequency" : "Weapon Frequency";
  const rareTitle      = isAll   ? "Rare Cache Drops" : `Rare ${tab} Drops`;
  const rareSubtitle   = isAll
    ? "Red drops and orange drops with two bonuses — the standout pulls from your caches"
    : isArmor
    ? "Red and orange armor pieces — top-tier drops from your armor caches"
    : "Red drops and orange drops with two bonuses — the best pulls from this cache type";

  const drySpellRows = drySpells ? [
    { label: "Without Red",                    ...drySpells.red,    color: RARITY_COLORS.Red    },
    ...(!isArmor ? [{ label: "Without Orange (Double Bonus)", ...drySpells.dbl, color: RARITY_COLORS.Orange }] : []),
    { label: "Without any Orange",             ...drySpells.orange, color: RARITY_COLORS.Orange },
  ] : [];

  return (
    <div className={`min-h-screen ${bg} ${text} p-6 space-y-5`}>

      {showBackConfirm && (
        <ConfirmModal
          message="Going back will remove your loaded data. Are you sure?"
          onConfirm={confirmBack}
          onCancel={() => setShowBackConfirm(false)}
          light={light}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-lg font-bold">Torn Cache Dashboard</h1>
        <div className="flex gap-2 items-center flex-wrap">
          <label className={`cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${btnInactive} transition-colors`}>
            <Plus size={13} />
            Add File
            <input type="file" accept=".json" onChange={handleMergeFileSelect} className="hidden" />
          </label>
          <button onClick={() => setShowBackConfirm(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${btnInactive} transition-colors`}>
            ← Back
          </button>
          <button onClick={toggleLight}
            className={`p-2 rounded-lg ${light ? "bg-gray-200 hover:bg-gray-300 text-gray-700" : "bg-slate-700 hover:bg-slate-600 text-slate-200"} transition-colors`}>
            {light ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </div>

      {dataSummary && (
        <div className={`border rounded-lg px-4 py-2.5 text-xs ${aInfo}`}>
          Loaded <span className="font-bold">{dataSummary.total.toLocaleString()} drops</span> from{" "}
          <span className="font-bold">{dataSummary.minDate}</span> to{" "}
          <span className="font-bold">{dataSummary.maxDate}</span>
          {dataSummary.cacheTypes.length > 0 && <> · {dataSummary.cacheTypes.join(", ")}</>}
        </div>
      )}

      {skippedCount > 0 && (
        <div className={`border rounded-lg px-4 py-2.5 text-xs flex items-center gap-2 ${aWarn}`}>
          <AlertTriangle size={13} className="flex-shrink-0" />
          <span>{skippedCount.toLocaleString()} {skippedCount === 1 ? "entry has" : "entries have"} an unreadable timestamp and {skippedCount === 1 ? "was" : "were"} skipped.</span>
        </div>
      )}

      {mergeInfo && (
        <div className={`border rounded-lg px-4 py-2.5 text-xs flex items-center gap-2 ${aSuccess}`}>
          <Check size={13} className="flex-shrink-0" />
          <span>{mergeInfo}</span>
          <button onClick={() => setMergeInfo(null)} className="ml-auto font-bold text-sm leading-none">×</button>
        </div>
      )}
      {mergeError && (
        <div className={`border rounded-lg px-4 py-2.5 text-xs flex items-center gap-2 ${aError}`}>
          <AlertTriangle size={13} className="flex-shrink-0" />
          <span>{mergeError}</span>
          <button onClick={() => setMergeError(null)} className="ml-auto font-bold text-sm leading-none">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(t => (
          <button key={t} onClick={() => { setTab(t); setShowAllRare(false); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? btnActive : btnInactive}`}>
            {t} ({buckets[t]?.length || 0})
          </button>
        ))}
      </div>

      {/* Date Range */}
      <Card title="Date Range" light={light}>
        <div className="flex flex-wrap gap-2 mb-4">
          {DATE_PRESETS.map(p => (
            <button key={p.label} onClick={() => applyPreset(p)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${activePreset === p.label ? pActive : pInactive}`}>
              {p.label}
            </button>
          ))}
          {activePreset === "Custom" && (
            <span className={`px-3 py-1 rounded-md text-xs font-medium ${pCustom}`}>Custom</span>
          )}
        </div>
        <div className="flex gap-3 items-center text-sm flex-wrap">
          <label className={subtext}>From</label>
          <input type="date" value={startDate}
            onChange={e => { setStartDate(e.target.value); setActivePreset("Custom"); }}
            className={`${inputBg} border rounded px-2 py-1`} />
          <label className={subtext}>To</label>
          <input type="date" value={endDate}
            onChange={e => { setEndDate(e.target.value); setActivePreset("Custom"); }}
            className={`${inputBg} border rounded px-2 py-1`} />
        </div>
        {dateRangeError && (
          <p className={`text-xs mt-2 flex items-center gap-1.5 ${light ? "text-red-600" : "text-red-400"}`}>
            <AlertTriangle size={12} /> {dateRangeError}
          </p>
        )}
      </Card>

      {active.length === 0 ? (
        <EmptyState message={`No ${isAll ? "cache" : tab} drops found for this selection`} light={light} />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Stat label={activeTabLabel} value={active.length} light={light} />
            <Stat label="Unique Bonuses"  value={bonuses.length} light={light} />
            <Stat label={stat3Label}      value={stat3Value}     light={light} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {["Yellow", "Orange", "Red"].map(r => (
              <RarityCountCard key={r} rarity={r} count={rarityCounts[r]} total={active.length} light={light} />
            ))}
          </div>

          {/* Dry Spell Tracker */}
          <Card title={`Dry Spell Tracker — ${tab}`} light={light}>
            <table className="w-full">
              <thead>
                <tr className={`border-b ${light ? "border-gray-100" : "border-slate-700"}`}>
                  <th className="w-5 pb-2 pr-2" />
                  <th className={`text-left text-xs font-semibold uppercase tracking-wider pb-2 ${dimText}`} />
                  <th className={`text-right text-xs font-semibold uppercase tracking-wider pb-2 pr-2 w-28 ${dimText}`}>Current</th>
                  <th className={`text-right text-xs font-semibold uppercase tracking-wider pb-2 w-24 ${dimText}`}>Longest</th>
                </tr>
              </thead>
              <tbody>
                {drySpellRows.map(({ label, current, max, color, since, worstDays, currentDays }) => {
                  const warnColor    = getSpellWarningColor(current, max, color);
                  const isNearRecord = max > 0 && current / max >= 0.9;
                  const warnDays     = worstDays && currentDays != null && currentDays > 0
                    ? (currentDays / worstDays >= 0.9 ? color : currentDays / worstDays >= 0.7 ? "#f59e0b" : null)
                    : null;
                  return (
                    <tr key={label} className={`border-b last:border-b-0 ${light ? "border-gray-100" : "border-slate-700"}`}>
                      <td className="pt-3 pb-3 pr-2 align-top">
                        <div className="w-2 h-2 rounded-full mt-1" style={{ backgroundColor: color }} />
                      </td>
                      <td className={`pt-3 pb-3 align-top text-xs ${subtext}`}>{label}</td>
                      <td className="pt-3 pb-3 pr-2 align-top text-right">
                        <div className="text-sm font-bold tabular-nums leading-tight"
                          style={{ color: warnColor || (light ? "#111827" : "#f1f5f9") }}>
                          {current} drops{warnColor && <span className="ml-0.5 text-xs">{isNearRecord ? "⚠" : "!"}</span>}
                        </div>
                        {current > 0 && currentDays != null && (
                          <div className="text-xs font-semibold tabular-nums leading-tight mt-0.5"
                            style={{ color: warnDays || (light ? "#6b7280" : "#94a3b8") }}>
                            {currentDays}d{warnDays && currentDays / worstDays >= 0.9 && <span className="ml-0.5">⚠</span>}
                          </div>
                        )}
                        {since && (
                          <div className={`text-xs leading-tight mt-0.5 ${dimText}`}>since {formatShortDate(since)}</div>
                        )}
                      </td>
                      <td className="pt-3 pb-3 align-top text-right">
                        <div className="text-sm font-bold tabular-nums leading-tight" style={{ color }}>{max} drops</div>
                        {worstDays != null && worstDays > 0 && (
                          <div className="text-xs font-semibold tabular-nums leading-tight mt-0.5" style={{ color }}>{worstDays}d</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <DrySpellLegend light={light} />
          </Card>

          {isAll && cacheTypeBreakdown.length > 1 && (
            <Card title="Cache Type Breakdown" light={light}>
              <HorizontalBarChart data={cacheTypeBreakdown} color="#22d3ee" light={light} total={active.length} />
            </Card>
          )}

          {/* Rare Drops Table */}
          <Card title={rareTitle} subtitle={`${sortedRareDrops.length.toLocaleString()} drop${sortedRareDrops.length !== 1 ? "s" : ""}`} light={light}>
            <p className={`text-xs mb-4 -mt-2 ${dimText}`}>{rareSubtitle}</p>
            {sortedRareDrops.length === 0 ? (
              <EmptyState message="No rare drops found for this selection" light={light} />
            ) : (
              <>
                <div className={`overflow-auto ${showAllRare ? "" : "max-h-96"}`}>
                  <table className="w-full text-sm text-left">
                    <thead className={`text-xs uppercase ${thCls} border-b sticky top-0`}>
                      <tr>
                        {[
                          { col: "rarity",    label: "Rarity"     },
                          { col: "item",      label: "Item"       },
                          ...(isAll ? [{ col: "cacheType", label: "Cache Type" }] : []),
                          { col: "bonus",     label: "Bonus"      },
                          { col: "date",      label: "Date"       },
                        ].map(({ col, label }) => (
                          <th key={col}
                            className="py-2 pr-3 cursor-pointer select-none hover:opacity-70 transition-opacity whitespace-nowrap"
                            onClick={() => handleSort(col)}>
                            {label}{sortIcon(col)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedRareDrops.map((d, i) => (
                        <tr key={`${d.timestamp ?? "x"}-${d.weaponName ?? "x"}-${d.bonus ?? "x"}-${d.rarity ?? "x"}-${i}`}
                          className={`border-b ${trHoverCls} transition-colors`}>
                          <td className="py-2 pr-3">
                            <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold"
                              style={{
                                backgroundColor: d.rarity === "Red" ? (light ? "#fee2e2" : "#ef444430") : (light ? "#ffedd5" : "#fb923c30"),
                                color: d.rarity === "Red" ? "#dc2626" : "#ea580c",
                              }}>
                              {d.rarity}
                            </span>
                          </td>
                          <td title={d.weaponName || "Unknown"} className={`py-2 pr-3 font-medium ${light ? "text-gray-900" : "text-white"}`}>{d.weaponName || "Unknown"}</td>
                          {isAll && <td className={`py-2 pr-3 ${subtext}`}>{d.cacheType || "—"}</td>}
                          <td title={d.bonus || ""} className={`py-2 pr-3 ${light ? "text-gray-700" : "text-slate-300"}`}>{d.bonus || "—"}</td>
                          <td className={`py-2 ${dimText} text-xs`}>{d.timestamp || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {sortedRareDrops.length > 15 && (
                  <button onClick={() => setShowAllRare(v => !v)}
                    className={`mt-3 text-xs font-medium flex items-center gap-1 transition-colors ${light ? "text-indigo-600 hover:text-indigo-500" : "text-indigo-400 hover:text-indigo-300"}`}>
                    {showAllRare
                      ? <><ChevronUp size={12} /> Show Less</>
                      : <><ChevronDown size={12} /> Show All {sortedRareDrops.length} Drops</>}
                  </button>
                )}
              </>
            )}
          </Card>

          {!isAll && (
            <>
              <Card title={`Bonus Frequency — ${tab}`} light={light}>
                {bonuses.length === 0
                  ? <EmptyState message="No bonus data for this selection" light={light} />
                  : <HorizontalBarChart data={bonuses} color="#a78bfa" light={light} total={active.length} />}
              </Card>
              <Card title={`${freqLabel} — ${tab}`} light={light}>
                {weapons.length === 0
                  ? <EmptyState message="No item data for this selection" light={light} />
                  : <HorizontalBarChart data={weapons} color="#38bdf8" light={light} total={active.length} />}
              </Card>
            </>
          )}

          <Card
            title={`${trendTitle} — ${tab}`}
            subtitle={`${trendTotal.toLocaleString()} drops · ${trendGroupLabel} · avg ${trendAvg}/${trendUnit}`}
            light={light}
          >
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: xHeight > 30 ? 16 : 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="label" tick={{ fill: tickFill, fontSize: 11 }} angle={xAngle} textAnchor={xAnchor} height={xHeight} interval={xInterval} />
                <YAxis tick={{ fill: tickFill, fontSize: 11 }} />
                <Tooltip content={<CustomTooltip light={light} grouping={grouping} />} />
                <Line type="monotone" dataKey="count" stroke={lineStroke} strokeWidth={2} dot={{ r: 3, fill: lineStroke }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}

      <Footer light={light} />
    </div>
  );
}
