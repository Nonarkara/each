/**
 * A MEASUREMENT OF A PAGE THAT HAS NOT RENDERED IS NOT A MEASUREMENT.
 *
 * The MSH instrument reads a page once the document has parsed and the DOM
 * has been still for a beat. An application that paints after that — a
 * single-page app whose JavaScript arrives after the document says
 * "interactive" — is measured EMPTY: no chrome, no text, no heading. The
 * receipt then records a page that no reader will ever see, and the check
 * the next day compares a rendered page against that empty one and calls the
 * difference a defect.
 *
 * That happened here: the gate came back with routes measured at ZERO chrome
 * on pages that carry a 65px or 111px header, and the receipt and its check
 * disagreed on six of two hundred and ten measurements. Half of them read
 * 111px in one run and 0px in the next.
 *
 * So a measurement carries its own honesty check, and this is it: a page
 * that was measured before it rendered is VOID, and a void measurement is
 * not a receipt of anything. It is re-measured.
 *
 * The signal is the page's own content. The probe records the characters it
 * found in the page's main element; a page that has not rendered has none.
 * A page that has rendered always has some — every route in this product
 * is a page of words, and a page of words that measures as no words at all
 * is a page that was not there yet.
 */

/**
 * Is this measurement of a page that had not rendered?
 *
 * @param {any} m one measurement from the instrument's --json output
 * @returns {boolean}
 */
export function isVoid(m) {
  if (!m || typeof m !== "object") return true;
  // A measurement the instrument itself could not take is not void: it is an
  // error, and the instrument reports errors as failures.
  if (m.error) return false;

  const chars = Number(m.chars);
  // No text at all: the page was empty when it was read.
  if (!Number.isFinite(chars) || chars === 0) return true;

  // Text, but no heading and no furniture: a page that was caught between
  // the first text and the first frame of the app. This is the shape of a
  // half-drawn page, and it is worth refusing too.
  const h1 = m.hierarchy ? Number(m.hierarchy.h1Count) : null;
  const chromeTop = m.chrome ? Number(m.chrome.top) : null;
  if (h1 === 0 && chromeTop === 0) return true;

  return false;
}

/**
 * The void measurements of a sweep.
 *
 * @param {any[]} measurements
 * @returns {Array<{route: string, w: number, chars: number}>}
 */
export function voidsOf(measurements) {
  if (!Array.isArray(measurements)) return [];
  return measurements
    .filter(isVoid)
    .map((m) => ({ route: m.route, w: m.w, chars: Number(m.chars) || 0 }));
}
