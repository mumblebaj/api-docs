# Changelog

## [v1.5.2] - 2026-02-18
### Enhancements
- Add localised CDN's and pin to specific versions
- Update logic to check if CDN is available, if not use local.
- Update branding

## [v1.0.2] - 2025-12-18
## Schema Export Architecture

- openapiEditor.js: orchestration only
- schemaExportModal.js: modal lifecycle
- selectionUtils.js: selection state
- dependencyResolver.js: dependency graph
- exporters: markdown / confluence

Refactored via multi-pass extraction to avoid regressions.

## [v1.0.1] - 2025-10-25
### Build Enhancements
- Implement cache-busting tech to bypass Redoc caching
- Implement auto build incrementation
- Implement auto-increment of cache-busting refresh
- Add build-info.json
- Add buildVersion.js
- Update deployment logic in docs.yml

## [1.0.0] – 2025-10-25
### 🎨 UI / Theme Enhancements
- Implemented **Monaco Editor theme dropdown** with persistent selection (`vs`, `vs-dark`, `hc-black`).
- Added automatic theme initialization based on system preference, with localStorage retention.
- Introduced **dynamic `data-theme` support** for future light/dark synchronization.
- Ensured seamless background blending between Monaco and surrounding `#yamlEditor` container.

### 🧱 ReDoc Styling Refinements
- Reworked dark-mode overrides for ReDoc within `#previewPane`:
  - Neutral dark background (`#121212`) for better contrast.
  - Unified white text for headings, labels, and inline spans.
  - Sidebar, tables, and code blocks now align with Monaco’s tone.
- Added scoped link coloring and hover states (`#61affe → #80bfff`).
- Improved operation badges (GET, POST, PUT, DELETE) with distinct colors.
- Fixed readability issues in ReDoc schema cards (`sc-ikkxIA`) and inner property tables.
- Added styling for ReDoc’s nested elements, including:
  - **Tabs** (Payload / Example)
  - **Labels** (e.g., *Status Confirmations*)
  - **Schema cards** (OneOf / AnyOf sections)

### ❤️ Readability & Badge Fixes
- Restored **red “required” labels** in schema views:
  - Targets `div.sc-Nxspf.sc-hRJfrW.lmPAIU.dBPdaM` and related classes.
  - Uses precise, high-specificity selectors to override ReDoc’s internal white text.
- Unified other badges (like *string*, *any*, *additional property*) under consistent dark-mode readability.
- Preserved ReDoc’s spacing, font-size, and structure for compatibility with future versions.

### 🧭 Toolbar & Layout Improvements
- Added “Theme” selector to the toolbar beside Export buttons.
- Styled dropdown to match dark and light themes seamlessly.
- Verified responsive resizing between Monaco and ReDoc panels using `#dragbar`.

### ✅ Stability / UX
- Validated no flicker or color mismatch during theme transitions.
- Confirmed consistent look and feel across all Monaco themes.
- Clean separation between editor, preview, and lint components.

---

### 🏷️ Notes
This release marks the **first stable UI version** of the OpenAPI Editor with fully integrated Monaco + ReDoc theming.  
Future iterations may include synchronized light/dark switching for ReDoc and subtle hover animations for schema elements.

