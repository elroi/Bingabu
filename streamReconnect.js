/** Exponential backoff for EventSource reconnect (player / spectator). */
export const SSE_RECONNECT_INITIAL_MS = 1000;
export const SSE_RECONNECT_CAP_MS = 30000;

export function nextReconnectDelayMs(previousMs) {
  if (previousMs <= 0) return SSE_RECONNECT_INITIAL_MS;
  return Math.min(previousMs * 2, SSE_RECONNECT_CAP_MS);
}
