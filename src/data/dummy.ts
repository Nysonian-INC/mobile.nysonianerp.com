/**
 * Phase 1 dummy data.
 *
 * Shapes mirror what `modules/dashboard/employee.php` builds on the web ERP so
 * that wiring the real API in Phase 2 is a drop-in replacement (see
 * `src/api/client.ts`). Nothing here hits a network.
 */
import {
  ActivityLog,
  AttendanceDay,
  DashboardData,
  Employee,
  LeaveRequest,
  LeaveSummary,
  PolicyAck,
} from '@/types';

export const DEMO_CREDENTIALS = {
  email: 'employee@nysonian.com',
  password: 'demo1234',
};

const employee: Employee = {
  id: 1042,
  name: 'Ayesha Khan',
  role: 'Senior Software Engineer',
  department: 'Engineering',
  manager: 'Daniyal Ahmed',
  workModality: 'Hybrid',
  companyName: 'Nysonian Inc.',
  status: 'Active',
  joinDate: '2022-03-14',
  biometricId: '20451',
  tenure: '4Y 3M',
  profilePhoto: null,
  leaveUnitLabel: 'Days',
};

const leaves: LeaveSummary = {
  accruedToToday: 18,
  proratedLeaves: 21,
  consumedLeaves: 7,
  availableLeaves: 11,
  carryoverHours: 3,
  approvedCount: 5,
  rejectedCount: 1,
  pendingCount: 1,
  accrualThroughLabel: '22 Jun, 2026',
};

const attendance: AttendanceDay[] = [
  { date: '2026-06-29', label: '29 Jun Mon', checkIn: '09:04 AM', checkOut: '06:12 PM', workingHours: 8.6, late: false },
  { date: '2026-06-26', label: '26 Jun Fri', checkIn: '09:48 AM', checkOut: '06:30 PM', workingHours: 8.2, late: true },
  { date: '2026-06-25', label: '25 Jun Thu', checkIn: '09:02 AM', checkOut: '06:05 PM', workingHours: 8.5, late: false },
  { date: '2026-06-24', label: '24 Jun Wed', checkIn: '08:56 AM', checkOut: '06:20 PM', workingHours: 8.9, late: false },
  { date: '2026-06-23', label: '23 Jun Tue', checkIn: '09:15 AM', checkOut: '06:02 PM', workingHours: 8.1, late: false },
  { date: '2026-06-22', label: '22 Jun Mon', checkIn: '09:51 AM', checkOut: '06:40 PM', workingHours: 8.3, late: true },
  { date: '2026-06-19', label: '19 Jun Fri', checkIn: '09:00 AM', checkOut: '06:00 PM', workingHours: 8.5, late: false },
];

const leaveRequests: LeaveRequest[] = [
  { id: 901, type: 'Annual Leave', from: '2026-07-06', to: '2026-07-08', days: 3, status: 'pending' },
  { id: 894, type: 'Sick Leave', from: '2026-06-11', to: '2026-06-11', days: 1, status: 'approved' },
  { id: 880, type: 'Casual Leave', from: '2026-05-22', to: '2026-05-22', days: 1, status: 'approved' },
  { id: 871, type: 'Annual Leave', from: '2026-04-28', to: '2026-04-30', days: 3, status: 'rejected' },
];

const pendingPolicies: PolicyAck[] = [
  {
    ackId: 51,
    policyId: 12,
    title: 'Information Security Policy',
    category: 'IT & Security',
    policyCode: 'POL-IT-007',
    versionNumber: 'v3.1',
    effectiveDate: '2026-06-01',
  },
  {
    ackId: 52,
    policyId: 18,
    title: 'Remote Work Guidelines',
    category: 'HR',
    policyCode: 'POL-HR-014',
    versionNumber: 'v2.0',
    effectiveDate: '2026-05-15',
  },
];

const missingFields = ['Emergency contact', 'Blood group', 'LinkedIn profile'];

const logs: ActivityLog[] = [
  { id: 1, message: 'Checked in at 09:04 AM', date: '2026-06-29T09:04:00', type: 'attendance' },
  { id: 2, message: 'Leave request #901 submitted (Annual, 3 days)', date: '2026-06-28T14:22:00', type: 'leave' },
  { id: 3, message: 'Acknowledged "Code of Conduct v4.2"', date: '2026-06-25T10:11:00', type: 'policy' },
  { id: 4, message: 'IT requisition #338 approved — MacBook Pro 16"', date: '2026-06-24T16:40:00', type: 'asset' },
  { id: 5, message: 'Updated personal email address', date: '2026-06-20T11:05:00', type: 'profile' },
  { id: 6, message: 'Payslip for May 2026 generated', date: '2026-06-01T08:00:00', type: 'system' },
];

export const dashboardData: DashboardData = {
  employee,
  leaves,
  attendance,
  lateComings: 2,
  leaveRequests,
  pendingPolicies,
  missingFields,
  logs,
  pendingOfferLetterCount: 2,
  pendingLeaveApprovalCount: 4,
  pendingLifecycleApprovalCount: 1,
  pendingProbationApprovalCount: 1,
  pendingProbationDueCount: 2,
  pendingProbationApplyCount: 1,
  permissions: {
    liveCameras: true,
    employeesList: true,
    leaveApprovals: true,
    offerLetterApprovals: true,
    lifecycleApprovals: true,
    probationApprovals: true,
    probationApprovalsHr: true,
    itDashboard: true,
  },
};
