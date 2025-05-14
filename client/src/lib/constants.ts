// Process statuses
export const PROCESS_STATUS = {
  DRAFT: "draft",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELED: "canceled"
} as const;

// Process priorities
export const PROCESS_PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high"
} as const;

// User roles
export const USER_ROLE = {
  COMMON: "common",
  ADMIN: "admin"
} as const;

// File types for exports
export const FILE_TYPE = {
  PDF: "pdf",
  EXCEL: "xlsx"
} as const;

// Months names for reports and filters
export const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro"
];

// Chart colors for reports
export const CHART_COLORS = {
  PRIMARY: "#0066cc",
  SUCCESS: "#4CAF50",
  WARNING: "#FFC107",
  DANGER: "#D32F2F",
  INFO: "#2196F3",
  PURPLE: "#9C27B0",
  PINK: "#E91E63",
  ORANGE: "#FF9800",
  GRAY: "#9E9E9E"
};

// Table pagination options
export const PAGINATION_OPTIONS = [10, 20, 30, 50, 100];

// Default route after login
export const DEFAULT_ROUTE = "/";

// Date format options
export const DATE_FORMAT = {
  FULL: "dd 'de' MMMM 'de' yyyy",
  SHORT: "dd/MM/yyyy",
  WITH_TIME: "dd/MM/yyyy HH:mm",
  ISO: "yyyy-MM-dd"
};
