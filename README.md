# QC Lookup 3D

Single-file web app (`index.html`) for looking up quay crane (QC) maintenance status: PM 2026, PR / WO, wirerope, inspection and oil sampling.

## What's new
- **Animated 3D quay crane** (three.js) in the home hero: a ship-to-shore crane discharges and loads a container between the vessel and a terminal truck, with neighbouring cranes working, waves, and a sunset sky. Drag to rotate.
- **Per-crane 3D banner**: the crane number is painted on the crane. Cranes in operation run the working cycle. Cranes that are down (for example `LONG DOWN`) park the trolley and raise the boom.
- **Fleet stats** (cranes, in operation, down, open PR / WO) with count-up animation.
- Status dots on every crane tile (down cranes blink), hover lift, and staggered fade-in on cards.
- Respects `prefers-reduced-motion`. If WebGL or three.js isn't available, it falls back to the original illustrated SVG.

## Data
The page has no built-in data. Tap **Upload live update file** and choose the latest LIVE UPDATE Excel file.

- **On claude.ai (shared):** one upload is stored in the page's shared storage, and everyone who opens the page sees it straight away, on any device. Only people with edit access see the upload button; everyone else sees the latest file.
- **Anywhere else (for example GitHub Pages):** the upload is saved only in that browser (IndexedDB) and reopens automatically next time.
