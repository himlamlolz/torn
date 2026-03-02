<div align="center">

# 🗃️ Torn Cache Log Exporter

**Fast auto-scroll + export all caches including Armor**
A Tampermonkey userscript for [Torn City](https://www.torn.com)

[![Install on Greasy Fork](https://img.shields.io/badge/Install%20on-Greasy%20Fork-brightgreen?style=for-the-badge&logo=greasyfork&logoColor=white)](https://greasyfork.org/en/scripts/568130-torn-cache-log-exporter-fast-auto-scroll-armor)
[![Version](https://img.shields.io/badge/Version-9.1-blue?style=for-the-badge)]()
[![Applies To](https://img.shields.io/badge/Applies%20To-torn.com-red?style=for-the-badge)]()

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Installation](#-installation)
- [How to Use](#-how-to-use)
- [Output Format](#-output-format)
- [Supported Cache Types](#-supported-cache-types)
- [Torn Cache Analyzer](#-torn-cache-analyzer)
- [Privacy](#-privacy)
- [Troubleshooting](#-troubleshooting)
- [Version History](#-version-history)
- [Author](#-author)

---

## 📖 Overview

This userscript runs on [Torn City](https://www.torn.com) and lets you export your **entire cache opening log history** with a single click. It handles all cache types — Small Arms, Melee, Medium Arms, Heavy Arms, and Armor — and pairs with the **Torn Cache Analyzer** to give you full loot breakdowns, rarity stats, dry spell tracking, bonus frequencies, and trend charts over time.

---

## ✨ Features

| Feature | Description |
|---|---|
| ⚡ Fast Auto Scroll | Automatically scrolls to the bottom of the log page to load all entries — no manual scrolling needed |
| 📦 Quick-Jump Button | A purple *"Go to Cache Logs"* button appears on any Torn log page for instant navigation |
| 💾 One-Click Export | Downloads your full cache history as a clean `torn_cache_logs_full.json` file |
| 🛡️ Full Cache Support | Correctly parses all 5 cache types including Armor |
| 🔒 100% Private | Everything runs locally in your browser — no data ever leaves your device |

---

## 🔧 Installation

### 1. Install a Userscript Manager

You need a userscript manager extension installed in your browser before you can use this script.

| Browser | Recommended Extension |
|---|---|
| Chrome / Edge / Brave | [Tampermonkey](https://www.tampermonkey.net/) |
| Firefox | [Tampermonkey](https://www.tampermonkey.net/) or [Greasemonkey](https://www.greasespot.net/) |
| Safari (macOS / iOS) | [Userscripts](https://apps.apple.com/app/userscripts/id1463298887) |

### 2. Install the Script

Once your userscript manager is installed, click the button below and then click **"Install this script"** on the Greasy Fork page:

**[👉 Install from Greasy Fork](https://greasyfork.org/en/scripts/568130-torn-cache-log-exporter-fast-auto-scroll-armor)**

That's it — the script is now active on `torn.com`.

---

## 🚀 How to Use

### Step 1 — Go to Your Cache Log Page

Navigate directly to your cache log:

```
https://www.torn.com/page.php?sid=log&log=2615
```

> **Shortcut:** If you're already on any Torn log page, a purple **📦 Go to Cache Logs** button will automatically appear in the top-right corner of the screen. Click it to jump straight to the cache log without needing to remember the URL.

---

### Step 2 — Auto-Scroll to Load All Entries

Torn loads log entries dynamically as you scroll down. To capture your **full history**, all entries need to be loaded into the page before you export.

1. Look for the script's control panel in the **top-right corner** of the page. It has three buttons: **Fast Auto Scroll**, **Stop**, and **Export Logs**.
2. Click **⚡ Fast Auto Scroll**.
3. The page will begin scrolling automatically and loading entries. A notification will appear at the bottom of the screen once scrolling is complete.
4. If you need to interrupt the process, click **Stop**.

> [!WARNING]
> Do not navigate away from the page while scrolling is in progress. Doing so will unload all the entries and you'll need to start over.

> [!TIP]
> How long this takes depends on your log history. A few months of data typically takes under a minute. Years of logs may take a few minutes.

---

### Step 3 — Export Your Logs

Once scrolling is complete and all entries are visible:

1. Click **💾 Export Logs**.
2. A file named **`torn_cache_logs_full.json`** will download automatically to your default downloads folder.

> [!TIP]
> To build up history over time, you can export at different points and later **merge multiple exports** together in the Torn Cache Analyzer using its "Add File" button. Duplicate entries are automatically detected and skipped.

---

### Step 4 — Analyze Your Data

Upload your `torn_cache_logs_full.json` to the **Torn Cache Analyzer**:

1. Open the Torn Cache Analyzer.
2. Click **"Choose JSON File"** and select your downloaded file.
3. Your full loot history loads immediately — no account or login required.

---

## 📄 Output Format

The exported file is a JSON array. Each entry has the following shape:

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

## 🗂️ Supported Cache Types

| Cache Type | Exported | Rarity Detection | Double Bonus Detection |
|---|---|---|---|
| Small Arms Cache | ✅ | ✅ | ✅ |
| Melee Cache | ✅ | ✅ | ✅ |
| Medium Arms Cache | ✅ | ✅ | ✅ |
| Heavy Arms Cache | ✅ | ✅ | ✅ |
| Armor Cache | ✅ | ✅ | N/A |

---

## 📊 Torn Cache Analyzer

The analyzer is a companion web app that reads your exported JSON file and visualizes your entire loot history. Features include:

- **Rarity breakdowns** — counts and percentages of Yellow, Orange, and Red drops
- **Dry spell tracker** — current and longest streaks without rare drops, with color-coded warnings as you approach your personal record
- **Rare drops table** — a fully sortable list of every Red drop and double-bonus Orange drop
- **Bonus frequency** — which bonuses appear most often across your drops
- **Weapon / item frequency** — which specific items you've pulled most
- **Cache type breakdown** — distribution of drops across cache types
- **Trend chart** — your drop rate over time, auto-grouped by day, week, or month based on your selected date range
- **Date filtering** — filter by custom range or quick presets (Last Month, Last Year, 2024, etc.)
- **File merging** — merge multiple export files together with automatic duplicate detection

> 🔒 The analyzer runs entirely in your browser. Your file is read locally and never uploaded to any server.

---

## 🔒 Privacy

This script and the analyzer have been designed with privacy as the top priority:

- The log is read directly from the Torn page's own DOM — no external requests are made
- The JSON export is generated and downloaded entirely on your device
- The analyzer reads your file locally using the browser's built-in File API
- There are **no external servers**, **no analytics**, **no tracking**, and **no accounts** of any kind

---

## ❓ Troubleshooting

<details>
<summary><strong>The script buttons don't appear on the page</strong></summary>

Make sure your userscript manager (e.g. Tampermonkey) is enabled and the script is turned on in its dashboard. Try doing a hard refresh (`Ctrl+Shift+R` / `Cmd+Shift+R`) and waiting a few seconds for the UI to inject after the page loads.

</details>

<details>
<summary><strong>Auto-scroll stopped before loading all entries</strong></summary>

The script detects completion by checking if the page height has stopped increasing across 6 consecutive checks. On slow connections, new entries might not load fast enough between checks. Simply click **Fast Auto Scroll** again to continue loading from where it left off.

</details>

<details>
<summary><strong>The export file is empty or has very few entries</strong></summary>

This almost always means the page didn't scroll far enough before you exported. Make sure the auto-scroll runs to completion (watch for the notification at the bottom of the screen) before clicking Export Logs.

</details>

<details>
<summary><strong>The analyzer says "This doesn't look like a valid cache export"</strong></summary>

Make sure you're uploading the file produced by this script (`torn_cache_logs_full.json`) and not some other JSON file. The analyzer expects the specific fields that this script outputs.

</details>

<details>
<summary><strong>Some entries are marked as skipped in the analyzer</strong></summary>

A small number of entries may have unreadable or missing timestamps if the log page didn't fully render that row during scrolling. This is normal and typically affects only a negligible fraction of your total drops.

</details>

---

## 📦 Version History

| Version | Date | Changes |
|---|---|---|
| **9.1** | 2026-03-02 | Added quick-jump "📦 Go to Cache Logs" button on all non-cache log pages |
| **9.0** | — | Added full Armor Cache support |
| Earlier | — | Fast auto-scroll engine, multi-cache type export, double bonus detection |

---

## 👤 Author

Made by **[HLZZ \[3129515\]](https://www.torn.com/profiles.php?XID=3129515)** on Torn City.

---

<div align="center">

🗡️ Want to buy or sell RW weapons?
**[Visit HLZZ's RW Marketplace on the Torn forums](https://www.torn.com/forums.php#/p=threads&f=10&t=16416628&b=0&a=0)**

</div>
