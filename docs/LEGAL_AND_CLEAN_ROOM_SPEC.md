# Legal Boundaries, Clean-Room Specification & Intellectual Property Firewall

## 1. Executive Summary & Purpose

This document establishes the formal **Clean-Room Engineering Protocol and Legal Framework** for the Solitaire & Card Games project in accordance with US Copyright Law, the European Union Software Directive (Directive 2009/24/EC), and relevant video game case law (e.g., *Atari Games Corp. v. Oman*, *Atari v. North American Philips*, *Tetris Holding, LLC v. Xio Interactive, Inc.*).

The objective is to leverage the structural insights and technical lessons learned from the analysis of legacy and commercial card games (including the architectural breakdown in `ANALYSIS_REPORT.md`) **without incorporating any copyrighted expression, proprietary code, compiled binaries, protected art, trade dress, trademarks, sound banks, or curated seed packs**.

Every component created for this project is 100% original, built from scratch using clean-room specifications, and verified under an open-source permissive license (MIT).

---

## 2. The IP Boundary Matrix: What is Legal vs. What is Off-Limits

Under established intellectual property jurisprudence (Section 102(b) of the US Copyright Act), **ideas, game mechanics, mathematical rules, and algorithms are not copyrightable**. Only the specific expressive implementation (art, sound, exact source code, proprietary file formats, trademarks, and distinctive trade dress) is protected.

| Domain | Legally Usable (Public Domain / Mechanics / Mathematics) | Proprietary / Strictly Off-Limits (Quarantined) | Our Custom Clean-Room Implementation |
|---|---|---|---|
| **Game Rules & Mechanics** | Klondike, FreeCell, Spider standard rules, card ranks (Ace to King), suit hierarchies, foundation build orders, alternating color rules. | Any proprietary mini-games, exclusive event rule configurations, or verbatim tutorial scripts. | Implemented as a pure functional state transition validator (`apply(state, command) -> {ok, state', events}`). |
| **Card Representation** | Mathematical mapping of 52 cards (`rank = id % 13`, `suit = id / 13`). Standard card deck conventions in public domain since the 15th century. | Any proprietary metadata formats or custom struct schemas directly lifted from SGI binaries. | Canonical immutable `Card` object model with deterministic rank/suit/color encoding. |
| **PRNG & Shuffling** | Publicly documented mathematical PRNG algorithms (SplitMix64, xoshiro256, PCG) and Fisher-Yates shuffle. | Microsoft CRT `rand()` LCG shuffle (`state * 214013 + 2531011`) used to generate classic deals 1..32,000; any proprietary seed lists. | Original 64-bit SplitMix64 generator coupled with Lemire's unbiased bounded shuffle method. Zero Microsoft deal numbering. |
| **Solvable Deals & Seeds** | The concept of solver-verified solvable deals; generate-and-test solvability verification. | Microsoft's proprietary `solvableseedpacks/*.csv` lists, curated challenge decks, or proprietary deal IDs. | Autonomous heuristic solver engine that verifies deals on the fly and generates our own seed catalog with custom base32 deal tokens. |
| **Visual Art & Deck Design** | Standard card concepts (Hearts, Diamonds, Clubs, Spades, Jack, Queen, King). | SGI/Microsoft `.webp`/`.png` textures, card back artwork, UI sheets, DirectX `.cso` shader bytecode, `.fxeffect` meshes. | 100% original procedural SVG vector deck. Bespoke geometric/Art Deco royal face card illustrations and 5 original card back themes. |
| **Audio & SFX** | The concept of card sounds (slides, flips, chimes). | Audiokinetic Wwise `.bnk` soundbanks, licensed Foley samples, or Microsoft audio assets. | 100% synthesized audio engine using the native Web Audio API (procedural oscillators, noise buffers, resonant bandpass filters). Zero external audio files. |
| **Scoring & Tuning** | Basic point additions/subtractions for card movement. | Exact Microsoft tuning numbers (e.g., the proprietary `700,000 / time_seconds` bonus formula, Spider 500-point start). | Custom, balanced scoring model with combo streaks, speed multipliers, and vegas modes defined in versioned `tuning.json`. |
| **UI & Layout** | Standard 7-column tableau, foundation row, waste/stock layouts (established in physical card play centuries ago). | Microsoft Solitaire Collection UI chrome, SGI `YFFI` chunk formats, Xbox Live widgets, proprietary menus. | Modern, clean luxury dark-mode design with responsive layout, glassmorphic controls, and original styling. |
| **Trademarks & Branding** | The generic English word "Solitaire". | "Microsoft Solitaire Collection", "Microsoft Casual Games", "Xbox", SGI logos, and associated trade dress. | Original branding: **Solitaire Sovereign** / **Aetheria Card Suite**. |

---

## 3. Seven-Step Clean-Room Verification Protocol

To ensure unimpeachable legal provenance:

1. **Quarantine:** All extracted legacy assets in `extracted_assets/` and compiled binaries (`Solitaire.winmd`, etc.) are isolated and excluded from build artifacts.
2. **Functional Specification:** Game rules are written strictly from historical public card game literature (e.g., Hoyle's Rules of Games, public domain game rules).
3. **Independent Implementation:** All code is written fresh in modular JavaScript / ES modules without decompiled fragments.
4. **Original Asset Generation:** All visual assets are rendered via mathematical SVG code written directly in the engine.
5. **Procedural Audio Generation:** Audio is synthesized mathematically in real time via the Web Audio API without using recorded audio samples.
6. **Provenance Documentation:** All assets, algorithms, and dependencies are cataloged in `docs/PROVENANCE_LOG.csv` with timestamps and origin statements.
7. **License & Freedom to Operate:** The codebase is released under the permissive MIT license, ensuring full commercial and personal use rights without intellectual property encumbrances.
