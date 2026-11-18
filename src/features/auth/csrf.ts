/**
 * The API's CSRF rule (apps/api Data365.Auth GateRules.CsrfHeader): every state-changing request to our API carries
 * `X-Requested-With: d365`. A plain cross-site form cannot set a custom header, so another site cannot act for the
 * person through their session cookie. No imports here: features/projects/api.ts and the other clients set it on every
 * request themselves (fetch and the XHR uploads); installApiFetch (http.ts) adds it to anything that forgot.
 */
export const CSRF_HEADER = 'X-Requested-With'
export const CSRF_VALUE = 'd365'
