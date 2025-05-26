import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Process } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { differenceInDays } from "date-fns";
import { Link } from "wouter";
import { AlertCircle } from "lucide-react";

export function DeadlineAlert() {
  const { toast } = useToast();
  const [alertShown, setAlertShown] = useState(false);

  // Buscar processos
  const { data: processes } = useQuery<Process[]>({
    queryKey: ["/api/processes"],
    enabled: !alertShown, // Não buscar novamente após mostrar o alerta
  });

  useEffect(() => {
    if (processes && processes.length > 0 && !alertShown) {
      // Filtrar processos com prazo de 5 dias ou menos e que não estejam concluídos ou cancelados
      const urgentProcesses = processes.filter((process) => {
        if (
          !process.deadline ||
          process.status === "completed" ||
          process.status === "canceled"
        ) {
          return false;
        }

        const deadlineDate = new Date(process.deadline);
        const today = new Date();
        const daysRemaining = differenceInDays(deadlineDate, today);

        return daysRemaining <= 5 && daysRemaining >= 0;
      });

      if (urgentProcesses.length > 0) {
        // Mostrar alerta para cada processo urgente (limitado a 3 para não sobrecarregar)
        const processesToShow = urgentProcesses.slice(0, 3);

        processesToShow.forEach((process) => {
          const deadlineDate = new Date(process.deadline!);
          const today = new Date();
          const daysRemaining = differenceInDays(deadlineDate, today);

          toast({
            title: "Alerta de Prazo",
            description: (
              <div className="flex flex-col space-y-2">
                <p>
                  O processo{" "}
                  <span className="font-semibold">{process.pbdocNumber}</span>{" "}
                  tem prazo de expiração em{" "}
                  <span className="font-bold text-crimson">
                    {daysRemaining === 0 ? "hoje" : `${daysRemaining} dias`}
                  </span>
                  .
                </p>
                <Link
                  href={`/processes/${process.id}`}
                  className="underline text-primary hover:text-primary/80"
                >
                  Clique para visualizar o processo
                </Link>
              </div>
            ),
            variant: "default",
            className:
              "bg-rose-100 border-rose-300 text-rose-800 bg-opacity-80",
            duration: 8000,
          });
        });

        // Se tiver mais processos do que os mostrados
        if (urgentProcesses.length > processesToShow.length) {
          toast({
            title: "Mais Alertas de Prazo",
            description: `Há mais ${urgentProcesses.length - processesToShow.length} processos com prazos próximos do vencimento.`,
            variant: "default",
            className: "bg-rose-50 border-rose-200 text-rose-700 bg-opacity-90",
            duration: 5000,
          });
        }

        setAlertShown(true);
      }
    }
  }, [processes, toast, alertShown]);

  return null; // Componente não renderiza nada visualmente
}
