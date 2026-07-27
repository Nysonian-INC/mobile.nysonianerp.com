/** Domain types mirroring the ERP employee dashboard payloads. */

export type Employee = {
  id: number;
  name: string;
  role: string;
  department: string;
  manager: string;
  workModality: string;
  companyName: string;
  status: string;
  joinDate: string; // ISO date
  biometricId: string;
  tenure: string;
  profilePhoto?: string | null;
  leaveUnitLabel: 'Days' | 'Hours';
};

export type LeaveSummary = {
  accruedToToday: number;
  proratedLeaves: number;
  consumedLeaves: number;
  availableLeaves: number;
  carryoverHours: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  accrualThroughLabel: string;
};

export type AttendanceDay = {
  date: string; // ISO date
  label: string; // e.g. "6 Nov Mon"
  checkIn: string | null; // "09:12 AM"
  checkOut: string | null;
  workingHours: number; // decimal hours
  late: boolean;
};

/** One day of Time Doctor tracking (hr.time_doc_logs). */
export type TimeDocLog = {
  id: number;
  date: string; // ISO date
  label: string; // e.g. "16 Thu"
  trackedTime: string; // gross tracked "06:33" or "—"
  trackedHours: number;
  idleTime: string; // "02:32" or "—"
  idleMinutes: number;
  /** Net working time after idle: tracked − idle, e.g. "04:01". */
  actualTime: string;
  actualHours: number;
  /** Display line matching web report: "06:33 - 02:32". */
  breakdown: string | null;
  startTime: string | null;
  endTime: string | null;
};

export type TimeDocLogsData = {
  logs: TimeDocLog[];
  count: number;
};

export type LeaveRequest = {
  id: number;
  type: string;
  from: string;
  to: string;
  days: number;
  status: 'pending' | 'approved' | 'rejected';
};

/** An IT asset assigned to the employee. */
export type ItAsset = {
  id: number;
  tag: string; // display tag, e.g. NYC-2026-000123
  name: string; // "Dell Laptop"
  brand: string;
  category: string;
  model: string;
  serialNumber: string;
  status: string;
  detail: string;
  assignedDate: string; // ISO date, may be empty
  purchaseDate: string; // ISO date, may be empty
};

/** A remark left on a leave request by an approver or HR. */
export type LeaveRemark = {
  author: string;
  role: 'approver' | 'hr';
  status: string; // approver decision, e.g. "approved" / "rejected" (empty for HR)
  text: string;
  date: string; // ISO datetime, may be empty
};

export type LeaveAttachment = {
  label: string;
  url: string;
};

/** Full detail for a single leave request (detail screen). */
export type LeaveRequestDetail = {
  id: number;
  code: string;
  type: string;
  from: string;
  to: string;
  days: number;
  status: 'pending' | 'approved' | 'rejected';
  statusLabel: string;
  reason: string;
  manager: string;
  appliedOn: string;
  remarks: LeaveRemark[];
  attachments: LeaveAttachment[];
};

/** Leave row in the manager/HR approval inbox. */
export type LeaveApprovalItem = {
  id: number;
  code: string;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  type: string;
  from: string;
  to: string;
  days: number;
  status: 'pending' | 'approved' | 'rejected';
  rawStatus: string;
  statusLabel: string;
  manager: string;
  /** Person the leave is currently waiting on (0 when HR / unassigned). */
  currentApproverId?: number;
  currentApproverName?: string;
  awaitingHr?: boolean;
  reason: string;
  appliedOn: string;
  canAct: boolean;
};

/** Pending leave count for one current approver (stats strip). */
export type LeaveApproverStat = {
  key: string;
  employeeId: number;
  name: string;
  pendingCount: number;
  isYou: boolean;
};

export type LeaveApprovalDetail = LeaveApprovalItem & {
  employeeEmail: string;
  department: string;
  designation: string;
  remarks: LeaveRemark[];
  attachments: LeaveAttachment[];
  approvalProgress: {
    approved: number;
    total: number;
    approvers: { name: string; status: string; date: string }[];
  };
  actions: {
    canAct: boolean;
    approveStatus: string;
    rejectStatus: string;
    signatureRequired: boolean;
  };
};

/** Pending offer letter in the recruiter/approver inbox. */
export type OfferLetterApprovalItem = {
  id: number;
  employeeId: number;
  candidateName: string;
  candidateEmail: string;
  designation: string;
  designationId: number;
  workModality: string;
  gender: string;
  requestedBy: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  statusLabel: string;
  canAct: boolean;
};

export type OfferLetterOption = {
  id: number | string;
  name: string;
};

export type OfferLetterCcEmployee = {
  id: number;
  name: string;
  email: string;
};

export type OfferLetterApprovalDetail = OfferLetterApprovalItem & {
  probationDate: string;
  probationCompleteDate: string;
  probationSalary: string | null;
  afterProbationSalary: string | null;
  approvalNotes: string;
  pdfUrl: string;
  designations: OfferLetterOption[];
  workModalityOptions: OfferLetterOption[];
  genderOptions: OfferLetterOption[];
  ccEmployees: OfferLetterCcEmployee[];
  actions: {
    canAct: boolean;
  };
};

/** Employment status / lifecycle change awaiting approver action. */
export type LifecycleApprovalItem = {
  id: string | number;
  employeeId: number;
  employeeKey: string;
  employeeName: string;
  employeeCode: string;
  statusType: string;
  typeLabel: string;
  summary: string;
  effectiveDate: string;
  requestedBy: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'manager_decided' | 'cancelled' | string;
  statusLabel: string;
  canAct: boolean;
};

export type LifecycleChangeRow = {
  label: string;
  from: string;
  to: string;
};

export type LifecycleApprovalDetail = LifecycleApprovalItem & {
  requesterNotes: string;
  approvalNotes: string;
  eligibilityRemarks: string;
  changeRows: LifecycleChangeRow[];
  actions: {
    canAct: boolean;
    mode?: string;
    options?: string[];
    requiresExtendDate?: boolean;
  };
  proposedWorkStatus?: string;
  afterProbationSalary?: number | string | null;
  probationCompleteDate?: string;
};

/** Picker metadata for the "Request leave" form — mirrors the per-type rules
 * the web "Add Leave Request" modal renders into its <option data-*> attrs. */
export type LeaveType = {
  id: number;
  name: string;
  /** Minimum calendar days of advance notice required before the start date. */
  advanceNoticeDays: number;
  /** May be requested during a department blackout period. */
  blackoutExempt: boolean;
  /** Bypasses probation, PTO balance, advance notice, and capacity rules. */
  unrestricted: boolean;
  paid: boolean;
  halfDay: boolean;
  maxDays: number | null;
  maxTotalPerYear: number | null;
};

export type PolicyAck = {
  ackId: number;
  policyId: number;
  title: string;
  category: string;
  policyCode: string;
  versionNumber: string;
  effectiveDate: string;
};

export type ActivityLog = {
  id: number;
  message: string;
  date: string; // ISO datetime
  type: 'attendance' | 'leave' | 'policy' | 'profile' | 'asset' | 'system';
};

export type DashboardData = {
  employee: Employee;
  leaves: LeaveSummary;
  attendance: AttendanceDay[];
  lateComings: number;
  leaveRequests: LeaveRequest[];
  pendingPolicies: PolicyAck[];
  missingFields: string[];
  logs: ActivityLog[];
  /** Pending offer letters the current user can approve (0 when not an approver). */
  pendingOfferLetterCount: number;
  /** Pending team leave requests the current user can approve (0 when no access). */
  pendingLeaveApprovalCount: number;
  /** Pending employment-status / lifecycle changes assigned to the current user. */
  pendingLifecycleApprovalCount: number;
  /** Pending probation reviews assigned to the current user (manager inbox). */
  pendingProbationApprovalCount: number;
  /** HR: employees due for probation review within 15 days. */
  pendingProbationDueCount: number;
  /** HR: manager-decided reviews waiting to apply. */
  pendingProbationApplyCount: number;
  permissions: {
    liveCameras: boolean;
    employeesList: boolean;
    leaveApprovals: boolean;
    offerLetterApprovals: boolean;
    lifecycleApprovals: boolean;
    probationApprovals: boolean;
    /** True when the current user is HR and can send/apply probation reviews. */
    probationApprovalsHr: boolean;
    /** True when the user has the web IT dashboard (`it_dashboard`) permission. */
    itDashboard: boolean;
  };
};

/** Probation review item (manager decide / HR apply). */
export type ProbationReviewItem = {
  id: string;
  employeeId: number;
  employeeKey: string;
  employeeName: string;
  employeeCode: string;
  managerName: string;
  approverId: number;
  status: string;
  statusLabel: string;
  decision: string;
  decisionLabel: string;
  effectiveDate: string;
  probationCompleteDate: string;
  extendedProbationCompleteDate: string;
  afterProbationSalary?: number | string | null;
  currentSalary?: number | string | null;
  currency: string;
  proposedWorkStatus: string;
  managerRemarks: string;
  hrRemarks: string;
  notes: string;
  requestedAt: string;
  canDecide: boolean;
  canApply: boolean;
  canCancel: boolean;
};

export type ProbationReviewDetail = ProbationReviewItem & {
  actions: {
    canDecide: boolean;
    canApply: boolean;
    options: string[];
  };
};

export type ProbationDueItem = {
  employeeId: number;
  employeeKey: string;
  employeeName: string;
  employeeCode: string;
  probationDate: string;
  probationCompleteDate: string;
  daysRemaining: number;
  managerId: number;
  managerName: string;
  afterProbationSalary?: number | string | null;
  currentSalary?: number | string | null;
  currency: string;
  canSend: boolean;
};

/* ----------------------------- Profile ----------------------------- */

export type ProfileIdentity = {
  id: number;
  name: string;
  email: string;
  phone: string;
  biometricId: string;
  profilePhoto?: string | null;
  status: string;
};

export type ProfileEmployment = {
  role: string;
  department: string;
  subDepartment: string;
  companyName: string;
  workModality: string;
  joinDate: string;
  manager: string;
  managerEmail: string;
  managerPhone: string;
  timezone: string;
  office: string;
};

export type ProfilePersonal = {
  dob: string;
  gender: string;
  maritalStatus: string;
  bloodGroup: string;
  nationality: string;
  country: string;
  personalEmail: string;
  linkedin: string;
  cnicSsn: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
};

export type EmergencyContact = {
  id: number;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  address: string;
};

export type EducationRecord = {
  id: number;
  institution: string;
  degree: string;
  grade: string;
  startYear: string;
  endYear: string;
};

export type EmployeeProfileData = {
  identity: ProfileIdentity;
  employment: ProfileEmployment;
  personal: ProfilePersonal;
  emergencyContacts: EmergencyContact[];
  education: EducationRecord[];
};

export type EmployeeDocument = {
  id: number;
  type: string;
  number: string;
  description: string;
  issueDate: string;
  expiryDate: string;
  mime: string;
  size: string;
  signatureRequired: boolean;
  signed: boolean;
  signedAt: string;
  viewUrl: string | null;
};

export type PendingDocumentType = {
  id: number;
  title: string;
};

export type EmployeePolicy = {
  ackId: number;
  policyId: number;
  code: string;
  title: string;
  category: string;
  version: string;
  effectiveDate: string;
  status: string;
  assignedAt: string;
  acknowledgedAt: string;
  fileUrl: string | null;
  mime: string;
};

export type DocumentsData = {
  documents: EmployeeDocument[];
  pendingTypes: PendingDocumentType[];
  policies: EmployeePolicy[];
};

export type Payslip = {
  id: number;
  salaryId: string;
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  currency: string;
  basic: number;
  allowances: number;
  deductions: number;
  tax: number;
  net: number;
  status: string;
  statusLabel: string;
  paidAt: string;
  approvedAt: string;
};

export type PayslipsData = {
  year: number | null;
  payslips: Payslip[];
};

export type EmployeeNotification = {
  id: number;
  type: string;
  verb: string;
  data: Record<string, unknown>;
  action: Record<string, unknown>;
  read: boolean;
  readAt: string | null;
  createdAt: string;
};

export type NotificationsData = {
  notifications: EmployeeNotification[];
  unreadCount: number;
};

export type SupportContact = {
  role: 'manager' | 'hr' | 'it' | string;
  title: string;
  name: string;
  email: string;
  phone: string;
};

export type SupportCompany = {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
};

export type SupportData = {
  company: SupportCompany;
  contacts: SupportContact[];
};

/* ----------------------------- IP Cameras ----------------------------- */

export type CamChannel = {
  ch: number; // channel number
  name: string; // e.g. "Lobby", "Gate 1"
};

export type Camera = {
  camNum: number;
  name: string; // display name
  hostLabel: string; // host / NVR label
  type: 'reolink' | 'hikvision';
  maxCh: number;
  channels: CamChannel[];
};

/** A saved grid layout: an ordered set of channel references. */
export type IpCamTemplate = {
  id: string;
  name: string;
  tiles: Array<{ camNum: number; ch: number }>;
};

export type IpCamData = {
  cameras: Camera[];
  templates: IpCamTemplate[];
};

export type IpCamViewMode = 'single' | 'multi' | 'template';
export type IpCamStream = 'main' | 'sub';

/** Playback URLs from api/mobile.php?action=ipcam/stream */
export type IpCamStreamData = {
  hls_url: string;
  webrtc_url?: string;
  play_path: string;
  quality: IpCamStream;
  registered?: boolean;
};

/** One node in the reporting tree (employee/organogram — mirrors organogram3). */
export type OrganogramNode = {
  id: string;
  employee_key: string;
  name: string;
  title: string;
  designation: string;
  manager_key?: string;
  direct_reports: number;
  level: number;
  virtual?: boolean;
  is_me?: boolean;
  children: OrganogramNode[];
};

export type OrganogramFlatNode = {
  id: string;
  employee_key: string;
  name: string;
  title: string;
  designation: string;
  manager_key: string;
  direct_reports: number;
  level: number;
  virtual: boolean;
  is_me: boolean;
};

export type OrganogramStats = {
  employees: number;
  leaders: number;
  roots: number;
  levels: number;
};

export type OrganogramData = {
  tree: OrganogramNode;
  flat: OrganogramFlatNode[];
  parents: Record<string, string>;
  stats: OrganogramStats;
  meKey: string;
  chainKeys: string[];
};

/* ------------------------ HR employee directory ------------------------ */

export type HrEmployeeTabKey =
  | 'personal'
  | 'work_detail'
  | 'attendance'
  | 'activity'
  | 'documents'
  | 'onboarding'
  | 'lifecycle'
  | 'leaves_wfh'
  | 'policies';

export type HrEmployeeSearchResult = {
  employeeKey: string;
  employeeCode: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  profilePhoto?: string | null;
};

export type HrEmployeeTab = {
  key: HrEmployeeTabKey;
  label: string;
  visible: boolean;
};

export type HrEmployeeHeader = {
  employeeKey: string;
  employeeId: number;
  employeeCode: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  workStatus: string;
  department: string;
  designation: string;
  profilePhoto?: string | null;
};

export type HrFinanceField = {
  key: string;
  label: string;
  value: string;
};

export type HrWorkDetail = {
  fields: HrFinanceField[];
  financeMasked: boolean;
  revealedUntil?: number | null;
};

export type HrAttendanceDay = {
  date: string;
  checkIn: string;
  checkOut: string;
  workingHours: string;
  hoursDecimal?: number | null;
  late: string;
};

export type HrActivityLog = {
  id: number;
  title: string;
  description: string;
  date: string;
  type: string;
};

export type HrTimeDocLog = {
  id: number;
  name: string;
  email: string;
  trackedTime: string;
  startTime: string;
  endTime: string;
  logDate: string;
};

export type HrDocumentItem = {
  id: number;
  type: string;
  description: string;
  issueDate: string;
  expiryDate: string;
  requiredSignature: boolean;
  signedAt: string;
  ext: string;
  size?: number | null;
  fileUrl?: string | null;
};

export type HrChecklistItem = {
  id: number;
  title: string;
  done: boolean;
  doneAt: string;
  dueDate: string;
  notes: string;
};

export type HrChecklist = {
  id: number;
  startedAt: string;
  completedAt: string;
  total: number;
  done: number;
  items: HrChecklistItem[];
};

export type HrPolicyItem = {
  ackId: number;
  policyId: number;
  title: string;
  category: string;
  policyCode: string;
  versionNumber: string;
  effectiveDate: string;
  status: string;
  assignedAt: string;
  acknowledgedAt: string;
};

export type HrLeaveRequestRow = {
  id: number;
  type: string;
  startDate: string;
  endDate: string;
  status: string;
  reason: string;
};

export type HrEmployeeDetail = {
  header: HrEmployeeHeader;
  tabs: HrEmployeeTab[];
  tab: HrEmployeeTabKey;
  personal?: EmployeeProfileData;
  workDetail?: HrWorkDetail;
  attendance?: { days: HrAttendanceDay[] };
  activity?: { systemLogs: HrActivityLog[]; timeDocs: HrTimeDocLog[] };
  documents?: { items: HrDocumentItem[] };
  onboarding?: {
    preOnboarding: HrChecklist[];
    onboarding: HrChecklist[];
    offboarding: HrChecklist[];
    documents: HrChecklist[];
  };
  lifecycle?: {
    current: {
      assignment: string;
      lifecycle: string;
      country: string;
      office: string;
      workModality: string;
      hireDate: string;
      exitDate: string;
    };
  };
  leaves?: {
    summary: {
      accrued: number;
      consumed: number;
      available: number;
      unitLabel: string;
    };
    requests: HrLeaveRequestRow[];
  };
  policies?: { items: HrPolicyItem[] };
};

/** ERP standard response envelope: { status, message, ...payload } */
export type ApiResponse<T> = {
  status: 'success' | 'error';
  message: string;
  data: T | null;
};

/* ------------------------ Biometric machines (IT) ----------------------- */

export type BioMachineFetchTone = 'fresh' | 'ok' | 'stale' | 'none';

export type BioMachine = {
  deviceId: string;
  deviceName: string;
  office: string | null;
  ip: string | null;
  port: number | null;
  online: boolean;
  status: 'online' | 'offline';
  lastRecordTime: string | null;
  lastRecordRelative: string;
  fetchTone: BioMachineFetchTone;
};

export type BioMachinesData = {
  summary: {
    total: number;
    online: number;
    offline: number;
  };
  machines: BioMachine[];
};
