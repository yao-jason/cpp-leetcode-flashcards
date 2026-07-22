# C++ LeetCode Flashcards for Data Structures & Algorithms Interview Preparation

This [website](https://yao-jason.github.io/cpp-leetcode-flashcards/) offers a curated collection of **37 C++ algorithm flashcards** for coding interview preparation, organized by pattern recognition rather than problem lists.

## 🚀 Key Philosophy
Each flashcard is a self-contained pattern card covering:
- **Triggers**: Conceptual keywords that signal when to apply this pattern.
- **Complexity**: Time and space complexity at a glance.
- **Minimalist Template**: The core C++ implementation, stripped of problem-specific noise.
- **Gotchas**: Common pitfalls — overflow, boundary conditions, off-by-one errors.
- **Practice Problems**: 2–3 representative LeetCode problems linking directly to the problem page.

## ✨ Features
- **13 categories** — Array, Stack, Heap, Linked List, Tree, Backtracking, Graph, Greedy, DP, Math, String, Advanced DS, Design
- **Difficulty badges** — Easy / Medium / Hard on every card
- **Collapsible sidebar groups** — expand/collapse by category, with per-category read progress indicator
- **Real-time search** — filter patterns by name instantly
- **One-click practice** — problem links open LeetCode in a new tab
- **Progress tracking** — mark cards as read; overall progress bar and per-category counters persist across sessions via `localStorage`
- **Mark All Read / Reset All** — bulk-mark every card as read or reset all progress with one click
- **Continue button** — jumps directly to the next unread card
- **Floating action bar** — a persistent `← Mark as Read →` pill fixed at the bottom of the screen for quick touch navigation on mobile/tablet; fully synced with keyboard shortcuts
- **Keyboard shortcuts** — navigate and mark cards without touching the mouse (see below)
- **Responsive layout** — collapsible sidebar with a floating hamburger button and dark overlay on mobile/tablet

## ⌨️ Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `Space` | Toggle **Mark as Read / Unread** for the current card |
| `C` | **Continue** — jump to the next unread card |
| `↑` | Go to the **previous** card (sidebar order) |
| `↓` | Go to the **next** card (sidebar order) |

> Shortcuts are disabled when the search box is focused.

## 🛠️ Tech Stack
- **Frontend**: Vanilla JS, CSS Grid
- **Highlighting**: [Highlight.js](https://highlightjs.org/) (GitHub Dark Theme)
- **Data**: Centralized `data.json` — single source of truth for all 37 patterns

## 📂 How to Use
1. Use the **search box** or browse **category groups** in the sidebar to find a pattern.
2. Read the **Triggers** — can you recognize when this pattern applies?
3. Study the **Complexity** and **C++ template**.
4. Check the **Gotchas** below the code for common mistakes.
5. Click a **Practice** link to solve a representative problem on LeetCode.
6. Press **`Space`** (or tap **Mark as Read** in the floating bar) to record the card as reviewed.
7. Use `↑` / `↓` keys or the floating bar arrows to navigate between cards.
8. Press **`C`** (or click **Continue**) to jump to the next unread card and keep the momentum going.

## 📐 Code Template Style Guide

All templates follow a **wide-screen, single-viewport** authoring rule — the goal is to see the complete template without vertical scrolling:

- **Inline comments**: Explanatory notes go at the **end of the relevant line** (`code; // why`), never on a standalone line above.
- **Horizontal density**: Prefer one longer line over two short ones. Combine related operations on the same line where clarity allows (e.g., `int l = 0, r = n - 1;`).
- **Section dividers**: Use `// --- Section Name ---` on the line that starts each template variant. One blank line between major sections; none within a section.
- **Goal**: Every template should be fully visible in a typical widescreen browser viewport without the user reaching for the scroll wheel.
