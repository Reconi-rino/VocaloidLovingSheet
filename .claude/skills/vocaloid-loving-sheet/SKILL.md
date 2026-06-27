---
name: vocaloid-loving-sheet-builder
description: Build a full interactive Vocaloid/术曲 preference sheet web app from a 5x6 template, including search, aliases, custom entries, uploads, themes, local persistence, JSON/PNG export, and optional multi-agent implementation.
---

# Vocaloid Loving Sheet Builder

Use this skill when asked to create, implement, review, or extend a “术曲个人喜好表” interactive webpage or app.

## Primary Workflow

1. Read the project-level master prompt at `../../../VOCALOID_LOVING_SHEET_CLAUDE_PROMPT.md`.
2. Inspect the existing project. If it already has a frontend stack, preserve it. If the directory is empty, scaffold Vite + React + TypeScript.
3. Implement the app, not just a plan.
4. Keep the first screen as the editable 5x6 preference sheet.
5. Verify `npm run build`.
6. Report completed features, run instructions, build status, main files, and future API integrations.

## Required Product Surface

- 30 fixed categories in a 5 column x 6 row sheet.
- Editable cells for songs, producers, singers, albums, and custom entries.
- Search by title, aliases, producers, singers, albums, and tags.
- User-created entries saved locally and searchable.
- Image URL and local upload support for covers, producer avatars, and singer portraits.
- Four themes: original black-white, clean editor, dark stage, magazine collage.
- Auto-save, JSON import/export, PNG export, and share-text copy.

## Recommended Stack

- Vite + React + TypeScript
- Tailwind CSS
- Fuse.js
- localStorage first; IndexedDB when image persistence becomes too large
- html-to-image or dom-to-image
- lucide-react

## Data Source Priority

1. VocaDB: primary data source for Vocaloid songs, artists, albums, aliases, tags, and PV links. Use its Swagger/OpenAPI documentation.
2. YouTube Data API: optional video thumbnail and channel supplement; requires API key and quota.
3. Niconico Snapshot Search API: optional PV metadata supplement; verify current endpoint and access requirements.
4. MediaWiki/Fandom APIs: optional wiki metadata and aliases; do not scrape lyrics.
5. Official character/software sites: use for authoritative character info and licenses, but prefer user uploads over hotlinking artwork.
6. Bilibili: keep as a future/manual/proxy integration, not a required pure frontend dependency.

## Multi-Agent Pattern

If subagents are available, spawn these roles in parallel and merge their outputs:

- Product and interaction: categories, edit flows, grid behavior, empty states, mobile behavior.
- Data and search: types, seed data, Fuse search, local storage, adapter interfaces, VocaDB plan.
- UI and export: themes, responsive CSS, image handling, PNG export stability.
- Integration and QA: package setup, README, build checks, bug fixes.

The lead agent owns integration and must produce a running app.

## Validation Checklist

- Open page.
- Edit any cell.
- Search seed entries and aliases.
- Upload or paste an image.
- Save locally and survive refresh.
- Switch themes.
- Export PNG.
- Export and import JSON.
- Build passes.

