/**
 * API configuration.
 *
 * The ERP backend dispatches by endpoint + `action` param:
 *   - api/store.php?action=<action>      (AJAX business actions)
 *   - api/graph-data.php?action=<action> (chart JSON)
 *   - api/restfull.php?action=<resource> (REST-style)
 * Responses follow the shape: { status, message, ...payload }.
 *
 * AUTH is wired to the real backend (login_form_submit + send_otp), using the
 * PHP session cookie that the server sets on a successful login. The native
 * fetch cookie store persists it across subsequent requests.
 *
 * Phase 2 (done): dashboard + IP-cam data are served by live JSON endpoints
 * (`employee/dashboard`, `ipcam/list`) through the mobile dispatcher. Flip
 * USE_DUMMY back to `true` only to demo the UI offline with local mock data.
 */

export const USE_DUMMY = false; // live endpoints; set true to demo on mock data

// Base URL (no trailing slash — ENDPOINTS append the path).
// Dev: local ServBay ERP (where probation banner API lives during development).
// Prod release builds keep erp.nysonik.com.
export const API_BASE_URL = __DEV__
  ? 'https://nysonianerp.dev'
  : 'https://erp.nysonik.com';

export const ENDPOINTS = {
  // Unified mobile dispatcher (correct CORS + OPTIONS handling).
  mobile: `${API_BASE_URL}/api/mobile.php`,
  store: `${API_BASE_URL}/api/store.php`,
  graph: `${API_BASE_URL}/api/graph-data.php`,
  rest: `${API_BASE_URL}/api/restfull.php`,
};

/** Simulated latency for the remaining dummy data calls. */
export const MOCK_LATENCY_MS = 650;
