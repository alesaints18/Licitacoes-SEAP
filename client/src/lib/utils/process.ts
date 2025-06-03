// Utilitários para formatação e manipulação de dados de processos

export function getProcessStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    draft: "Rascunho",
    in_progress: "Em Andamento",
    completed: "Concluído",
    canceled: "Cancelado",
    overdue: "Atrasado"
  };
  
  return statusMap[status] || status;
}

export function getProcessPriorityLabel(priority: string): string {
  const priorityMap: Record<string, string> = {
    low: "Baixa",
    medium: "Média",
    high: "Alta"
  };
  
  return priorityMap[priority] || priority;
}

export function getProcessStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    draft: "text-gray-600 bg-gray-100",
    in_progress: "text-blue-600 bg-blue-100",
    completed: "text-green-600 bg-green-100",
    canceled: "text-red-600 bg-red-100",
    overdue: "text-orange-600 bg-orange-100"
  };
  
  return colorMap[status] || "text-gray-600 bg-gray-100";
}

export function getProcessPriorityColor(priority: string): string {
  const colorMap: Record<string, string> = {
    low: "text-green-600 bg-green-100",
    medium: "text-yellow-600 bg-yellow-100",
    high: "text-red-600 bg-red-100"
  };
  
  return colorMap[priority] || "text-gray-600 bg-gray-100";
}

export function formatProcessNumber(pbdocNumber: string): string {
  // Formatar número do processo se necessário
  return pbdocNumber.toUpperCase();
}

export function calculateProcessDuration(createdAt: string | Date, completedAt?: string | Date | null): string {
  const start = new Date(createdAt);
  const end = completedAt ? new Date(completedAt) : new Date();
  
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) {
    return "1 dia";
  } else if (diffDays < 30) {
    return `${diffDays} dias`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    const remainingDays = diffDays % 30;
    if (remainingDays === 0) {
      return months === 1 ? "1 mês" : `${months} meses`;
    } else {
      return `${months} ${months === 1 ? 'mês' : 'meses'} e ${remainingDays} ${remainingDays === 1 ? 'dia' : 'dias'}`;
    }
  } else {
    const years = Math.floor(diffDays / 365);
    const remainingDays = diffDays % 365;
    if (remainingDays === 0) {
      return years === 1 ? "1 ano" : `${years} anos`;
    } else {
      return `${years} ${years === 1 ? 'ano' : 'anos'} e ${remainingDays} ${remainingDays === 1 ? 'dia' : 'dias'}`;
    }
  }
}

export function isProcessOverdue(deadline: string | Date | null): boolean {
  if (!deadline) return false;
  
  const deadlineDate = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day
  deadlineDate.setHours(0, 0, 0, 0);
  
  return deadlineDate < today;
}

export function getDaysUntilDeadline(deadline: string | Date | null): number | null {
  if (!deadline) return null;
  
  const deadlineDate = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadlineDate.setHours(0, 0, 0, 0);
  
  const diffTime = deadlineDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function formatDeadlineWarning(deadline: string | Date | null): { message: string; color: string } | null {
  const days = getDaysUntilDeadline(deadline);
  
  if (days === null) return null;
  
  if (days < 0) {
    return {
      message: `Atrasado há ${Math.abs(days)} ${Math.abs(days) === 1 ? 'dia' : 'dias'}`,
      color: "text-red-600"
    };
  } else if (days === 0) {
    return {
      message: "Vence hoje",
      color: "text-orange-600"
    };
  } else if (days <= 3) {
    return {
      message: `Vence em ${days} ${days === 1 ? 'dia' : 'dias'}`,
      color: "text-yellow-600"
    };
  } else {
    return {
      message: `${days} ${days === 1 ? 'dia' : 'dias'} restantes`,
      color: "text-green-600"
    };
  }
}