/**
 * The PR sheet spells the same vendor several ways ("EJSB", "EU JIN SDN BHD", "bURBENZER",
 * "BUBENZER"). This groups names that are very likely one company so totals are not split.
 *
 * Two names are joined when, after dropping "SDN BHD" and punctuation, they
 *   - are identical, or
 *   - one is a single word that starts the other, or equals the other's initials, or
 *   - are both single words of 7+ letters that differ by one letter.
 */

const COMPANY_SUFFIX = /\b(SDN|BHD|M)\b/g;
const MIN_TYPO_LENGTH = 7;

function describeName(name) {
  const upper = name
    .toUpperCase()
    .replace(/\s*&\s*/g, '&')
    .replace(/[.,()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const core = upper.replace(COMPANY_SUFFIX, ' ').replace(/\s+/g, ' ').trim();
  const words = core.split(' ').filter(Boolean);
  return {
    words,
    key: core.replace(/&/g, 'N').replace(/ /g, ''),
    initials: words.length > 1 ? words.map((w) => w[0]).join('') : '',
    initialsWithSuffix: upper.split(' ').filter(Boolean).map((w) => w[0]).join(''),
  };
}

/** True when the two strings differ by at most one inserted, removed or changed letter. */
export function withinOneEdit(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
    } else {
      edits += 1;
      if (edits > 1) return false;
      if (a.length > b.length) i += 1;
      else if (b.length > a.length) j += 1;
      else {
        i += 1;
        j += 1;
      }
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function sameCompany(x, y) {
  if (x.key === y.key) return true;
  const [short, long] = x.key.length <= y.key.length ? [x, y] : [y, x];
  const oneWordPrefix =
    short.words.length === 1 &&
    long.words.length > 1 &&
    (long.words[0] === short.words[0] || long.initials === short.key || long.initialsWithSuffix === short.key);
  const typo =
    short.key.length >= MIN_TYPO_LENGTH && x.words.length === 1 && y.words.length === 1 && withinOneEdit(x.key, y.key);
  return oneWordPrefix || typo;
}

/**
 * @param {{name: string, amount: number}[]} entries one per job
 * @returns {{name: string, names: string[], jobs: number, amount: number}[]} biggest amount first;
 *   name is the spelling used most often
 */
export function groupVendors(entries) {
  const spellings = new Map();
  for (const { name, amount } of entries) {
    const trimmed = (name || '').trim();
    if (!trimmed) continue;
    const entry = spellings.get(trimmed) || { name: trimmed, jobs: 0, amount: 0 };
    entry.jobs += 1;
    entry.amount += amount;
    spellings.set(trimmed, entry);
  }

  const items = [...spellings.values()].map((entry) => ({ ...entry, ...describeName(entry.name) }));
  const parent = items.map((_, i) => i);
  const root = (i) => (parent[i] === i ? i : (parent[i] = root(parent[i])));
  for (let a = 0; a < items.length; a += 1) {
    for (let b = a + 1; b < items.length; b += 1) {
      if (sameCompany(items[a], items[b])) parent[root(a)] = root(b);
    }
  }

  const groups = new Map();
  items.forEach((item, i) => {
    const key = root(i);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });

  return [...groups.values()]
    .map((members) => {
      members.sort((x, y) => y.jobs - x.jobs);
      return {
        name: members[0].name,
        names: members.map((m) => m.name),
        jobs: members.reduce((sum, m) => sum + m.jobs, 0),
        amount: members.reduce((sum, m) => sum + m.amount, 0),
      };
    })
    .sort((x, y) => y.amount - x.amount);
}
