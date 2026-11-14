// Diagnostics for developers only: nothing is printed in a release build, so no error text (which may carry a URL or a token
// fragment) reaches the device log of a user.
declare const __DEV__: boolean;

export function logWarn(...args: unknown[]): void {
  if (typeof __DEV__ !== "undefined" && __DEV__) console.warn(...args);
}

export function logError(...args: unknown[]): void {
  if (typeof __DEV__ !== "undefined" && __DEV__) console.error(...args);
}
