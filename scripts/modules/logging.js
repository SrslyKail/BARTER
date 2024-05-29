//are any of these being used anywhere??
// Log events flag
let logPointerEventsEnabled = false;

//Log all flag
let logAllEventsEnabled = false;

//
let logging = false;

/**
 * Standard logger for pointer events.
 * @param {String} prefix Can be used to track the type of event or the calling
 * function.
 * @param {PointerEvent} ev the event that caused this to be triggered.
 * @returns
 */
function logPointerEvents(prefix, ev) {
  if (logPointerEventsEnabled || logAllEventsEnabled) {
    const s =
      `${prefix}:<br>` +
      `  pointerID   = ${ev.pointerId}\n` +
      `  pointerType = ${ev.pointerType}\n` +
      `  isPrimary   = ${ev.isPrimary}`;
    console.log(`${s}`);
  }
}

/**
 * Some fun code to track **all** events happening in the window.
 * Useful for seeing exactly what type of event you want to track!
 */
function logAllEvents() {
  if (logAllEventsEnabled) {
    //CB:
    Object.keys(window).forEach((key) => {
      if (/^on/.test(key)) {
        window.addEventListener(key.slice(2), (e) => {
          log(key.slice(2), e);
        });
      }
    });
  }
}

/**
 * A boolean-controlled version of console.log; if logging is enabled within
 * the logging module, it will log the messages, otherwise it turns off.
 * Useful mostly for messages you want while debugging, but not in regular use.
 * @param {String} message
 */
function log(message) {
  if (logging) {
    console.log(message);
  }
}

module.exports = { logPointerEvents, logAllEvents, log };
