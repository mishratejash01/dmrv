/**
 * Product brand — single source of truth.
 *
 * This application is owned by our client, **Acres Climate Tech**. It is NOT
 * named "Rainbow" and is NOT affiliated with, made by, or endorsed by Rainbow.
 * Rainbow is a separate external carbon-registry / standard that this platform
 * is built to *comply with*. Anywhere "Rainbow" still appears in the app it
 * refers only to that external Standard (the methodology), the credit
 * instrument it defines (Rainbow Carbon Credits / RCCs), or its shared buffer
 * pool — never to this product.
 *
 * Change these values to re-brand the whole app.
 */
export const BRAND = {
  /** Full company / owner name. */
  company: "Acres Climate Tech",
  /** Compact product label used in the UI. */
  product: "Acres dMRV",
  /** One-line positioning shown under the logo / on the login screen. */
  tagline: "Built for the Rainbow Standard methodology",
  /** Short domain descriptor (kept small under the logo). */
  domainLabel: "Open-kiln biochar",
  /** The external standard this platform complies with (NOT our brand). */
  standard: "Rainbow Standard",
  /** Demo sign-in password (kept in sync with the seed script). */
  demoPassword: "AcresDemo!26",
} as const;
