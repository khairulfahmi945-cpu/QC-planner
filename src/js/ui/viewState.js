/**
 * What the reader has chosen on the list pages: filters, view mode and how many rows are showing.
 * It lives for the visit and is shared by the pages that use it. Keys are the names used in the
 * page's data attributes (data-set="key:value", data-more="key").
 */
const INITIAL = {
  filt: 'all', // Cranes: filter
  cview: 'tiles', // Cranes: tiles or list
  cq: '', // Cranes: search text
  wqf: 'all', // Work requests: priority filter
  wqN: 30, // rows showing in each growing list
  jobN: 10,
  rpN: 20,
  exN: 8,
  dueN: 8,
  olN: 10,
  labf: 'all', // Oil lab: result filter
  labv: 'any', // Oil lab: which cranes the plan board lists
  labN: 8,
};

/** Counters that go back to their first size whenever a filter changes. */
const GROWING = ['wqN', 'jobN', 'rpN', 'exN', 'dueN', 'olN', 'labN'];

export const view = { ...INITIAL };

/** Sets a choice. Lists start again from their first rows. */
export function setViewValue(key, value) {
  view[key] = value;
  for (const counter of GROWING) view[counter] = INITIAL[counter];
}

/** "Show more": adds rows to a list. */
export function growList(key, step) {
  view[key] += step;
}

/** Whether a section of the Alerts page is open in full. */
export const isExpanded = (section) => Boolean(view[`ao-${section}`]);
