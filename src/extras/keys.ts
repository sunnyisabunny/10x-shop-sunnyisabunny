/**
 * NOTE: the shared rules for extras that listen to the keyboard.
 * Why it exists: a key listener on the whole page must never get in anyone's way, and that rule belongs in one place.
 * Connects to: `MachinePanel` (the keypad) and `Overload` (the easter egg).
 */

/** True when a key press belongs to something else: typing in a field, or a shortcut such as Ctrl+R. */
export function isForSomethingElse(event: KeyboardEvent): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) {
    return true;
  }
  const target = event.target;
  return target instanceof HTMLElement && (target.isContentEditable || target.matches("input, select, textarea"));
}

/**
 * The key as printed on a standard keyboard, or null for keys such as Shift. It reads `code`, the physical key, and not
 * `key`, the character it produces. With a Georgian layout switched on, the A key produces "ა", and this still says "A".
 */
export function printedKey(event: KeyboardEvent): string | null {
  const match = /^(?:Key|Digit|Numpad)([A-Z0-9])$/.exec(event.code);
  return match === null ? null : match[1];
}
