# QC Dashboard Status

A web dashboard for quay crane (QC) maintenance. It reads the LIVE UPDATE Excel file and shows PM, PR / WO, work requests, wirerope, PMA / CF, inspections, oil sampling and SOS coupling, with an animated 3D quay crane.

`index.html` is the whole app in one file. Open it in a browser, or publish it (for example GitHub Pages or claude.ai).

## Pages

The Home page is short on purpose. Each card opens a page with the full detail.

| Page | What it shows |
| --- | --- |
| **Home** | 3D crane, crane search, fleet status ring and one summary card per topic |
| **Alerts** | Everything that needs action, grouped by reason: cranes down, open P1 work requests, ropes near their move limit, PMA / CF expired or expiring, inspection plan dates passed |
| **Insights → PM** | Completion by month, this month by crane, a status grid for every crane and month, longest time since PM |
| **Insights → Work requests** | Raised per month, open by criticality, type and age, cranes with the most, the full open list |
| **Insights → PR / WO** | Value by status, PR / PO status, top vendors, jobs per month, backlog by year, largest open jobs |
| **Insights → Wirerope** | Ropes closest to their limit, by rope type, pending by plan group, replaced after the limit, pending list, SANY update |
| **Insights → Inspection** | PMA / CF expiry by month, expired and expiring lists, quarterly inspection progress |
| **Insights → Oil** | Oil jobs per month, by component, longest since last job, SOS coupling service |
| **Insights → Oil lab** | The oil analysis file: a crane-by-component **plan board** that shows at a glance what needs oil replacement (Oil) and what needs a sample (Smp), open sampling work orders, lab results per month and by component, failure modes, the lab results needing action, and the reference tables (alert limits, lube chart, SANY oil data) |
| **Insights → Fleets** | Every crane batch side by side |
| **Cranes** | Search, filters, tiles or a list with the key numbers for each crane |
| **Data** | Upload, export, and a check of what was read from the file |
| **One crane** | 3D banner and tabs: Summary, PM, PR / WO, Work request, Wirerope, Inspection, Oil, Oil lab |

On a phone the navigation is a bar at the bottom. On a computer it is in the header. Light and dark mode switch from the header.

## Data

The page has no built-in data. Open **Data**, tap **Upload live update file** and choose the latest LIVE UPDATE Excel file.

- **On claude.ai (shared):** one upload is stored in the page's shared storage, and everyone who opens the page sees it straight away. Only people with edit access see the upload button.
- **Anywhere else (for example GitHub Pages):** the upload is saved only in that browser and reopens automatically next time.

### Two files

The dashboard takes two separate Excel files, each with its own upload button on **Data**:

- **Upload live update file**: the LIVE UPDATE workbook (everything except lab results).
- **Upload oil analysis file**: the *QC Oil Analysis Result* workbook. Everything in it is read: the plan sheets (Hoist, Trolley, Boom, SCR, MCR, TLS, Gantry: oil change status, sampling status, priority, next sampling, last result, action and the sampling history), the `Result <year>` sheets (one row per lab sample), the Work Order sheet and the reference tables. It feeds the **Oil lab** page, the **Oil lab** tab on each crane (plan, history and results per component) and an **Oil lab** card on Home. A component needs oil replacement when its oil change status is Due or its action says change oil; it needs sampling when its sampling status is Due or its action says resample. Uploading one file never replaces the other. "Now" means the newest result of each crane and component, if it is from the last 12 months.

Sheets read from the live update file: `FYK INS`, the monthly PM sheets (`JANUARI` … `NOVEMBER 2026`), `PR <year>`, `WORK REQUEST`, `WIREROPE <year>`, `Sheet1` (SANY wirerope update), `SOS COUPLING SERVISING` and `OIL SAMPLING CHANGE MONITOR`. The **Data** page lists how many rows were read from each.

Two things the reader corrects:

- **Work request dates.** Excel swaps day and month for typed dates where the day is 12 or less. The request number starts with year and month (`WR2604…`), so the page uses it to put them back.
- **Vendor names.** Different spellings of one vendor (`EJSB` and `EU JIN SDN BHD`) are counted together on the PR / WO page, and the page lists which names it joined.

## Changing the page

The source is in `src/`. `index.html` (the whole app in one file) is built from it with esbuild.

```
npm install        # once
npm run build      # writes index.html, and dist/artifact.html for claude.ai
npm run build:dev  # same, unminified
npm run lint
npm test           # unit tests, then browser tests (Playwright; includes an axe accessibility check)
npm run check      # lint, build and test
```

The browser tests open the built `index.html` offline with a small made-up dataset (`tests/fixtures/dataset.js`). No real port data is in this repository, and none should be added.

### Structure

```
src/
  index.html          Page shell (header, navigation, empty areas the pages draw into)
  styles/             tokens (colour, type, space, motion) -> base -> layout -> components -> hero -> pages -> motion
  js/
    main.js           Entry point
    app.js            Connects buttons, search, upload and storage to the code behind them
    router.js         Which page shows for the address (#pm, #Q45, ...)
    config.js         Names, thresholds and storage keys in one place
    lib/              Small tools with no knowledge of cranes: html template, formatting, dates, theme
    domain/           Plain functions that answer questions about the data: crane status, alerts,
                      work request priority, wirerope wear, PM months, fleet summary
    data/             Reading the Excel file, saving it in the browser, sharing it, exporting
    ui/               Reusable pieces: chips, cards, rows, tables, meters and charts
    pages/            Home, Alerts, Cranes, Data, the Insights topics, and one crane with its tabs
    scene/            The 3D quay crane (three.js, loaded only when a scene is on screen)
```

Rules the code follows:

- **Pages draw, the domain decides.** A page asks `domain/` for numbers and passes them to `ui/` pieces; thresholds and rules live in one place.
- **Text is escaped by default.** Pages build markup with the `html` template tag, which escapes every value. Use `raw()` only for markup the code itself made.
- **Colours and sizes come from `styles/tokens.css`.** Components do not hold literal colours, so light and dark stay in step.
- **Libraries load when needed.** SheetJS loads when someone uploads or exports; three.js loads after the page is idle and only when a 3D scene is on screen (skipped on data saver and slow connections).

The page needs internet for three.js (the 3D scene) and SheetJS (reading and writing Excel). Without 3D support it shows a drawn picture instead. It respects the reduced-motion setting.
