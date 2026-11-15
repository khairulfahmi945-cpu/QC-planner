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
| **Insights → Fleets** | Every crane batch side by side |
| **Cranes** | Search, filters, tiles or a list with the key numbers for each crane |
| **Data** | Upload, export, and a check of what was read from the file |
| **One crane** | 3D banner and tabs: Summary, PM, PR / WO, Work request, Wirerope, Inspection, Oil |

On a phone the navigation is a bar at the bottom. On a computer it is in the header. Light and dark mode switch from the header.

## Data

The page has no built-in data. Open **Data**, tap **Upload live update file** and choose the latest LIVE UPDATE Excel file.

- **On claude.ai (shared):** one upload is stored in the page's shared storage, and everyone who opens the page sees it straight away. Only people with edit access see the upload button.
- **Anywhere else (for example GitHub Pages):** the upload is saved only in that browser and reopens automatically next time.

Sheets read from the file: `FYK INS`, the monthly PM sheets (`JANUARI` … `NOVEMBER 2026`), `PR <year>`, `WORK REQUEST`, `WIREROPE <year>`, `Sheet1` (SANY wirerope update), `SOS COUPLING SERVISING` and `OIL SAMPLING CHANGE MONITOR`. The **Data** page lists how many rows were read from each.

Two things the reader corrects:

- **Work request dates.** Excel swaps day and month for typed dates where the day is 12 or less. The request number starts with year and month (`WR2604…`), so the page uses it to put them back.
- **Vendor names.** Different spellings of one vendor (`EJSB` and `EU JIN SDN BHD`) are counted together on the PR / WO page, and the page lists which names it joined.

## Changing the page

The source is in `src/`. `index.html` is built from it.

```
python3 build.py              # writes index.html
python3 build.py --artifact   # also writes build/artifact.html for claude.ai
```

| File | Contents |
| --- | --- |
| `src/a1_core.js` | Storage, helpers and the fleet-wide calculations every page shares |
| `src/a2_crane.js` | The page for one crane |
| `src/a3_pages.js` | Home, Alerts, the Insights topics, Cranes and Data |
| `src/a4_io.js` | Reading the Excel file, export, upload and shared storage |
| `src/a5_app.js` | Navigation between pages, events, light / dark mode |
| `src/crane3d.js` | The 3D quay crane scene (three.js) |
| `src/base.css`, `src/app.css` | Styles |
| `src/head.html`, `src/body.html` | Page shell |

The page needs internet for three.js (the 3D scene) and SheetJS (reading and writing Excel). Without 3D support it shows a drawn picture instead. It respects the reduced-motion setting.
