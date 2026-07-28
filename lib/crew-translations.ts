import type { CrewLang } from './crew-language';

/**
 * UI copy for the crew nav + "Today"/"Your dashboard" pages, in English and
 * Vietnamese. Deeper data views (PTO history, full KPI charts, admin tools)
 * aren't wired up to this yet — start here, extend page-by-page as needed.
 */

type NavT = {
  status: string;
  pto: string;
  kpi: string;
  admin: string;
  signOut: string;
};

type StatusPageT = {
  title: string;
  subtitle: string;
};

type StatusChartT = {
  updatedAt: (time: string) => string;
  refreshNow: string;
  refreshing: string;
  loadError: string;
  refreshError: string;
  loading: string;
  noCrewMembers: string;
  statusOut: string;
  statusWfh: string;
  statusInStudio: string;
  employmentFullTime: string;
  employmentPartTime: string;
  employmentContractor: string;
};

type DashboardT = {
  title: string;
  welcomeBack: (firstName: string) => string;
  fullKpiHistory: string;
  ptoAvailable: string;
  dayUnit: (n: number) => string;
  requestPto: string;
  thisMonthKpi: string;
  quality3mo: string;
  collaboration3mo: string;
  noRatings3mo: string;
  past3MonthsPerformance: string;
  totalKpiByMonth: string;
  noKpiDataYet: string;
  couldNotLoad: string;
};

type KpiPageT = {
  title: string;
  subtitle: string;
  syncedFromAsana: string;
  refreshNow: string;
  refreshing: string;
  loadError: string;
  refreshError: string;
  loading: string;
  noDataTitle: string;
  noDataBody: (email: string | null) => string;
  ytdScore: string;
  ytdTasks: string;
  thisMonth: string;
  lastMonth: string;
  fteNote: (hours: number, fte: string) => string;
  past3Months: string;
  past3MonthsSub: string;
  performanceOverTime: string;
  performanceOverTimeSub: string;
  qualityCollabTitle: string;
  qualityCollabSub: string;
  qualityRating: string;
  collaborationRating: string;
  last3Months: string;
  rated: string;
  noRatingsWindow: string;
  noScoredTasksYet: string;
  noScoredTasksYtd: string;
  flatVsLastMonth: string;
  vsLastMonth: string;
};

type PtoPageT = {
  title: string;
  subtitle: string;
  newRequest: string;
  balanceLoadError: string;
  dayAvailable: (n: number) => string;
  entitledTo: (entitlementDays: number | null) => string;
  typePto: string;
  typeWfh: string;
  historyLoading: string;
  historyEmpty: string;
  historyLoadError: string;
  noteLabel: string;
  statusApproved: string;
  statusRejected: string;
  statusPending: string;
  newRequestTitle: string;
  newRequestSubtitle: string;
  formTypeLabel: string;
  formHaveAvailable: (n: number) => string;
  formLoadingBalance: string;
  formStartDate: string;
  formEndDate: string;
  formNoteOptional: string;
  formNotePlaceholder: string;
  formRequestingDays: (n: number) => string;
  formOverdraftWarning: (requested: number, balance: number) => string;
  formSubmit: string;
  formSubmitting: string;
  formSubmitError: string;
  formSubmitErrorRetry: string;
  deleteButton: string;
  deleteConfirm: string;
  deleteConfirmYes: string;
  deleteConfirmCancel: string;
  deleteError: string;
};

type CrewTranslations = {
  nav: NavT;
  statusPage: StatusPageT;
  statusChart: StatusChartT;
  dashboard: DashboardT;
  kpiPage: KpiPageT;
  ptoPage: PtoPageT;
};

export const crewT: Record<CrewLang, CrewTranslations> = {
  en: {
    nav: {
      status: 'Status',
      pto: 'PTO / WFH',
      kpi: 'KPI',
      admin: 'Admin',
      signOut: 'Sign out',
    },
    statusPage: {
      title: 'Today',
      subtitle: "Who's in, out, or working from home today.",
    },
    statusChart: {
      updatedAt: (time) => `Updated ${time}`,
      refreshNow: 'Refresh now',
      refreshing: 'Refreshing…',
      loadError: 'Could not load today\u2019s status.',
      refreshError: 'Refresh failed.',
      loading: "Loading today's status…",
      noCrewMembers: 'No crew members set up yet — add them in /admin/crew.',
      statusOut: 'Out',
      statusWfh: 'WFH',
      statusInStudio: 'In studio',
      employmentFullTime: 'Full-time',
      employmentPartTime: 'Part-time',
      employmentContractor: 'Contractor',
    },
    dashboard: {
      title: 'Your dashboard',
      welcomeBack: (firstName) => `Welcome to your dashboard, ${firstName}`,
      fullKpiHistory: 'Full KPI history →',
      ptoAvailable: 'PTO available',
      dayUnit: (n) => (n === 1 ? 'day' : 'days'),
      requestPto: 'Request PTO / WFH',
      thisMonthKpi: 'This month KPI',
      quality3mo: 'Quality (3mo)',
      collaboration3mo: 'Collaboration (3mo)',
      noRatings3mo: 'No ratings last 3 months',
      past3MonthsPerformance: 'Past 3 months performance',
      totalKpiByMonth: 'Total KPI score by month.',
      noKpiDataYet: 'No KPI data yet — check back once scored tasks are assigned to you in Asana.',
      couldNotLoad: 'Could not load your dashboard.',
    },
    kpiPage: {
      title: 'KPI',
      subtitle: 'Your performance metrics, pulled straight from Asana.',
      syncedFromAsana: 'Synced from the 🐸 Anim8 KPI project in Asana · refreshes every 6 hours.',
      refreshNow: 'Refresh now',
      refreshing: 'Refreshing…',
      loadError: 'Could not load your KPI data.',
      refreshError: 'Refresh failed.',
      loading: 'Loading your KPI data…',
      noDataTitle: 'No KPI data found yet',
      noDataBody: (email) =>
        `We couldn't find any scored tasks assigned to ${email ?? 'your account'} in the 🐸 Anim8 KPI project. Ask your producer to confirm tasks are assigned to that email in Asana, or check back once some tasks have a "Total KPI Score" set.`,
      ytdScore: 'YTD KPI score',
      ytdTasks: 'YTD scored tasks',
      thisMonth: 'This month',
      lastMonth: 'Last month',
      fteNote: (hours, fte) =>
        `Scores are FTE-normalized for your ${hours}h/week schedule (FTE ${fte}) — Effort & Delivery are scaled to a 40h week so bands match full-time peers. Quality, Collaboration, and R&D are not scaled.`,
      past3Months: 'Past 3 months performance',
      past3MonthsSub: 'Total KPI score by month.',
      performanceOverTime: 'Performance over time',
      performanceOverTimeSub: 'Total KPI score by month — year to date.',
      qualityCollabTitle: 'Quality & collaboration ratings',
      qualityCollabSub: 'How your scored tasks were rated over the last 3 months.',
      qualityRating: 'Quality rating',
      collaborationRating: 'Collaboration rating',
      last3Months: 'Last 3 months',
      rated: 'rated',
      noRatingsWindow: 'No ratings logged in this window yet.',
      noScoredTasksYet: 'No scored tasks logged yet.',
      noScoredTasksYtd: 'No scored tasks logged yet this year.',
      flatVsLastMonth: '— flat vs last month',
      vsLastMonth: 'vs last month',
    },
    ptoPage: {
      title: 'PTO / WFH',
      subtitle: 'Requests need admin approval before they show on the calendar and status chart.',
      newRequest: 'New request',
      balanceLoadError: 'Could not load your PTO balance.',
      dayAvailable: (n) => `day${n === 1 ? '' : 's'} available`,
      entitledTo: (entitlementDays) =>
        `Entitled to ${entitlementDays ?? '—'}/year · accrues monthly (Handbook 3.7)`,
      typePto: 'Time off',
      typeWfh: 'Work from home',
      historyLoading: 'Loading your requests…',
      historyEmpty: "You haven't submitted any requests yet.",
      historyLoadError: 'Could not load your requests.',
      noteLabel: 'Note',
      statusApproved: 'Approved',
      statusRejected: 'Rejected',
      statusPending: 'Pending',
      newRequestTitle: 'New PTO / WFH request',
      newRequestSubtitle:
        "Submit a request — an admin will approve or reject it, and it'll sync to the team calendar.",
      formTypeLabel: 'Type',
      formHaveAvailable: (n) => `You have ${n} day${n === 1 ? '' : 's'} available`,
      formLoadingBalance: 'Loading your available balance…',
      formStartDate: 'Start date',
      formEndDate: 'End date',
      formNoteOptional: 'Note (optional)',
      formNotePlaceholder: 'Anything your admin should know…',
      formRequestingDays: (n) => `Requesting ${n} working day${n === 1 ? '' : 's'}`,
      formOverdraftWarning: (requested, balance) =>
        `⚠ This request is for ${requested} days, more than your ${balance} day${
          balance === 1 ? '' : 's'
        } available. You can still submit it — your admin will review it — but it will take your balance negative if approved as-is.`,
      formSubmit: 'Submit request',
      formSubmitting: 'Submitting…',
      formSubmitError: 'Could not submit request.',
      formSubmitErrorRetry: 'Could not submit request. Please try again.',
      deleteButton: 'Delete',
      deleteConfirm: 'Delete this record? This cannot be undone.',
      deleteConfirmYes: 'Yes, delete',
      deleteConfirmCancel: 'Cancel',
      deleteError: 'Could not delete this request.',
    },
  },
  vn: {
    nav: {
      status: 'Trạng thái',
      pto: 'Nghỉ phép / WFH',
      kpi: 'KPI',
      admin: 'Quản trị',
      signOut: 'Đăng xuất',
    },
    statusPage: {
      title: 'Hôm nay',
      subtitle: 'Ai đang ở studio, vắng mặt, hay làm việc tại nhà hôm nay.',
    },
    statusChart: {
      updatedAt: (time) => `Cập nhật lúc ${time}`,
      refreshNow: 'Làm mới',
      refreshing: 'Đang làm mới…',
      loadError: 'Không thể tải trạng thái hôm nay.',
      refreshError: 'Làm mới không thành công.',
      loading: 'Đang tải trạng thái hôm nay…',
      noCrewMembers: 'Chưa có thành viên nào được thiết lập — hãy thêm trong /admin/crew.',
      statusOut: 'Vắng mặt',
      statusWfh: 'Làm tại nhà',
      statusInStudio: 'Tại studio',
      employmentFullTime: 'Toàn thời gian',
      employmentPartTime: 'Bán thời gian',
      employmentContractor: 'Cộng tác viên',
    },
    dashboard: {
      title: 'Bảng tin của bạn',
      welcomeBack: (firstName) => `Chào ${firstName}, đây là bảng tin của bạn`,
      fullKpiHistory: 'Xem đầy đủ lịch sử KPI →',
      ptoAvailable: 'Ngày nghỉ còn lại',
      dayUnit: () => 'ngày',
      requestPto: 'Yêu cầu nghỉ phép / WFH',
      thisMonthKpi: 'KPI tháng này',
      quality3mo: 'Chất lượng (3 tháng)',
      collaboration3mo: 'Phối hợp (3 tháng)',
      noRatings3mo: 'Chưa có đánh giá trong 3 tháng qua',
      past3MonthsPerformance: 'Hiệu suất 3 tháng qua',
      totalKpiByMonth: 'Điểm KPI tổng theo tháng.',
      noKpiDataYet: 'Chưa có dữ liệu KPI — hãy kiểm tra lại khi có công việc được chấm điểm trên Asana.',
      couldNotLoad: 'Không thể tải bảng tin của bạn.',
    },
    kpiPage: {
      title: 'KPI',
      subtitle: 'Chỉ số hiệu suất của bạn, lấy trực tiếp từ Asana.',
      syncedFromAsana: 'Đồng bộ từ dự án 🐸 Anim8 KPI trên Asana · làm mới mỗi 6 giờ.',
      refreshNow: 'Làm mới',
      refreshing: 'Đang làm mới…',
      loadError: 'Không thể tải dữ liệu KPI của bạn.',
      refreshError: 'Làm mới không thành công.',
      loading: 'Đang tải dữ liệu KPI…',
      noDataTitle: 'Chưa có dữ liệu KPI',
      noDataBody: (email) =>
        `Không tìm thấy công việc đã chấm điểm gán cho ${email ?? 'tài khoản của bạn'} trong dự án 🐸 Anim8 KPI. Hãy nhờ producer xác nhận task được gán đúng email trên Asana, hoặc quay lại khi đã có "Total KPI Score".`,
      ytdScore: 'Điểm KPI cả năm',
      ytdTasks: 'Số task đã chấm (cả năm)',
      thisMonth: 'Tháng này',
      lastMonth: 'Tháng trước',
      fteNote: (hours, fte) =>
        `Điểm đã chuẩn hóa FTE theo lịch ${hours} giờ/tuần của bạn (FTE ${fte}) — Effort & Delivery được quy về tuần 40 giờ để cùng thang với full-time. Quality, Collaboration và R&D không bị nhân.`,
      past3Months: 'Hiệu suất 3 tháng qua',
      past3MonthsSub: 'Tổng điểm KPI theo tháng.',
      performanceOverTime: 'Hiệu suất theo thời gian',
      performanceOverTimeSub: 'Tổng điểm KPI theo tháng — từ đầu năm đến nay.',
      qualityCollabTitle: 'Đánh giá chất lượng & phối hợp',
      qualityCollabSub: 'Cách các task của bạn được đánh giá trong 3 tháng qua.',
      qualityRating: 'Đánh giá chất lượng',
      collaborationRating: 'Đánh giá phối hợp',
      last3Months: '3 tháng qua',
      rated: 'đã đánh giá',
      noRatingsWindow: 'Chưa có đánh giá trong khoảng thời gian này.',
      noScoredTasksYet: 'Chưa có task nào được chấm điểm.',
      noScoredTasksYtd: 'Chưa có task nào được chấm điểm trong năm nay.',
      flatVsLastMonth: '— không đổi so với tháng trước',
      vsLastMonth: 'so với tháng trước',
    },
    ptoPage: {
      title: 'Nghỉ phép / WFH',
      subtitle: 'Yêu cầu cần được admin duyệt trước khi hiển thị trên lịch và bảng trạng thái.',
      newRequest: 'Tạo yêu cầu',
      balanceLoadError: 'Không thể tải số ngày nghỉ phép của bạn.',
      dayAvailable: () => 'ngày còn lại',
      entitledTo: (entitlementDays) =>
        `Được cấp ${entitlementDays ?? '—'} ngày/năm · tích lũy theo tháng (Handbook 3.7)`,
      typePto: 'Nghỉ phép',
      typeWfh: 'Làm việc tại nhà',
      historyLoading: 'Đang tải yêu cầu của bạn…',
      historyEmpty: 'Bạn chưa gửi yêu cầu nào.',
      historyLoadError: 'Không thể tải yêu cầu của bạn.',
      noteLabel: 'Ghi chú',
      statusApproved: 'Đã duyệt',
      statusRejected: 'Đã từ chối',
      statusPending: 'Đang chờ',
      newRequestTitle: 'Yêu cầu nghỉ phép / WFH mới',
      newRequestSubtitle:
        'Gửi yêu cầu — admin sẽ duyệt hoặc từ chối, và yêu cầu sẽ được đồng bộ vào lịch của nhóm.',
      formTypeLabel: 'Loại',
      formHaveAvailable: (n) => `Bạn còn ${n} ngày nghỉ`,
      formLoadingBalance: 'Đang tải số ngày nghỉ khả dụng…',
      formStartDate: 'Ngày bắt đầu',
      formEndDate: 'Ngày kết thúc',
      formNoteOptional: 'Ghi chú (không bắt buộc)',
      formNotePlaceholder: 'Điều gì admin cần biết…',
      formRequestingDays: (n) => `Yêu cầu ${n} ngày làm việc`,
      formOverdraftWarning: (requested, balance) =>
        `⚠ Yêu cầu này là ${requested} ngày, nhiều hơn ${balance} ngày còn lại của bạn. Bạn vẫn có thể gửi — admin sẽ xem xét — nhưng nếu được duyệt, số ngày nghỉ của bạn sẽ bị âm.`,
      formSubmit: 'Gửi yêu cầu',
      formSubmitting: 'Đang gửi…',
      formSubmitError: 'Không thể gửi yêu cầu.',
      formSubmitErrorRetry: 'Không thể gửi yêu cầu. Vui lòng thử lại.',
      deleteButton: 'Xóa',
      deleteConfirm: 'Xóa bản ghi này? Không thể hoàn tác.',
      deleteConfirmYes: 'Có, xóa',
      deleteConfirmCancel: 'Hủy',
      deleteError: 'Không thể xóa yêu cầu này.',
    },
  },
};
