import { PROCESS_STATUS, PROCESS_PRIORITY } from "../constants";

/**
 * Get the display label for a process status
 */
export function getProcessStatusLabel(status: string): string {
  switch (status) {
    case PROCESS_STATUS.DRAFT:
      return "Rascunho";
    case PROCESS_STATUS.IN_PROGRESS:
      return "Em Andamento";
    case PROCESS_STATUS.COMPLETED:
      return "Concluído";
    case PROCESS_STATUS.CANCELED:
      return "Cancelado";
    default:
      return "Desconhecido";
  }
}

/**
 * Get the display label for a process priority
 */
export function getProcessPriorityLabel(priority: string): string {
  switch (priority) {
    case PROCESS_PRIORITY.LOW:
      return "Baixa";
    case PROCESS_PRIORITY.MEDIUM:
      return "Média";
    case PROCESS_PRIORITY.HIGH:
      return "Alta";
    default:
      return "Desconhecida";
  }
}

/**
 * Get the CSS class for a process status badge
 */
export function getProcessStatusClass(status: string): string {
  switch (status) {
    case PROCESS_STATUS.DRAFT:
      return "status-badge-draft";
    case PROCESS_STATUS.IN_PROGRESS:
      return "status-badge-in_progress";
    case PROCESS_STATUS.COMPLETED:
      return "status-badge-completed";
    case PROCESS_STATUS.CANCELED:
      return "status-badge-canceled";
    default:
      return "";
  }
}

/**
 * Get the CSS class for a process priority badge
 */
export function getProcessPriorityClass(priority: string): string {
  switch (priority) {
    case PROCESS_PRIORITY.LOW:
      return "priority-badge-low";
    case PROCESS_PRIORITY.MEDIUM:
      return "priority-badge-medium";
    case PROCESS_PRIORITY.HIGH:
      return "priority-badge-high";
    default:
      return "";
  }
}

/**
 * Check if a process is editable
 * Only draft and in_progress processes can be edited
 */
export function isProcessEditable(status: string): boolean {
  return status === PROCESS_STATUS.DRAFT || status === PROCESS_STATUS.IN_PROGRESS;
}

/**
 * Check if a process can be deleted
 * Only draft processes can be deleted
 */
export function isProcessDeletable(status: string): boolean {
  return status === PROCESS_STATUS.DRAFT;
}

/**
 * Calculate the completion percentage of a process based on steps
 */
export function calculateProcessCompletion(
  totalSteps: number, 
  completedSteps: number
): number {
  if (totalSteps === 0) return 0;
  return Math.round((completedSteps / totalSteps) * 100);
}

/**
 * Format the process number with leading zeros
 */
export function formatProcessNumber(number: number): string {
  return number.toString().padStart(5, '0');
}

/**
 * Generate a PBDOC number based on year and sequential number
 */
export function generatePBDOCNumber(year: number, sequential: number): string {
  return `PB-${year}-${formatProcessNumber(sequential)}`;
}
