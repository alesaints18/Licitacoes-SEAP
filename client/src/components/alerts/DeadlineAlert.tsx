import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, X } from "lucide-react";
import { Process } from "@shared/schema";

interface ProcessWithDeadline extends Process {
  daysUntilDeadline: number;
  isOverdue: boolean;
}

export function DeadlineAlert() {
  const [showAlert, setShowAlert] = useState(false);
  const [processesNearDeadline, setProcessesNearDeadline] = useState<ProcessWithDeadline[]>([]);

  const { data: processes = [] } = useQuery<Process[]>({
    queryKey: ['/api/processes'],
    refetchInterval: 5 * 60 * 1000, // Verifica a cada 5 minutos
  });

  useEffect(() => {
    if (processes.length === 0) return;

    const today = new Date();
    const urgentProcesses: ProcessWithDeadline[] = [];

    processes.forEach(process => {
      if (!process.deadline || process.status === 'completed' || process.status === 'canceled') {
        return;
      }

      const deadline = new Date(process.deadline);
      const daysUntilDeadline = getBusinessDaysBetween(today, deadline);
      const isOverdue = deadline < today;

      // Alerta para processos com 3 dias ou menos para vencer, ou já vencidos
      if (daysUntilDeadline <= 3 || isOverdue) {
        urgentProcesses.push({
          ...process,
          daysUntilDeadline,
          isOverdue
        });
      }
    });

    setProcessesNearDeadline(urgentProcesses);
    
    // Mostra o popup se há processos urgentes e ainda não foi mostrado
    if (urgentProcesses.length > 0 && !showAlert) {
      setShowAlert(true);
    }
  }, [processes, showAlert]);

  // Função para calcular dias úteis entre duas datas
  const getBusinessDaysBetween = (startDate: Date, endDate: Date): number => {
    let count = 0;
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    while (current <= end) {
      if (isBusinessDay(current)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  };

  const getUrgencyColor = (process: ProcessWithDeadline) => {
    if (process.isOverdue) return "destructive";
    if (process.daysUntilDeadline <= 1) return "destructive";
    if (process.daysUntilDeadline <= 2) return "default";
    return "secondary";
  };

  const getUrgencyText = (process: ProcessWithDeadline) => {
    if (process.isOverdue) return "Vencido";
    if (process.daysUntilDeadline === 0) return "Vence hoje";
    if (process.daysUntilDeadline === 1) return "Vence amanhã";
    return `${process.daysUntilDeadline} dias`;
  };

  if (processesNearDeadline.length === 0) {
    return null;
  }

  return (
    <Dialog open={showAlert} onOpenChange={setShowAlert}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Processos com Prazo Próximo ao Vencimento
          </DialogTitle>
          <DialogDescription>
            Os seguintes processos estão próximos do prazo de vencimento ou já venceram:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {processesNearDeadline.map((process) => (
            <Alert key={process.id} className="border-l-4 border-l-amber-500">
              <Clock className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium">{process.pbdocNumber}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {process.description}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Prazo: {new Date(process.deadline!).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <Badge variant={getUrgencyColor(process)} className="ml-2">
                  {getUrgencyText(process)}
                </Badge>
              </AlertDescription>
            </Alert>
          ))}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {processesNearDeadline.length} processo{processesNearDeadline.length !== 1 ? 's' : ''} com prazo urgente
          </div>
          <Button onClick={() => setShowAlert(false)} size="sm">
            <X className="h-4 w-4 mr-1" />
            Entendi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}