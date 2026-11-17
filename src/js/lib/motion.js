/** Motion helpers that respect the reader's reduced-motion setting. */
const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');

export const prefersReducedMotion = () => Boolean(query?.matches);

/**
 * Cross-fades between two states where the browser supports it. A transition that the next tap
 * cuts short is not an error.
 */
export function crossfade(update) {
  if (!document.startViewTransition || prefersReducedMotion()) return update();
  try {
    const transition = document.startViewTransition(update);
    for (const part of ['ready', 'finished', 'updateCallbackDone']) transition?.[part]?.catch(() => {});
  } catch {
    update();
  }
  return undefined;
}

/** Counts a number up from zero (instantly when motion is reduced). */
export function countUp(element, target, duration = 900) {
  if (prefersReducedMotion()) {
    element.textContent = target;
    return;
  }
  const start = performance.now();
  const frame = (time) => {
    const progress = Math.min(1, (time - start) / duration);
    element.textContent = Math.round(target * (1 - (1 - progress) ** 3));
    if (progress < 1) requestAnimationFrame(frame);
  };
  frame(start);
}
