/** The page's idea of "today". Tests can pin it with setNow(). */
let pinned = null;

export const setNow = (date) => {
  pinned = date ? new Date(date) : null;
};

export const now = () => (pinned ? new Date(pinned) : new Date());

export const startOfToday = () => {
  const d = now();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};
