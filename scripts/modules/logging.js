// Log events flag
let logEvents = false;

//Log all flag
let logAll = false;

// Logging/debugging functions
function enableLog(ev) {
  logEvents = !logEvents;
}

/**
 * Standard logger for pointer events.
 * @param {String} prefix Can be used to track the type of event or the calling
 * function.
 * @param {PointerEvent} ev the event that caused this to be triggered.
 * @returns
 */
function logPointerEvents(prefix, ev) {
  if (!logEvents) return;
  const s =
    `${prefix}:<br>` +
    `  pointerID   = ${ev.pointerId}\n` +
    `  pointerType = ${ev.pointerType}\n` +
    `  isPrimary   = ${ev.isPrimary}`;
  console.log(`${s}`);
}

/**
 * Logs all events that happen.
 * Useful for discovering what events happen when doing certain actions.
 */
function logAllEvents() {
  if (!logAll) return;
  //CB: Some fun code to track **all** events happening in the window.
  //Useful for seeing exactly what type of event you want to track!
  Object.keys(window).forEach((key) => {
    if (/^on/.test(key)) {
      window.addEventListener(key.slice(2), (e) => {
        log(key.slice(2), e);
      });
    }
  });
}

export { logPointerEvents, logAllEvents };
