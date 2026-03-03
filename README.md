# Torn Cache Drop Analyzer

A browser-based dashboard for tracking and analyzing weapon and armor cache drops in [Torn](https://www.torn.com). Export your cache logs with a Tampermonkey script and visualize drop rarity, bonus distribution, trends over time, and more — all in a fast React + Vite app.

---

## What's New

### v9.3 (2026-03-03)
- Export filename renamed: `torn_cache_logs_full.json` → `torn_cache_logs.json`
- After export, the analyzer is automatically opened via `window.open(ANALYZER_URL)`
- Landing page setup guide simplified from 6 → 5 steps
- Step 2 now links to **Greasy Fork** for one-click Tampermonkey install
- Step 3 includes inline action buttons: **Open Torn Log Page** and **Open Cache Log Directly**
- "Install from Greasy Fork" button color changed to emerald green
- Manual copy-paste install block collapsed under a toggle for cleaner UX
- **New "All Openings" tab** with Weapons (default) and Armor sub-tabs
- **Inline filter cards** per sub-tab:
  - Rarity checkboxes (Red / Orange / Yellow) with live counts
  - Cache type checkboxes for weapons (Small Arms / Melee / Medium Arms / Heavy Arms)
  - Bonus text search with clear button (case-insensitive partial match)
  - Clear All Filters button + visible result count
- **Sortable table columns** (↑ ↓ ↕):
  - Weapons: Rarity | Weapon Name | Bonus 1 | Bonus 2 | Cache Type | Date
  - Armor: Rarity | Armor Name | Bonus | Date
- Bonus parsing: splits on `&` (e.g., `"DMG +5 & ACC +3"` → Bonus 1: `"DMG +5"`, Bonus 2: `"ACC +3"`)
- Filter state persisted to `localStorage` (`openingsFilters_weapons` / `openingsFilters_armor`)
- `useMemo` used for filtered/sorted data performance
- **Export filenames now reflect the active tab** (e.g., `torn_cache_drops_medium_arms_2026-03-03.csv`)
- **New `ExportInfoModal`** (`ⓘ` icon in header toolbar):
  - 5-step guide covering tab selection, date filtering, CSV vs JSON, and filename conventions
  - Dismisses on backdrop click or "Got it" button
- Dark/light mode support throughout (slate/gray scheme)

### v9.2 (2026-03-02)
- Full **Vite + React 19** project setup
- Dependencies: Recharts, Tanstack Table, Headless UI, Framer Motion, Lucide React, Tailwind CSS 4
- `TornDashboard.jsx` moved to `src/`

### v9.0 – v9.1
- Original `TornDashboard.jsx` UI: all tabs, dark/light mode, dry spell tracker, rare drops table, trend chart, and export functionality

---

## Features

- **Dashboard tabs**: Overview, Weapons, Armor, Trends, and the new All Openings tab
- **All Openings tab** with Weapons and Armor sub-tabs and inline filters
- **Rarity filtering**: Red / Orange / Yellow checkboxes with live result counts
- **Cache type filtering** (weapons only): Small Arms / Melee / Medium Arms / Heavy Arms
- **Bonus text search**: case-insensitive partial match with clear button
- **Sortable columns** on all tables (click headers to cycle ↑ ↓ ↕)
- **Bonus split display**: dual-bonus items shown across Bonus 1 / Bonus 2 columns
- **Export**: CSV and JSON export with tab-aware filenames (e.g., `torn_cache_drops_heavy_arms_2026-03-03.csv`)
- **Export Info Modal**: step-by-step guide explaining the export workflow
- **Dry spell tracker**: days since last rare drop
- **Trend chart**: drop frequency over time (Recharts)
- **Dark / light mode**: automatic slate/gray theming
- **localStorage persistence**: filters survive page reloads
- **Tampermonkey script v9.3**: one-click log export with auto-open analyzer

---

## Installation

### Option 1 — Greasy Fork (recommended)

1. Install the [Tampermonkey](https://www.tampermonkey.net/) browser extension.
2. Go to the script's Greasy Fork page and click **Install**.
3. Open Torn and navigate to the cache log page:
   - [Torn Log Page](https://www.torn.com/page.php?sid=log)
   - [Cache Log Direct Link](https://www.torn.com/page.php?sid=log&log=2615) *(log type 2615 is Torn's fixed ID for cache openings)*
4. Click the **Export Cache Logs** button injected by the script. The analyzer opens automatically.

### Option 2 — Manual install (local / offline use)

<details>
<summary>Show manual install steps</summary>

1. Install [Tampermonkey](https://www.tampermonkey.net/).
2. Create a new script in Tampermonkey and paste the contents of the userscript file.
3. Save and enable the script.
4. Follow steps 3–4 from Option 1 above.

</details>

### Running the analyzer locally

```bash
# Clone the repo
git clone https://github.com/himlamlolz/torn.git
cd torn

# Install dependencies
npm install

# Start the dev server
npm run dev
```

---

## Usage

1. Export your cache logs from Torn using the Tampermonkey script — the analyzer opens automatically, or navigate to the local dev server.
2. Use the **tabs** at the top to switch between Overview, Weapons, Armor, Trends, and All Openings views.
3. In the **All Openings** tab, select the Weapons or Armor sub-tab and use the inline filter card to narrow results by rarity, cache type, or bonus text.
4. Click any **column header** to sort the table ascending or descending.
5. Use the **Export** button in the header toolbar to download the current view as CSV or JSON. The filename reflects the active tab and today's date.
6. Click the **ⓘ** icon next to the export button for a walkthrough of the export workflow.

---

## Log Exporter (Tampermonkey Script)

> **v9.3:** The exporter now saves logs as `torn_cache_logs.json` and automatically opens the analyzer after export.

The Tampermonkey userscript injects an export button into the Torn log page. When clicked it:

1. Scrapes the cache drop log entries from the current page.
2. Saves them as `torn_cache_logs.json`.
3. Automatically opens the analyzer URL so you can immediately view your drops.

---

## Tech Stack

| Layer | Library / Tool |
|---|---|
| UI Framework | React 19 |
| Build Tool | Vite |
| Styling | Tailwind CSS 4 |
| Charts | Recharts |
| Tables | Tanstack Table |
| UI Components | Headless UI |
| Animations | Framer Motion |
| Icons | Lucide React |