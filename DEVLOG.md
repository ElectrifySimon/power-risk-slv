## 28 November 2026 - story and dashboard pass

- Hero headline was mounted by a React typewriter (`vendor/hero-react.js`). At first paint the h1 was empty, then half-written ("Power un|") for about 1.5 s, with an orange caret on a blue page, and the DOM carried three copies of the title so a screen reader read it repeatedly. Replaced with the static h1 plus one CSS reveal honouring reduced motion. Checked: full text at 0.6 s and at 3 s, one copy.
- `id="mapramp"` existed in both `src/story.html` and `src/page.html`. `getElementById` returned the story element, so the dashboard legend never changed with the hazard. Split into `mapramp-story` and `mapramp-dash`. Checked: blue for floods, amber for droughts, red for heatwaves.
- Phone hero: the country art started at x 86 and was 343 wide on a 390 px screen, so it ran off the edge and sat directly under the standfirst. Art now sits inside the frame at 55% opacity with the contour field at 35%, and a scrim from 34% down. Measured with the text hidden: background behind the paragraph is mean 19, sd 2.5, range 11 to 72, so the copy sits on flat dark.
- Register: the table is 689 px wide inside a 304 px scroller at 390 px with no cue that it scrolls. Added a one-line hint below the table, shown under 760 px only.
- Story prose checked against the tables: 10 of 19 hydropower plants at high or critical drought risk (9 + 1 in both periods) and solar moderate heat at 14% near term to 99.7% mid-century are both correct, so the hardcoded sentences stay.
- Live check at 1440 and 390 after unlocking: title complete, no duplicate ids, document width equals viewport, KPIs 91 / 23 / 81 / 32, four tabs, 136 register rows, JSON download 43,361 bytes with 10 top-level keys, no console errors.

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

## 26 November 2026 - icons, towers, responsive

- Icon set: 18 line icons in vendor/icons, 24x24 stroke, built into the sprite and used in story kickers, chart titles, KPI labels, tabs, hazard controls and register rows.
- Towers step now has its own chart: share at high or critical flood risk, 7% (220 of 3 026) to 32% (978), labelled with both the share and the count. Earlier it reused the substations waffle.
- KPI cards carry an icon beside the label, a share bar under the value, darker context text.
- Responsive: no document overflow at 390 / 768 / 1024 / 1440. Charts re-fit on container resize through ResizeObserver plus a deferred redraw after activation (fixed 100px-wide canvases on mobile).
- Hero: country art fits the frame, copy centred, scroll cue moved into the text column.

## 2026-11-26 tab row scrollbar
- Symptom: a vertical scrollbar in the dashboard tab row (Risk results / Measures / Method / Register).
- Cause: `.tabs` used `overflow:auto` with `.tab{margin-bottom:-1px}`, so the strip had 1px of vertical overflow and Chromium drew a scrollbar.
- Fix: no scroll container. `.tabs` is `flex-wrap:wrap; overflow:visible`; at 390px the tabs wrap to two rows with no horizontal overflow. Active underline sits on the rule again.

## 26 November 2026 - single JSON data layer

- data/power-risk-slv.json is now the only data file: meta, periods, categories, hazards, assets, definitions, counts N and MW, measures, projected department geometry, and a derived block with every figure the narrative quotes.
- data/slv.json removed; its content lives inside the single file. scripts/build_data.py refreshes the derived block and projection from that same file plus geo/slv_adm1.geojson.
- build.py loads one file and substitutes {{token}} figures into story.html from DATA.derived, so numbers in prose cannot drift from the tables.
- Register download switched from CSV to one JSON (el_salvador_power_risk.json) carrying counts, measures, derived figures and the register rows on screen.
- Verified: live page label Download JSON, payload 43,361 bytes, 136 register rows, 10 top-level keys, no console errors; story figures equal to the previous hardcoded text.
