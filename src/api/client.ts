/**
 * API client.
 *
 * Auth talks to the real ERP dispatcher (api/store.php). The server sets a PHP
 * session cookie on a successful login; React Native's native networking keeps
 * a shared cookie jar, so subsequent requests (send_otp/verify) reuse it. We
 * also pass `credentials: 'include'` for good measure.
 *
 * Dashboard / IP-cam reads remain on dummy data until their endpoints exist.
 */
import {
  ApiResponse,
  BioMachinesData,
  DashboardData,
  DocumentsData,
  EmployeeProfileData,
  HrEmployeeDetail,
  HrEmployeeSearchResult,
  HrEmployeeTabKey,
  HrWorkDetail,
  IpCamData,
  IpCamStream,
  IpCamStreamData,
  ItAsset,
  LeaveRequestDetail,
  LeaveType,
  NotificationsData,
  OrganogramData,
  PayslipsData,
  RosterData,
  RosterDay,
  RosterDayStatus,
  SupportData,
  TimeDocLogsData,
  LeaveApprovalDetail,
  LeaveApprovalItem,
  LeaveApproverStat,
  OfferLetterApprovalDetail,
  OfferLetterApprovalItem,
  OfferLetterCcEmployee,
  LifecycleApprovalDetail,
  LifecycleApprovalItem,
  ProbationDueItem,
  ProbationApproverOption,
  ProbationReviewDetail,
  ProbationReviewItem,
} from '@/types';
import { dashboardData } from '@/data/dummy';
import { ipCamData } from '@/data/ipcam';
import { organogramData } from '@/data/organogram';
import { ENDPOINTS, MOCK_LATENCY_MS, USE_DUMMY } from './config';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Abort hung requests so the UI never spins forever on a stalled network call. */
const REQUEST_TIMEOUT_MS = 25000;
let activeSessionToken: string | null = null;
let onUnauthorized: (() => void) | null = null;
let unauthorizedNotifying = false;

function normalizeRosterStatus(value: unknown): RosterDayStatus {
  const s = String(value ?? '').toLowerCase();
  if (s === 'off' || s === 'wfh') return s;
  return 'working';
}

function normalizeRosterDay(raw: any, fallbackDate = ''): RosterDay {
  const status = normalizeRosterStatus(raw?.status);
  const statusLabel =
    status === 'off' ? 'Weekly Off' : status === 'wfh' ? 'Work From Home' : 'Working';
  return {
    date: String(raw?.date ?? fallbackDate),
    label: String(raw?.label ?? raw?.date ?? fallbackDate),
    weekday: Number(raw?.weekday ?? 0),
    weekdayLabel: String(raw?.weekdayLabel ?? ''),
    status,
    statusLabel: String(raw?.statusLabel ?? statusLabel),
    inMonth: raw?.inMonth == null ? undefined : Boolean(raw.inMonth),
  };
}

function defaultRosterDay(offsetDays: number): RosterDay {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  const iso = d.toISOString().slice(0, 10);
  return {
    date: iso,
    label: d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }),
    weekday: ((d.getDay() + 6) % 7) + 1,
    weekdayLabel: d.toLocaleDateString(undefined, { weekday: 'long' }),
    status: 'working',
    statusLabel: 'Working',
  };
}

function normalizeRosterData(raw: any): RosterData | null {
  if (!raw || typeof raw !== 'object') return null;
  const src = raw.days ? raw : raw.data && typeof raw.data === 'object' ? raw.data : null;
  if (!src || typeof src !== 'object') return null;

  const year = Number(src.year ?? new Date().getFullYear());
  const month = Number(src.month ?? new Date().getMonth() + 1);
  const days = Array.isArray(src.days)
    ? src.days.map((day: any) => normalizeRosterDay(day))
    : [];

  return {
    year,
    month,
    monthLabel: String(src.monthLabel ?? ''),
    startDate: String(src.startDate ?? ''),
    endDate: String(src.endDate ?? ''),
    today: normalizeRosterDay(src.today, defaultRosterDay(0).date),
    tomorrow: normalizeRosterDay(src.tomorrow, defaultRosterDay(1).date),
    days,
  };
}

/** Set by AuthContext after login/restore; included on every API request. */
export function setApiSessionToken(token: string | null) {
  activeSessionToken = token;
}

/**
 * Called once when any protected API returns 401 / "Authentication required"
 * (e.g. admin deleted the mobile session). AuthContext clears local storage.
 */
export function setOnUnauthorized(handler: (() => void) | null) {
  onUnauthorized = handler;
}

function notifyUnauthorized() {
  if (!onUnauthorized || unauthorizedNotifying) return;
  unauthorizedNotifying = true;
  try {
    onUnauthorized();
  } finally {
    // Allow a later revocation after the user logs in again.
    setTimeout(() => {
      unauthorizedNotifying = false;
    }, 500);
  }
}

function isUnauthorizedPayload(json: any, httpStatus: number): boolean {
  if (httpStatus === 401) return true;
  const message = String(json?.message ?? '');
  return json?.status === 'error' && /authentication required/i.test(message);
}

/** Pull the first JSON object out of a body that may include PHP notices/HTML. */
function parseJsonBody(text: string): any {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Empty server response.');
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error('Unexpected server response.');
  }
}

/** Raw POST to api/mobile.php?action=<action>; returns parsed JSON (any shape). */
async function postStore(
  action: string,
  fields: Record<string, string> = {},
): Promise<any> {
  const body = new URLSearchParams();
  Object.entries(fields).forEach(([k, v]) => body.append(k, v));

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller
    ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    : null;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    };
    if (activeSessionToken) {
      headers.Authorization = `Bearer ${activeSessionToken}`;
    }

    const res = await fetch(`${ENDPOINTS.mobile}?action=${encodeURIComponent(action)}`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: body.toString(),
      signal: controller?.signal,
    });

    const text = await res.text();
    const json = parseJsonBody(text);

    // Skip auth/logout itself — it may 401 after remote revoke and still succeed locally.
    if (action !== 'auth/logout' && activeSessionToken && isUnauthorizedPayload(json, res.status)) {
      notifyUnauthorized();
    }

    return json;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Ensure dashboard payload always has the arrays/objects the screens expect. */
function normalizeDashboard(raw: any): DashboardData | null {
  if (!raw || typeof raw !== 'object') return null;
  // Some older/proxied responses may flatten fields next to status/message.
  const src = raw.employee ? raw : raw.data && typeof raw.data === 'object' ? raw.data : null;
  if (!src || typeof src !== 'object') return null;

  const employee = src.employee ?? {};
  const leaves = src.leaves ?? {};

  return {
    employee: {
      id: Number(employee.id ?? 0),
      name: String(employee.name ?? 'Employee'),
      role: String(employee.role ?? ''),
      department: String(employee.department ?? ''),
      manager: String(employee.manager ?? ''),
      workModality: String(employee.workModality ?? ''),
      companyName: String(employee.companyName ?? ''),
      status: String(employee.status ?? ''),
      joinDate: String(employee.joinDate ?? ''),
      biometricId: String(employee.biometricId ?? ''),
      tenure: String(employee.tenure ?? ''),
      profilePhoto: employee.profilePhoto ?? null,
      leaveUnitLabel: employee.leaveUnitLabel === 'Hours' ? 'Hours' : 'Days',
    },
    leaves: {
      accruedToToday: Number(leaves.accruedToToday ?? 0),
      proratedLeaves: Number(leaves.proratedLeaves ?? 0),
      consumedLeaves: Number(leaves.consumedLeaves ?? 0),
      availableLeaves: Number(leaves.availableLeaves ?? 0),
      carryoverHours: Number(leaves.carryoverHours ?? 0),
      approvedCount: Number(leaves.approvedCount ?? 0),
      rejectedCount: Number(leaves.rejectedCount ?? 0),
      pendingCount: Number(leaves.pendingCount ?? 0),
      accrualThroughLabel: String(leaves.accrualThroughLabel ?? ''),
    },
    attendance: Array.isArray(src.attendance) ? src.attendance : [],
    lateComings: Number(src.lateComings ?? 0),
    leaveRequests: Array.isArray(src.leaveRequests) ? src.leaveRequests : [],
    pendingPolicies: Array.isArray(src.pendingPolicies) ? src.pendingPolicies : [],
    missingFields: Array.isArray(src.missingFields) ? src.missingFields : [],
    logs: Array.isArray(src.logs) ? src.logs : [],
    roster: {
      today: normalizeRosterDay(src.roster?.today, defaultRosterDay(0).date),
      tomorrow: normalizeRosterDay(src.roster?.tomorrow, defaultRosterDay(1).date),
    },
    pendingOfferLetterCount: Number(src.pendingOfferLetterCount ?? src.pending_offer_letter_count ?? 0),
    pendingLeaveApprovalCount: Number(
      src.pendingLeaveApprovalCount ?? src.pending_leave_approval_count ?? 0,
    ),
    pendingLifecycleApprovalCount: Number(
      src.pendingLifecycleApprovalCount ?? src.pending_lifecycle_approval_count ?? 0,
    ),
    pendingProbationApprovalCount: Number(
      src.pendingProbationApprovalCount ?? src.pending_probation_approval_count ?? 0,
    ),
    pendingProbationDueCount: Number(
      src.pendingProbationDueCount ?? src.pending_probation_due_count ?? 0,
    ),
    pendingProbationApplyCount: Number(
      src.pendingProbationApplyCount ?? src.pending_probation_apply_count ?? 0,
    ),
    permissions: {
      liveCameras: Boolean(
        src.permissions?.liveCameras === true
          || src.permissions?.liveCameras === 1
          || src.permissions?.liveCameras === '1'
          || src.permissions?.liveCameras === 'true',
      ),
      employeesList: Boolean(
        src.permissions?.employeesList === true
          || src.permissions?.employeesList === 1
          || src.permissions?.employeesList === '1'
          || src.permissions?.employeesList === 'true',
      ),
      leaveApprovals: Boolean(
        src.permissions?.leaveApprovals === true
          || src.permissions?.leaveApprovals === 1
          || src.permissions?.leaveApprovals === '1'
          || src.permissions?.leaveApprovals === 'true',
      ),
      offerLetterApprovals: Boolean(
        src.permissions?.offerLetterApprovals === true
          || src.permissions?.offerLetterApprovals === 1
          || src.permissions?.offerLetterApprovals === '1'
          || src.permissions?.offerLetterApprovals === 'true',
      ),
      lifecycleApprovals: Boolean(
        src.permissions?.lifecycleApprovals === true
          || src.permissions?.lifecycleApprovals === 1
          || src.permissions?.lifecycleApprovals === '1'
          || src.permissions?.lifecycleApprovals === 'true',
      ),
      probationApprovals: Boolean(
        src.permissions?.probationApprovals === true
          || src.permissions?.probationApprovals === 1
          || src.permissions?.probationApprovals === '1'
          || src.permissions?.probationApprovals === 'true',
      ),
      probationApprovalsHr: Boolean(
        src.permissions?.probationApprovalsHr === true
          || src.permissions?.probationApprovalsHr === 1
          || src.permissions?.probationApprovalsHr === '1'
          || src.permissions?.probationApprovalsHr === 'true',
      ),
      itDashboard: Boolean(
        src.permissions?.itDashboard === true
          || src.permissions?.itDashboard === 1
          || src.permissions?.itDashboard === '1'
          || src.permissions?.itDashboard === 'true',
      ),
    },
  };
}

function accessLevelAllowsLiveCameras(accessLevel: unknown): boolean {
  if (!Array.isArray(accessLevel)) return false;
  return accessLevel.some((perm) => /^(?:it_)?ip_cam_\d+_ch_\d+$/.test(String(perm)));
}

export type LoginResult = { redirect?: string };
export type OtpSendResult = { channel?: 'slack' | 'email' };
export type OtpVerifyResult = {
  user_id?: number | null;
  token?: string;
  user?: { id: number; email: string; name: string };
};

export const api = {
  /** Step 1 — POST api/mobile.php?action=auth/login (email + password). */
  async login(email: string, password: string): Promise<ApiResponse<LoginResult>> {
    const json = await postStore('auth/login', { email: email.trim(), password });
    return {
      status: json?.status === 'success' ? 'success' : 'error',
      message: json?.message ?? 'Login failed.',
      data: json?.status === 'success' ? { redirect: json.redirect } : null,
    };
  },

  /** Step 2a — POST auth/otp/send. Delivers a 6-digit code. */
  async sendOtp(email: string): Promise<ApiResponse<OtpSendResult>> {
    const json = await postStore('auth/otp/send', { email: email.trim() });
    return {
      status: json?.status === 'success' ? 'success' : 'error',
      message: json?.message ?? 'Could not send OTP.',
      data: json?.status === 'success' ? { channel: json.channel } : null,
    };
  },

  /** Step 2b — POST auth/otp/verify with the entered code. */
  async verifyOtp(email: string, otp: string): Promise<ApiResponse<OtpVerifyResult>> {
    const json = await postStore('auth/otp/verify', { email: email.trim(), otp: otp.trim() });
    if (json?.status === 'success' && json?.token) {
      setApiSessionToken(String(json.token));
    }
    return {
      status: json?.status === 'success' ? 'success' : 'error',
      message: json?.message ?? 'Invalid or expired OTP.',
      data: json?.status === 'success'
        ? {
            user_id: json.user_id ?? null,
            token: json.token,
            user: json.user,
          }
        : null,
    };
  },

  /** Best-effort logout (clears local state; server session expires on its own). */
  async logout(): Promise<ApiResponse<null>> {
    try {
      await postStore('auth/logout');
    } catch {
      /* ignore — local sign-out still proceeds */
    }
    return { status: 'success', message: 'Signed out.', data: null };
  },

  /**
   * Confirm the bearer token is still in auth_sessions.
   * Returns false on 401 / auth error; true on success.
   * Network failures return null so the UI does not force-logout offline.
   */
  async checkSession(): Promise<boolean | null> {
    if (!activeSessionToken) return false;
    try {
      const json = await postStore('whoami');
      return json?.status === 'success' ? true : false;
    } catch {
      return null;
    }
  },

  /**
   * Lightweight keep-alive. Server updates auth_sessions.last_activity on the
   * bearer hydrate for this request. Also detects remote logout (401).
   */
  async touchSession(): Promise<boolean | null> {
    if (!activeSessionToken) return false;
    try {
      const json = await postStore('auth/heartbeat');
      return json?.status === 'success' ? true : false;
    } catch {
      return null;
    }
  },

  /* --------------------- still dummy (data screens) --------------------- */

  async getDashboard(): Promise<ApiResponse<DashboardData>> {
    if (USE_DUMMY) {
      await wait(MOCK_LATENCY_MS);
      return { status: 'success', message: 'OK', data: dashboardData };
    }
    const json = await postStore('employee/dashboard');
    const data = normalizeDashboard(json);
    const ok = json?.status === 'success' && !!data;

    // Fallback: if dashboard payload omits permissions (older deploy), ask whoami.
    if (ok && data && (!data.permissions.liveCameras || !data.permissions.employeesList || !data.permissions.leaveApprovals || !data.permissions.offerLetterApprovals || !data.permissions.lifecycleApprovals || !data.permissions.probationApprovals || !data.permissions.probationApprovalsHr || !data.permissions.itDashboard)) {
      try {
        const me = await postStore('whoami');
        if (me?.status === 'success' && me?.data) {
          const fromFlag = me.data.permissions?.liveCameras === true
            || me.data.permissions?.liveCameras === 1
            || me.data.permissions?.liveCameras === '1'
            || me.data.permissions?.liveCameras === 'true';
          if (fromFlag || accessLevelAllowsLiveCameras(me.data.access_level)) {
            data.permissions.liveCameras = true;
          }
          const listFlag = me.data.permissions?.employeesList === true
            || me.data.permissions?.employeesList === 1
            || me.data.permissions?.employeesList === '1'
            || me.data.permissions?.employeesList === 'true';
          const access = Array.isArray(me.data.access_level) ? me.data.access_level : [];
          if (listFlag || access.includes('employees_list')) {
            data.permissions.employeesList = true;
          }
          const leaveFlag = me.data.permissions?.leaveApprovals === true
            || me.data.permissions?.leaveApprovals === 1
            || me.data.permissions?.leaveApprovals === '1'
            || me.data.permissions?.leaveApprovals === 'true';
          if (leaveFlag) {
            data.permissions.leaveApprovals = true;
          }
          const offerFlag = me.data.permissions?.offerLetterApprovals === true
            || me.data.permissions?.offerLetterApprovals === 1
            || me.data.permissions?.offerLetterApprovals === '1'
            || me.data.permissions?.offerLetterApprovals === 'true';
          if (offerFlag) {
            data.permissions.offerLetterApprovals = true;
          }
          const lifecycleFlag = me.data.permissions?.lifecycleApprovals === true
            || me.data.permissions?.lifecycleApprovals === 1
            || me.data.permissions?.lifecycleApprovals === '1'
            || me.data.permissions?.lifecycleApprovals === 'true';
          if (lifecycleFlag) {
            data.permissions.lifecycleApprovals = true;
          }
          const probationFlag = me.data.permissions?.probationApprovals === true
            || me.data.permissions?.probationApprovals === 1
            || me.data.permissions?.probationApprovals === '1'
            || me.data.permissions?.probationApprovals === 'true';
          if (probationFlag) {
            data.permissions.probationApprovals = true;
          }
          const probationHrFlag = me.data.permissions?.probationApprovalsHr === true
            || me.data.permissions?.probationApprovalsHr === 1
            || me.data.permissions?.probationApprovalsHr === '1'
            || me.data.permissions?.probationApprovalsHr === 'true';
          if (probationHrFlag) {
            data.permissions.probationApprovalsHr = true;
          }
          const itFlag = me.data.permissions?.itDashboard === true
            || me.data.permissions?.itDashboard === 1
            || me.data.permissions?.itDashboard === '1'
            || me.data.permissions?.itDashboard === 'true';
          if (itFlag || access.includes('it_dashboard')) {
            data.permissions.itDashboard = true;
          }
        }
      } catch {
        /* ignore — keep dashboard payload as-is */
      }
    }

    return {
      status: ok ? 'success' : 'error',
      message: json?.message ?? (ok ? 'OK' : 'Could not load dashboard.'),
      data: ok ? data : null,
    };
  },

  async getIpCams(): Promise<ApiResponse<IpCamData>> {
    if (USE_DUMMY) {
      await wait(MOCK_LATENCY_MS);
      return { status: 'success', message: 'OK', data: ipCamData };
    }
    // The API returns only cameras/channels granted by it_ip_cam_{cam}_ch_{channel}.
    const json = await postStore('ipcam/list');
    return { status: json?.status ?? 'error', message: json?.message ?? '', data: json?.data ?? null };
  },

  /** Biometric machines status — api/mobile.php?action=it/bio-machines (requires it_dashboard). */
  async getBioMachines(): Promise<ApiResponse<BioMachinesData>> {
    const json = await postStore('it/bio-machines');
    const payload = json?.data ?? null;
    const machines = Array.isArray(payload?.machines) ? payload.machines : [];
    const summary = payload?.summary ?? {};
    return {
      status: json?.status === 'success' ? 'success' : 'error',
      message: json?.message ?? '',
      data: json?.status === 'success'
        ? {
            summary: {
              total: Number(summary.total ?? machines.length),
              online: Number(summary.online ?? 0),
              offline: Number(summary.offline ?? 0),
            },
            machines: machines.map((m: any) => ({
              deviceId: String(m.deviceId ?? m.device_id ?? ''),
              deviceName: String(m.deviceName ?? m.device_name ?? 'Unnamed device'),
              office: m.office != null && String(m.office).trim() !== '' ? String(m.office) : null,
              ip: m.ip != null && String(m.ip).trim() !== '' ? String(m.ip) : null,
              port: m.port != null && Number(m.port) > 0 ? Number(m.port) : null,
              online: Boolean(m.online),
              status: m.status === 'online' || m.online ? 'online' as const : 'offline' as const,
              lastRecordTime: m.lastRecordTime != null ? String(m.lastRecordTime) : null,
              lastRecordRelative: String(m.lastRecordRelative ?? m.last_record_relative ?? 'Never synced'),
              fetchTone: (['fresh', 'ok', 'stale', 'none'].includes(String(m.fetchTone))
                ? String(m.fetchTone)
                : 'none') as BioMachinesData['machines'][number]['fetchTone'],
            })),
          }
        : null,
    };
  },

  /** Resolve HLS/WebRTC URLs for one channel — api/mobile.php?action=ipcam/stream. */
  async getStream(
    camNum: number,
    ch: number,
    quality: IpCamStream = 'sub',
  ): Promise<ApiResponse<IpCamStreamData>> {
    const json = await postStore('ipcam/stream', {
      camNum: String(camNum),
      ch: String(ch),
      quality,
    });
    return { status: json?.status ?? 'error', message: json?.message ?? '', data: json?.data ?? null };
  },

  /** IT assets currently assigned to the employee — api/mobile.php?action=employee/assets. */
  async getAssets(): Promise<ApiResponse<{ assets: ItAsset[] }>> {
    const json = await postStore('employee/assets');
    return { status: json?.status ?? 'error', message: json?.message ?? '', data: json?.data ?? null };
  },

  /** Full read-only personal / employment profile — api/mobile.php?action=employee/profile. */
  async getProfile(): Promise<ApiResponse<EmployeeProfileData>> {
    const json = await postStore('employee/profile');
    return { status: json?.status ?? 'error', message: json?.message ?? '', data: json?.data ?? null };
  },

  /** Profile photo for the signed-in employee — api/mobile.php?action=employee/photo. */
  async getProfilePhoto(): Promise<ApiResponse<{ mime: string; base64: string }>> {
    const json = await postStore('employee/photo');
    return { status: json?.status ?? 'error', message: json?.message ?? '', data: json?.data ?? null };
  },

  /** Active reporting tree — api/mobile.php?action=employee/organogram (organogram3 source). */
  async getOrganogram(): Promise<ApiResponse<OrganogramData>> {
    if (USE_DUMMY) {
      await wait(MOCK_LATENCY_MS);
      return { status: 'success', message: 'OK', data: organogramData };
    }
    const json = await postStore('employee/organogram');
    return { status: json?.status ?? 'error', message: json?.message ?? '', data: json?.data ?? null };
  },

  /** Time Doctor logs for the signed-in employee — api/mobile.php?action=employee/time-doc-logs. */
  async getTimeDocLogs(limit = 30): Promise<ApiResponse<TimeDocLogsData>> {
    const json = await postStore('employee/time-doc-logs', { limit: String(limit) });
    return { status: json?.status ?? 'error', message: json?.message ?? '', data: json?.data ?? null };
  },

  /** My roster (weekly off + WFH) — api/mobile.php?action=employee/roster. */
  async getRoster(opts?: { year?: number; month?: number }): Promise<ApiResponse<RosterData>> {
    if (USE_DUMMY) {
      await wait(MOCK_LATENCY_MS);
      const today = defaultRosterDay(0);
      const tomorrow = { ...defaultRosterDay(1), status: 'off' as const, statusLabel: 'Weekly Off' };
      return {
        status: 'success',
        message: 'OK',
        data: {
          year: opts?.year ?? new Date().getFullYear(),
          month: opts?.month ?? new Date().getMonth() + 1,
          monthLabel: new Date().toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
          startDate: today.date,
          endDate: tomorrow.date,
          today,
          tomorrow,
          days: [today, tomorrow],
        },
      };
    }
    const fields: Record<string, string> = {};
    if (opts?.year != null) fields.year = String(opts.year);
    if (opts?.month != null) fields.month = String(opts.month);
    const json = await postStore('employee/roster', fields);
    const data = normalizeRosterData(json?.data ?? json);
    return {
      status: json?.status === 'success' && data ? 'success' : 'error',
      message: json?.message ?? (data ? 'OK' : 'Could not load roster.'),
      data,
    };
  },

  /** Documents + assigned policies — api/mobile.php?action=employee/documents. */
  async getDocuments(): Promise<ApiResponse<DocumentsData>> {
    const json = await postStore('employee/documents');
    return { status: json?.status ?? 'error', message: json?.message ?? '', data: json?.data ?? null };
  },

  /** Payslip summaries for the signed-in employee — api/mobile.php?action=employee/payslips. */
  async getPayslips(year?: number): Promise<ApiResponse<PayslipsData>> {
    const fields: Record<string, string> = {};
    if (year != null) fields.year = String(year);
    const json = await postStore('employee/payslips', fields);
    return { status: json?.status ?? 'error', message: json?.message ?? '', data: json?.data ?? null };
  },

  /** Help & support contacts — api/mobile.php?action=employee/support. */
  async getSupport(): Promise<ApiResponse<SupportData>> {
    const json = await postStore('employee/support');
    return { status: json?.status ?? 'error', message: json?.message ?? '', data: json?.data ?? null };
  },

  /** Notification feed — api/mobile.php?action=notifications/list. */
  async getNotifications(opts?: { unreadOnly?: boolean; limit?: number }): Promise<ApiResponse<NotificationsData>> {
    const fields: Record<string, string> = {};
    if (opts?.unreadOnly) fields.unread_only = '1';
    if (opts?.limit != null) fields.limit = String(opts.limit);
    const json = await postStore('notifications/list', fields);
    return { status: json?.status ?? 'error', message: json?.message ?? '', data: json?.data ?? null };
  },

  /** Mark one notification read — api/mobile.php?action=notifications/read. */
  async markNotificationRead(id: number): Promise<ApiResponse<{ id: number; unreadCount: number }>> {
    const json = await postStore('notifications/read', { id: String(id) });
    return { status: json?.status ?? 'error', message: json?.message ?? '', data: json?.data ?? null };
  },

  /** Mark all notifications read — api/mobile.php?action=notifications/read-all. */
  async markAllNotificationsRead(): Promise<ApiResponse<{ unreadCount: number }>> {
    const json = await postStore('notifications/read-all');
    return { status: json?.status ?? 'error', message: json?.message ?? '', data: json?.data ?? null };
  },

  /** Leave-type picker metadata (rules per type) — GET api/mobile.php?action=leave/types. */
  async getLeaveTypes(): Promise<ApiResponse<{ types: LeaveType[] }>> {
    const json = await postStore('leave/types');
    return { status: json?.status ?? 'error', message: json?.message ?? '', data: json?.data ?? null };
  },

  /** Full detail (incl. approver remarks) for one leave request the employee owns. */
  async getLeaveRequestDetail(id: number): Promise<ApiResponse<LeaveRequestDetail>> {
    const json = await postStore('leave/request/detail', { id: String(id) });
    return { status: json?.status ?? 'error', message: json?.message ?? '', data: json?.data ?? null };
  },

  /** Manager/HR leave-approval inbox — leave/approvals/list. */
  async getLeaveApprovals(
    tab: 'pending' | 'approved' = 'pending',
    limit = 50,
    offset = 0,
    q = '',
    approver = 'all',
  ): Promise<
    ApiResponse<{
      tab: string;
      total: number;
      items: LeaveApprovalItem[];
      q?: string;
      approver?: string;
      approverStats: LeaveApproverStat[];
    }>
  > {
    const json = await postStore('leave/approvals/list', {
      tab,
      limit: String(limit),
      offset: String(offset),
      q: q.trim(),
      approver: approver || 'all',
    });
    const items = Array.isArray(json?.data?.items) ? json.data.items : [];
    const approverStatsRaw = Array.isArray(json?.data?.approverStats)
      ? json.data.approverStats
      : [];
    const approverStats: LeaveApproverStat[] = approverStatsRaw.map((row: any) => ({
      key: String(row?.key ?? ''),
      employeeId: Number(row?.employeeId ?? 0),
      name: String(row?.name ?? 'Approver'),
      pendingCount: Number(row?.pendingCount ?? 0),
      isYou: Boolean(row?.isYou),
    }));
    return {
      status: json?.status === 'success' ? 'success' : 'error',
      message: json?.message ?? '',
      data: json?.status === 'success'
        ? {
            tab: String(json.data?.tab ?? tab),
            total: Number(json.data?.total ?? items.length),
            items,
            q: String(json.data?.q ?? q),
            approver: String(json.data?.approver ?? approver),
            approverStats,
          }
        : null,
    };
  },

  /** Approver detail for one leave — leave/approvals/detail. */
  async getLeaveApprovalDetail(id: number): Promise<ApiResponse<LeaveApprovalDetail>> {
    const json = await postStore('leave/approvals/detail', { id: String(id) });
    return {
      status: json?.status === 'success' ? 'success' : 'error',
      message: json?.message ?? '',
      data: json?.status === 'success' ? json.data : null,
    };
  },

  /**
   * Approve or reject a leave — leave/approvals/decide.
   * Reuses the web change_leave_status rules (remarks + digital signature).
   */
  async decideLeaveApproval(input: {
    id: number;
    decision: 'approve' | 'reject';
    remarks: string;
    signatureData?: string;
  }): Promise<ApiResponse<null>> {
    const json = await postStore('leave/approvals/decide', {
      id: String(input.id),
      decision: input.decision,
      remarks: input.remarks,
      signature_data: input.signatureData ?? '',
    });
    return {
      status: json?.status === 'success' ? 'success' : 'error',
      message: json?.message ?? 'Could not update the leave request.',
      data: null,
    };
  },

  /** Offer-letter approval inbox — offer_letter/approvals/list (pending only). */
  async getOfferLetterApprovals(
    limit = 50,
    offset = 0,
    q = '',
  ): Promise<ApiResponse<{ tab: string; total: number; items: OfferLetterApprovalItem[]; q?: string }>> {
    const json = await postStore('offer_letter/approvals/list', {
      limit: String(limit),
      offset: String(offset),
      q: q.trim(),
    });
    const items = Array.isArray(json?.data?.items) ? json.data.items : [];
    return {
      status: json?.status === 'success' ? 'success' : 'error',
      message: json?.message ?? '',
      data: json?.status === 'success'
        ? {
            tab: String(json.data?.tab ?? 'pending'),
            total: Number(json.data?.total ?? items.length),
            items,
            q: String(json.data?.q ?? q),
          }
        : null,
    };
  },

  /** Approver detail for one offer letter — offer_letter/approvals/detail. */
  async getOfferLetterApprovalDetail(id: number): Promise<ApiResponse<OfferLetterApprovalDetail>> {
    const json = await postStore('offer_letter/approvals/detail', { id: String(id) });
    return {
      status: json?.status === 'success' ? 'success' : 'error',
      message: json?.message ?? '',
      data: json?.status === 'success' ? json.data : null,
    };
  },

  /**
   * Approve & send, or reject, an offer letter — offer_letter/approvals/decide.
   * Remarks must be at least 10 characters (same as web). Includes editable offer fields.
   */
  async decideOfferLetterApproval(input: {
    id: number;
    decision: 'approve' | 'reject';
    remarks: string;
    designationId?: number;
    workModality?: string;
    gender?: string;
    probationDate?: string;
    probationCompleteDate?: string;
    probationSalary?: string;
    afterProbationSalary?: string;
    ccEmployeeIds?: number[];
  }): Promise<ApiResponse<null>> {
    const json = await postStore('offer_letter/approvals/decide', {
      id: String(input.id),
      decision: input.decision,
      remarks: input.remarks,
      designation_id: String(input.designationId ?? ''),
      work_modality: input.workModality ?? '',
      gender: input.gender ?? '',
      probation_date: input.probationDate ?? '',
      probation_complete_date: input.probationCompleteDate ?? '',
      probation_salary: input.probationSalary ?? '',
      after_probation_salary: input.afterProbationSalary ?? '',
      cc_employee_ids: (input.ccEmployeeIds ?? []).join(','),
    });
    return {
      status: json?.status === 'success' ? 'success' : 'error',
      message: json?.message ?? 'Could not update the offer letter.',
      data: null,
    };
  },

  /** CC employee search for offer-letter approvals. */
  async searchOfferLetterCc(
    q: string,
    excludeEmployeeId = 0,
    limit = 12,
  ): Promise<ApiResponse<{ results: OfferLetterCcEmployee[] }>> {
    const json = await postStore('offer_letter/approvals/cc-search', {
      q: q.trim(),
      exclude: String(excludeEmployeeId || ''),
      limit: String(limit),
    });
    const results = Array.isArray(json?.data?.results)
      ? json.data.results.map((r: any): OfferLetterCcEmployee => ({
          id: Number(r.id ?? 0),
          name: String(r.name ?? ''),
          email: String(r.email ?? ''),
        })).filter((r: OfferLetterCcEmployee) => r.id > 0)
      : [];
    return {
      status: json?.status === 'success' ? 'success' : 'error',
      message: json?.message ?? '',
      data: json?.status === 'success' ? { results } : null,
    };
  },

  /** Lifecycle / employment-status approval inbox — lifecycle/approvals/list. */
  async getLifecycleApprovals(
    tab: 'pending' | 'approved' | 'rejected' | 'all' = 'pending',
    limit = 50,
    offset = 0,
    q = '',
  ): Promise<ApiResponse<{ tab: string; total: number; items: LifecycleApprovalItem[]; q?: string }>> {
    const json = await postStore('lifecycle/approvals/list', {
      tab,
      limit: String(limit),
      offset: String(offset),
      q: q.trim(),
    });
    const items = Array.isArray(json?.data?.items) ? json.data.items : [];
    return {
      status: json?.status === 'success' ? 'success' : 'error',
      message: json?.message ?? '',
      data: json?.status === 'success'
        ? {
            tab: String(json.data?.tab ?? tab),
            total: Number(json.data?.total ?? items.length),
            items,
            q: String(json.data?.q ?? q),
          }
        : null,
    };
  },

  /** Approver detail for one lifecycle change — lifecycle/approvals/detail. */
  async getLifecycleApprovalDetail(id: string | number): Promise<ApiResponse<LifecycleApprovalDetail>> {
    const json = await postStore('lifecycle/approvals/detail', { id: String(id) });
    return {
      status: json?.status === 'success' ? 'success' : 'error',
      message: json?.message ?? '',
      data: json?.status === 'success' ? json.data : null,
    };
  },

  /**
   * Approve or reject a lifecycle / employment-status change — lifecycle/approvals/decide.
   * For probation_review use decision clear|extend (+ extendedProbationCompleteDate when extending).
   * Remarks must be at least 10 characters (same as web).
   */
  async decideLifecycleApproval(input: {
    id: string | number;
    decision: 'approve' | 'reject' | 'clear' | 'extend';
    remarks: string;
    extendedProbationCompleteDate?: string;
  }): Promise<ApiResponse<null>> {
    const payload: Record<string, string> = {
      id: String(input.id),
      decision: input.decision,
      remarks: input.remarks,
    };
    if (input.extendedProbationCompleteDate) {
      payload.extended_probation_complete_date = input.extendedProbationCompleteDate;
    }
    const json = await postStore('lifecycle/approvals/decide', payload);
    return {
      status: json?.status === 'success' ? 'success' : 'error',
      message: json?.message ?? 'Could not update the lifecycle approval.',
      data: null,
    };
  },

  /** Probation review inbox — probation/approvals/list */
  async getProbationApprovals(
    tab: 'pending' | 'apply' | 'completed' | 'cancelled' | 'all' = 'pending',
  ): Promise<ApiResponse<{ tab: string; total: number; isHr: boolean; items: ProbationReviewItem[] }>> {
    const json = await postStore('probation/approvals/list', { tab });
    const items = Array.isArray(json?.data?.items) ? json.data.items : [];
    return {
      status: json?.status === 'success' ? 'success' : 'error',
      message: json?.message ?? '',
      data: json?.status === 'success'
        ? {
            tab: String(json.data?.tab ?? tab),
            total: Number(json.data?.total ?? items.length),
            isHr: Boolean(json.data?.isHr),
            items,
          }
        : null,
    };
  },

  /** HR due list — probation/approvals/due */
  async getProbationDueList(): Promise<ApiResponse<{ total: number; items: ProbationDueItem[]; windowDays: number }>> {
    const json = await postStore('probation/approvals/due');
    const items = Array.isArray(json?.data?.items) ? json.data.items : [];
    return {
      status: json?.status === 'success' ? 'success' : 'error',
      message: json?.message ?? '',
      data: json?.status === 'success'
        ? {
            total: Number(json.data?.total ?? items.length),
            items,
            windowDays: Number(json.data?.windowDays ?? 15),
          }
        : null,
    };
  },

  /** HR send review — probation/approvals/send */
  async sendProbationReview(input: {
    employeeId: number;
    approverId: number;
    notes?: string;
  }): Promise<ApiResponse<{ id: string } | null>> {
    const payload: Record<string, string> = {
      employee_id: String(input.employeeId),
      approver_id: String(input.approverId),
    };
    if (input.notes) payload.notes = input.notes;
    const json = await postStore('probation/approvals/send', payload);
    return {
      status: json?.status === 'success' ? 'success' : 'error',
      message: json?.message ?? 'Could not send probation review.',
      data: json?.status === 'success' ? { id: String(json.data?.id ?? '') } : null,
    };
  },

  /** HR approval authority candidates — probation/approvals/approvers */
  async getProbationApprovers(input?: {
    q?: string;
    excludeEmployeeId?: number;
    limit?: number;
  }): Promise<ApiResponse<{ total: number; items: ProbationApproverOption[] }>> {
    const payload: Record<string, string> = {};
    if (input?.q) payload.q = input.q;
    if (input?.excludeEmployeeId) payload.exclude_employee_id = String(input.excludeEmployeeId);
    if (input?.limit) payload.limit = String(input.limit);
    const json = await postStore('probation/approvals/approvers', payload);
    const itemsRaw = Array.isArray(json?.data?.items) ? json.data.items : [];
    const items: ProbationApproverOption[] = itemsRaw.map((row: any) => ({
      employeeId: Number(row.employeeId ?? row.employee_id ?? 0),
      employeeName: String(row.employeeName ?? row.employee_name ?? ''),
      employeeCode: String(row.employeeCode ?? row.employee_code ?? ''),
      countryId: Number(row.countryId ?? row.country_id ?? 0),
      countryName: String(row.countryName ?? row.country_name ?? ''),
    }));
    return {
      status: json?.status === 'success' ? 'success' : 'error',
      message: json?.message ?? '',
      data: json?.status === 'success'
        ? { total: Number(json.data?.total ?? items.length), items }
        : null,
    };
  },

  async getProbationApprovalDetail(id: string): Promise<ApiResponse<ProbationReviewDetail>> {
    const json = await postStore('probation/approvals/detail', { id: String(id) });
    return {
      status: json?.status === 'success' ? 'success' : 'error',
      message: json?.message ?? '',
      data: json?.status === 'success' ? json.data : null,
    };
  },

  async decideProbationApproval(input: {
    id: string;
    decision: 'clear' | 'extend';
    remarks: string;
    extendedProbationCompleteDate?: string;
  }): Promise<ApiResponse<null>> {
    const payload: Record<string, string> = {
      id: String(input.id),
      decision: input.decision,
      remarks: input.remarks,
    };
    if (input.extendedProbationCompleteDate) {
      payload.extended_probation_complete_date = input.extendedProbationCompleteDate;
    }
    const json = await postStore('probation/approvals/decide', payload);
    return {
      status: json?.status === 'success' ? 'success' : 'error',
      message: json?.message ?? 'Could not save decision.',
      data: null,
    };
  },

  async applyProbationApproval(input: {
    id: string;
    hrRemarks?: string;
  }): Promise<ApiResponse<null>> {
    const json = await postStore('probation/approvals/apply', {
      id: String(input.id),
      hr_remarks: input.hrRemarks ?? '',
    });
    return {
      status: json?.status === 'success' ? 'success' : 'error',
      message: json?.message ?? 'Could not apply to profile.',
      data: null,
    };
  },

  /**
   * Submit a leave request — POST api/mobile.php?action=leave/request/create.
   * Wraps the same battle-tested handler the web "Add Leave Request" modal
   * posts to, so every leave-type rule is enforced server-side. On failure,
   * `message` already contains a user-facing explanation (balance, blackout,
   * advance notice, overlap, etc.) suitable to show as-is.
   */
  async createLeaveRequest(input: {
    leaveTypeId: number;
    startDate: string;
    endDate: string;
    reason: string;
  }): Promise<ApiResponse<null>> {
    const json = await postStore('leave/request/create', {
      leave_type_id: String(input.leaveTypeId),
      start_date: input.startDate,
      end_date: input.endDate,
      reason: input.reason,
    });
    return {
      status: json?.status === 'success' ? 'success' : 'error',
      message: json?.message ?? 'Could not submit the leave request.',
      data: null,
    };
  },

  /** Active employee keyword search — requires employees_list. */
  async searchEmployees(q: string, limit = 20): Promise<ApiResponse<{ results: HrEmployeeSearchResult[] }>> {
    const json = await postStore('hr/employees/search', {
      q: q.trim(),
      limit: String(limit),
    });
    const results = Array.isArray(json?.data?.results)
      ? json.data.results.map((r: any): HrEmployeeSearchResult => ({
          employeeKey: String(r.employeeKey ?? r.employee_key ?? ''),
          employeeCode: String(r.employeeCode ?? r.employee_code ?? ''),
          name: String(r.name ?? ''),
          email: String(r.email ?? ''),
          phone: String(r.phone ?? ''),
          department: String(r.department ?? ''),
          designation: String(r.designation ?? ''),
          profilePhoto: r.profilePhoto ?? r.profile_photo ?? null,
        }))
      : [];
    return {
      status: json?.status === 'success' ? 'success' : 'error',
      message: json?.message ?? '',
      data: json?.status === 'success' ? { results } : null,
    };
  },

  /** HR employee detail (one tab). */
  async getEmployeeDetail(
    employeeKey: string,
    tab: HrEmployeeTabKey = 'personal',
  ): Promise<ApiResponse<HrEmployeeDetail>> {
    const json = await postStore('hr/employees/detail', {
      employee_key: employeeKey,
      tab,
    });
    return {
      status: json?.status === 'success' ? 'success' : 'error',
      message: json?.message ?? '',
      data: json?.status === 'success' ? (json.data as HrEmployeeDetail) : null,
    };
  },

  /**
   * Unlock Work Detail / finance after OTP (send via sendOtp first).
   * Does not replace the mobile session token.
   */
  async revealEmployeeFinance(
    employeeKey: string,
    otp: string,
  ): Promise<ApiResponse<{ workDetail: HrWorkDetail }>> {
    const json = await postStore('hr/employees/finance-reveal', {
      employee_key: employeeKey,
      otp: otp.trim(),
    });
    return {
      status: json?.status === 'success' ? 'success' : 'error',
      message: json?.message ?? '',
      data: json?.status === 'success'
        ? { workDetail: json.data?.workDetail as HrWorkDetail }
        : null,
    };
  },
};
