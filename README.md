# Power under pressure

Single-page dashboard on climate risk in El Salvador's power sector. Built for discussion with national counterparts.

## What it shows

- Generation, substation and transmission assets under floods, droughts and heatwaves, near term (2015-2044) and mid-century (2041-2070).
- Risk by asset type, by number of assets and by installed capacity.
- Resilience measures by asset group and hazard.
- The scoring method, with a live calculator.
- A register of every asset group, hazard, period and risk class, downloadable as CSV.

## Data

Asset counts and capacities come from the IRENA power sector climate risk assessment for El Salvador, Annex 4 and Annex 5, annual aggregation. Nothing is fetched at runtime.

Department boundaries: geoBoundaries gbOpen, El Salvador ADM1 (simplified).

## Build

    python3 build.py        # data + geometry + icons + fonts -> build/index.html
    bash publish.sh         # build, then encrypt to gated/index.html and index.html

The page is a single self-contained file: CSS, JS, fonts (Montserrat and Inter, SIL OFL) and geometry are inlined. No CDN, no API key, no server.

The published page is passphrase-gated with Staticrypt. The passphrase lives in `.passphrase` locally and is not committed.

## Design

Follows the IRENA design annex in the `static-tracker-site` skill: IRENA blue `#0073AB`, IRENA grey `#58585A`, open-source type, single-hue risk ramp, the designations disclaimer under the footer, and a map that fits its frame.
