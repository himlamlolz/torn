<div align="center">

# 🗃️ Torn Cache Tools

**A two-part toolkit for exporting and analyzing your Torn City cache opening history**

[![Install on Greasy Fork](https://img.shields.io/badge/Install-Greasy%20Fork-red?style=for-the-badge)](https://greasyfork.org/en/scripts/568130-torn-cache-log-exporter)
[![Version](https://img.shields.io/badge/Version-9.4-blue?style=for-the-badge)]()
[![Applies To](https://img.shields.io/badge/Applies%20To-torn.com-green?style=for-the-badge)]()

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Components](#components)
  - [Log Exporter (Userscript)](#log-exporter)
  - [Cache Analyzer (Website)](#cache-analyzer)
  - [All Openings View](#all-openings)
- [Installation](#installation)
- [How to Use](#how-to-use)
- [Output Format](#output-format)
- [Supported Cache Types](#supported-cache-types)
- [Privacy](#privacy)
- [Troubleshooting](#troubleshooting)
- [Version History](#version-history)
- [Author](#author)

---

<a id="overview"></a>
## 📖 Overview

This project is made up of two parts that work together: a **userscript** that runs on Torn City to extract and export your cache opening history, and a **companion website** that reads that export and turns it into interactive charts and statistics.

Neither component requires an account, login, or any external server. Everything runs locally in your browser.

---

<a id="components"></a>
## 🧩 Components

<a id="log-exporter"></a>
### 🔧 Log Exporter — Userscript

The userscript runs directly on [torn.com](https://www.torn.com) inside your browser via a userscript manager such as Tampermonkey. It adds a small control panel to your Torn cache log page with a **Jump to Bottom** button and an **Export Logs** button — export your cache history as a single JSON file with one click, then automatically opens the analyzer for you.

**Key features:**

| Feature | Description |
|---|---|
| 📦 Quick-Jump Button | A purple *"Go to Cache Logs"* button appears on any Torn log page for instant navigation |
| 💾 One-Click Export | Downloads your full cache history as `torn_cache_logs_full.json` and opens the analyzer in a new tab |
| 🛡️ Full Cache Support | Correctly parses all 5 cache types including Armor |
| 🔒 100% Private | Everything runs locally in your browser — no data ever leaves your device |

---

<a id="cache-analyzer"></a>
### 📊 Cache Analyzer — Website

The Cache Analyzer is a companion web app hosted at **[torn-cache-dashboard.vercel.app](https://torn-cache-dashboard.vercel.app/)** that reads the JSON file exported by the userscript and visualizes your entire loot history. You upload your file locally — it is never sent anywhere.

**Key features:**

- **Rarity breakdowns** — counts and percentages of Yellow, Orange, and Red drops
- **Dry spell tracker** — current and longest streaks without rare drops, with color-coded warnings as you approach your personal record
- **Rare drops table** — a fully sortable list of every Red drop and double-bonus Orange drop
- **Bonus frequency** — which bonuses appear most often across your drops
- **Weapon / item frequency** — which specific items you've pulled most
- **Cache type breakdown** — distribution of drops across cache types
- **Trend chart** — your drop rate over time, auto-grouped by day, week, or month based on your selected date range
- **Date filtering** — filter by custom range or quick presets (Last Month, Last Year, 2024, etc.)
- **File merging** — combine multiple export files with automatic duplicate detection

> 🔒 The analyzer runs entirely in your browser. Your file is read locally using the browser's File API and is never uploaded to any server.

---

<a id="all-openings"></a>
### 📋 All Openings View

The **All Openings** panel is a separate view (accessible via the **📋 All Openings** button in the top-right of the dashboard) that shows your **complete, unfiltered opening history** as a sortable, searchable table — separate from the statistics tabs.

It is split into two sub-tabs:

- **Weapons** — shows all weapon cache openings (Small Arms, Melee, Medium Arms, Heavy Arms) with columns for Rarity, Weapon Name, Bonus 1, Bonus 2, Cache Type, and Date. Supports filtering by rarity, cache type, and bonus text search.
- **Armor** — shows all armor cache openings with columns for Rarity, Armor Name, Bonus, and Date. Supports filtering by rarity and bonus text search.

Both sub-tabs are fully sortable by any column and show a live result count. Filters persist between sessions.

> 💡 This view is ideal for looking up a specific drop, verifying a bonus you remember, or browsing your full history in a structured table.

---

<a id="installation"></a>
## 🔧 Installation

### Part 1 — Install the Userscript

To use the Log Exporter, you first need a userscript manager extension installed in your browser.

| Browser | Recommended Extension |
|---|---|
| Chrome / Edge / Brave | [Tampermonkey](https://www.tampermonkey.net/) |
| Firefox | [Tampermonkey](https://www.tampermonkey.net/) or [Greasemonkey](https://www.greasespot.net/) or [Violentmonkey](https://violentmonkey.github.io/) |
| Safari (macOS / iOS) | [Userscripts](https://apps.apple.com/us/app/userscripts/id1463298887) |

Once your userscript manager is installed, click the button below and then click **"Install this script"** on the Greasy Fork page:

**[👉 Install the Log Exporter from Greasy Fork](https://greasyfork.org/en/scripts/568130-torn-cache-log-exporter)**

The script is now active on `torn.com` automatically.

### Part 2 — Open the Analyzer

The analyzer is a standalone website — no installation needed. Just open it in your browser:

**[👉 Open the Torn Cache Analyzer](https://torn-cache-dashboard.vercel.app/)**

> 💡 After clicking **Export Logs** in the userscript, the analyzer will automatically open in a new tab — you don't need to navigate to it manually.

---

<a id="how-to-use"></a>
## 🚀 How to Use

The typical workflow is: **export from Torn → upload to the analyzer**. Here's the full step-by-step.

---

### Step 1 — Go to Your Cache Log Page

Navigate directly to your cache log:

```
https://www.torn.com/page.php?sid=log&log=2615
```

> **Shortcut:** If you're already on any Torn log page, a purple **📦 Go to Cache Logs** button will automatically appear on the right side of the screen. Click it to jump straight to the cache log without needing to remember the URL.

---

### Step 2 — Load Your Log Entries

Torn loads log entries dynamically as you scroll. To capture more history, you need to scroll the page to load entries before exporting.

1. Look for the script's control panel on the right side of the page. It has two buttons: **⬇️ Jump to Bottom** and **💾 Export Logs**.
2. Click **⬇️ Jump to Bottom** to scroll to the end of the currently loaded entries.
3. A notification will appear: *"Jumped to bottom. Scroll back up manually to load more entries, then export."*
4. Scroll back up — Torn will load more entries as you scroll. Repeat the jump as needed until all desired entries are visible.

> [!TIP]
> You don't need to load your entire history at once. Export whenever you have the entries you want — you can always merge multiple exports in the analyzer later.

---

### Step 3 — Export Your Logs

Once scrolling is complete and all entries are visible:

1. Click **💾 Export Logs**.
2. A file named **`torn_cache_logs_full.json`** will download automatically to your default downloads folder.
3. The **Torn Cache Analyzer** will open automatically in a new tab, ready for you to upload your file.

> [!TIP]
> To build up history over time, you can export at different points and later **merge multiple exports** in the analyzer using its "Add File" button. Duplicate entries are automatically detected and skipped.

---

### Step 4 — Analyze Your Data

1. On the **[Torn Cache Analyzer](https://torn-cache-dashboard.vercel.app/)** (which opened automatically after export), upload your downloaded `torn_cache_logs_full.json`.
2. Your full loot history loads immediately — no account or login required.

From here you can explore rarity stats, dry spell history, bonus frequencies, trend charts, and more. Use the date filter to zoom in on specific time periods, or use "Add File" to merge in older exports.

---

<a id="output-format"></a>
## 📄 Output Format

The exported file is a JSON array. Each entry represents one cache opening and has the following shape:

```json
{
  "timestamp": "14:23:05 - 01/03/26",
  "cacheType": "Heavy Arms",
  "weaponName": "RPG Launcher",
  "bonus": "Devastation & Proficiency",
  "doubleBonus": true,
  "rarity": "Orange"
}
```

| Field | Type | Description |
|---|---|---|
| `timestamp` | `string` | Time and date the cache was opened, in Torn's `HH:MM:SS - DD/MM/YY` format |
| `cacheType` | `string` | One of: `Small Arms`, `Melee`, `Medium Arms`, `Heavy Arms`, `Armor` |
| `weaponName` | `string` | Name of the item received |
| `bonus` | `string \| null` | Bonus string — may contain `&` for double bonuses; `null` if none |
| `doubleBonus` | `boolean` | `true` if the drop had two bonuses (weapon caches only; always `false` for Armor) |
| `rarity` | `string` | One of: `Yellow`, `Orange`, `Red` |

---

<a id="supported-cache-types"></a>
## 🗂️ Supported Cache Types

| Cache Type | Exported | Rarity Detection | Double Bonus Detection |
|---|---|---|---|
| Small Arms Cache | ✅ | ✅ | ✅ |
| Melee Cache | ✅ | ✅ | ✅ |
| Medium Arms Cache | ✅ | ✅ | ✅ |
| Heavy Arms Cache | ✅ | ✅ | ✅ |
| Armor Cache | ✅ | ✅ | N/A |

---

<a id="privacy"></a>
## 🔒 Privacy

Both the userscript and the analyzer have been designed with privacy as the top priority:

- The userscript reads log data directly from Torn's own page DOM — it makes no external requests of its own
- The JSON export is generated and downloaded entirely on your device
- The analyzer at [torn-cache-dashboard.vercel.app](https://torn-cache-dashboard.vercel.app/) reads your file locally using the browser's built-in File API
- There are **no external servers**, **no analytics**, **no tracking**, and **no accounts** of any kind — in either component

---

<a id="troubleshooting"></a>
## ❓ Troubleshooting

<details>
<summary><strong>The script buttons don't appear on the page</strong></summary>

Make sure your userscript manager (e.g. Tampermonkey) is enabled and the script is turned on in its dashboard. Try doing a hard refresh (`Ctrl+Shift+R` / `Cmd+Shift+R`) and waiting a few seconds for the UI to inject after the page loads.

</details>

<details>
<summary><strong>The export file is empty or has very few entries</strong></summary>

Make sure you've scrolled far enough to load the entries you want before clicking Export Logs. Use the **Jump to Bottom** button and then scroll back up to load more entries.

</details>

<details>
<summary><strong>The analyzer says "This doesn't look like a valid cache export"</strong></summary>

Make sure you're uploading the file produced by this script (`torn_cache_logs_full.json`) and not some other JSON file. The analyzer expects the specific fields that this script outputs.

</details>

<details>
<summary><strong>Some entries are marked as skipped in the analyzer</strong></summary>

A small number of entries may have unreadable or missing timestamps if the log page didn't fully render that row during scrolling. This is normal and typically affects only a negligible fraction of your total drops.

</details>

<details>
<summary><strong>The analyzer didn't open automatically after export</strong></summary>

Your browser may have blocked the new tab from opening. Check for a blocked pop-up notification in your browser's address bar and allow it, or navigate to the analyzer manually at [torn-cache-dashboard.vercel.app](https://torn-cache-dashboard.vercel.app/).

</details>

---

<a id="version-history"></a>
## 📦 Version History

| Version | Date | Changes |
|---|---|---|
| **9.4** | 2026-03-03 | Published rule-compliant version to Greasy Fork |
| **9.3** | 2026-03-03 | Removed auto-scroll loop; replaced with single Jump to Bottom; rule-compliant release |
| **9.2** | 2026-03-02 | Export now auto-opens the Torn Cache Analyzer in a new tab; export file renamed to `torn_cache_logs.json` |
| **9.1** | 2026-03-02 | Added quick-jump "📦 Go to Cache Logs" button on all non-cache log pages |
| **9.0** | — | Added full Armor Cache support |
| Earlier | — | Fast auto-scroll engine (pre-rule-change), multi-cache type export, double bonus detection |

---

<a id="author"></a>
## 👤 Author

Made by **himlamlolz** on Torn City.

- 🌐 [Torn Cache Analyzer](https://torn-cache-dashboard.vercel.app/)
- 💻 [GitHub Source Code](https://github.com)
- 🐛 [Report a Bug](https://greasyfork.org/en/scripts/568130-torn-cache-log-exporter/feedback)

---

<div align="center">

*The analyzer does not store, collect, or transmit any of your data.*
*Everything runs entirely in your browser — your log file is read locally and never leaves your device.*
*No accounts, no tracking, no servers.*

</div>
