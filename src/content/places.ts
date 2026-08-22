/**
 * Where the overnight stops are.
 *
 * Approximate latitude and longitude for every place an itinerary sleeps in,
 * used to draw the schematic route map. Approximate is the right word and the
 * right ambition: this is a diagram of a walk, not a navigation aid, and the
 * map deliberately carries no scale bar, no contours and no claim to be one.
 * Nobody should navigate from it and nothing on the page invites them to.
 *
 * Kept as a table keyed by place name rather than typed onto each itinerary
 * day, because a place that appears on four treks has one location. The
 * coordinates are attached to the days in `treks.ts` by lookup, and the guard
 * fails if an overnight stop has no entry here.
 *
 * PLACEHOLDER PRECISION. These are good to roughly a kilometre — enough to
 * draw a recognisable route line, not enough to put a pin on a lodge. Replace
 * with surveyed positions if the map ever becomes something people navigate by,
 * which it should not.
 */

export type LatLon = [number, number];

export const PLACES: Record<string, LatLon> = {
  /* ------------------------------------------------------------- Khumbu */
  Kathmandu: [27.7172, 85.324],
  Phakding: [27.7407, 86.7127],
  "Namche Bazaar": [27.8056, 86.7139],
  Syangboche: [27.8156, 86.7167],
  Tengboche: [27.8361, 86.7644],
  Dingboche: [27.8917, 86.83],
  Pheriche: [27.8944, 86.8189],
  Lobuche: [27.9494, 86.81],
  "Gorak Shep": [27.9811, 86.8283],

  /* ---------------------------------------------------------- Annapurna */
  Pokhara: [28.2096, 83.9856],
  Ghandruk: [28.3756, 83.8072],
  Chhomrong: [28.4083, 83.8175],
  Bamboo: [28.4489, 83.8464],
  Dovan: [28.4622, 83.8636],
  "Machhapuchhre Base Camp": [28.5142, 83.8836],
  "Annapurna Base Camp": [28.5306, 83.8781],
  "Jhinu Danda": [28.3803, 83.8161],
  Ulleri: [28.3697, 83.7047],
  Ghorepani: [28.4028, 83.6903],
  Tadapani: [28.4053, 83.7492],
  "Forest Camp": [28.3606, 83.9128],
  "Low Camp": [28.4083, 83.9219],
  "High Camp": [28.4356, 83.9308],
  Siding: [28.3406, 83.9086],

  /* -------------------------------------------------- Annapurna Circuit */
  Besisahar: [28.2333, 84.3833],
  Chame: [28.5528, 84.2389],
  Pisang: [28.6144, 84.1458],
  Manang: [28.6667, 84.0167],
  "Yak Kharka": [28.7167, 83.9833],
  "Thorong Phedi": [28.7833, 83.95],
  Muktinath: [28.8167, 83.8722],
  Marpha: [28.7514, 83.6903],
  Tatopani: [28.4936, 83.6478],

  /* ------------------------------------------------------------ Mustang */
  Jomsom: [28.7808, 83.7231],
  Kagbeni: [28.8378, 83.7842],
  Chele: [28.9022, 83.8158],
  Chuksang: [28.8697, 83.8006],
  Ghami: [29.0333, 83.8686],
  Tsarang: [29.1167, 83.9333],
  Dhakmar: [29.0667, 83.85],
  "Lo Manthang": [29.1867, 83.9564],

  /* ----------------------------------------------------------- Langtang */
  Syabrubesi: [28.1614, 85.3389],
  "Lama Hotel": [28.1897, 85.4256],
  "Langtang village": [28.2131, 85.5158],
  "Kyanjin Gompa": [28.2131, 85.5619],

  /* -------------------------------------------------------------- Terai */
  Sauraha: [27.5786, 84.4989],
  Thakurdwara: [28.3897, 81.3167],

  /* --------------------------------------------------- Kathmandu Valley */
  Chisapani: [27.8083, 85.4],
  Nagarkot: [27.7154, 85.5206],
  Dhulikhel: [27.6222, 85.5386],
};
