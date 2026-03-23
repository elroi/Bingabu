/**
 * Debounced POST for player daubs. flush() runs the pending debounced post immediately (or waits for
 * in-flight work) so GET /rooms/:id does not overwrite local daubs with stale participantDaubs.
 */

/**
 * @param {object} opts
 * @param {number} opts.delayMs
 * @param {() => Promise<void>} opts.requestPost
 */
export function createDaubPushScheduler({ delayMs, requestPost }) {
  let timer = null;
  let chain = Promise.resolve();

  function schedule() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      chain = chain.then(() => requestPost()).catch(() => {});
    }, delayMs);
  }

  async function flush() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
      chain = chain.then(() => requestPost()).catch(() => {});
    }
    await chain;
  }

  return { schedule, flush };
}
