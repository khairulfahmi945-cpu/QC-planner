/** Finding cranes by the number the reader types ("45", "045" and "q45" all find Q45). */

/** Only the digits, without leading zeros. Empty when there are none. */
export const digitsOf = (query) => String(query).replace(/[^0-9]/g, '').replace(/^0+/, '');

export const numberOf = (id) => String(+id.slice(1));

/** Cranes whose number contains the typed digits, those that start with them first. */
export function findCranes(ids, query, limit) {
  const digits = digitsOf(query);
  if (!digits) return [];
  return ids
    .filter((id) => numberOf(id).includes(digits))
    .sort((a, b) =>
      Number(numberOf(b).startsWith(digits)) - Number(numberOf(a).startsWith(digits)) || +a.slice(1) - +b.slice(1))
    .slice(0, limit);
}
