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
};

type DashboardT = {
  title: string;
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

type CrewTranslations = {
  nav: NavT;
  statusPage: StatusPageT;
  statusChart: StatusChartT;
  dashboard: DashboardT;
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
    },
    dashboard: {
      title: 'Your dashboard',
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
    },
    dashboard: {
      title: 'Bảng tin của bạn',
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
  },
};
