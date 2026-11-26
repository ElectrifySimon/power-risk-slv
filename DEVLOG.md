# Devlog

## 26 November 2026 - first build

Source material: two artifacts prepared by the team in Claude (a dashboard preview and a long-read story), plus the IRENA risk assessment annex tables. The story is not reproduced here; this page replaces the dashboard shell and keeps its content.

What changed from the team's build:

- Palette corrected. Their `--blue` was `#0073A7`; IRENA blue is `#0073AB`. Three ad-hoc blues replaced by one blue and a defined ramp.
- Type replaced. Arial throughout became Montserrat for display and Inter for interface, both self-hosted and inlined, with tabular figures.
- Risk ramp rebuilt. Four hues (green, amber, orange, red) became one hue ladder with red reserved for critical, and labels placed outside thin segments. Their low and moderate colours measured 2.17:1 and 1.87:1 against white.
- Map replaced. The team's 40-point schematic outline became 14 real departments from geoBoundaries, with a directional hazard wash labelled as an indicative pattern. No invented values: the assessment has no department-level hazard figures yet.
- Register added. 3,026 towers, 159 substations and 1,999 generation assets can now be inspected and exported; the team's build had a three-row table.
- KPI strip derives every number from the same tables as the charts. Checked against the source artifact: 91%, 23%, 81%, 32% for floods, 2041-2070.
- Accessibility: skip link, tab roles, visible focus rings, reduced-motion guard, print stylesheet. The source had no `:focus` rule at all.
- Print: all four sections print, tabs and controls hide, table unclips.

Verified in Chrome at 390, 768 and 1440 px: no horizontal overflow, map and its SVG share the same box, stacked bars fill their column, segments sum to 100%, no console errors.

Notes:

- The capacity view applies to generation only, as in the source.
- Hotspot labels WEST / CENTRE / EAST are retained from the assessment narrative; they are not administrative units.

## 26 November 2026 - story front door, round three

- The page now opens on a parallax story in the dark navy, four beats driven by the assessment numbers, and closes on a button into the dashboard. One page, one passphrase, two acts: `#story` and `#dashboard`.
- Story numbers are derived from the same tables as the dashboard, not typed: 56%, 81%, 100% and 1 813.
- Round three fixes: hero columns aligned to one grid, KPI numbers reduced below the H1 and rebuilt as delta chips, map neighbour labels moved outside the borders, a less-change/more-change key under the map, chart rows sorted by share with a high-plus-critical column, register filters for group and risk class, sort indicators, `n/a` for capacity that is not reported, and a scroll fade on the table.
- Small samples now say `indicative` in the row label, so a planned asset cannot read as a 100% finding.
- Visual review ran on a second model (Claude Haiku via the vision gateway, since the default model returns empty answers for images). Scores moved 7 to 8 out of 10 on the story hero.

## 26 November 2026 - ECharts

- Story visualisations now run on Apache ECharts 5 (vendored, 1.1 MB, served from `vendor/echarts.min.js`, not inlined; Staticrypt encrypts only the page).
- Charts: substation waffle (scatter on a grid, staggered 4 ms per cell), hydropower grid (22 ms per plant), solar stacked bars across the two periods. Lazy-initialised on step activation so the reveal animation plays when the reader arrives, not off-screen at load.
- Legends added under each chart; waffle widened to 470px.
- Verified: no console errors, three canvases at 470x300 / 320x170 / 460x170, 94k-122k pixels change between frames 600 ms apart on entry.
