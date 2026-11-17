/** Loads a script once and remembers the result. A failed load can be tried again. */
const loads = new Map();

export function loadScript(src) {
  if (loads.has(src)) return loads.get(src);
  const promise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loads.delete(src);
      script.remove();
      reject(new Error(`Could not load ${src}`));
    };
    document.head.append(script);
  });
  loads.set(src, promise);
  return promise;
}
