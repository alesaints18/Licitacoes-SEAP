import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Process, BiddingModality, ResourceSource, User, ProcessStep, Department } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FileText, Download, ArrowLeft, Printer } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getProcessStatusLabel, getProcessPriorityLabel } from "@/lib/utils/process";

interface ProcessReportProps {
  id: string;
}

const ProcessReport = ({ id }: ProcessReportProps) => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const parsedId = parseInt(id);

  // Get process details
  const { data: process, isLoading: processLoading } = useQuery<Process>({
    queryKey: [`/api/processes/${parsedId}`],
  });

  // Get modalities
  const { data: modalities } = useQuery<BiddingModality[]>({
    queryKey: ['/api/modalities'],
  });

  // Get sources
  const { data: sources } = useQuery<ResourceSource[]>({
    queryKey: ['/api/sources'],
  });

  // Get users
  const { data: users } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Get departments
  const { data: departments } = useQuery<Department[]>({
    queryKey: ['/api/departments'],
  });

  // Get process steps
  const { data: steps } = useQuery<ProcessStep[]>({
    queryKey: [`/api/processes/${parsedId}/steps`],
    enabled: !!process,
  });

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/processes/${parsedId}/report`, {
        method: 'GET',
        headers: {
          'Accept': 'text/html',
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao gerar relatório');
      }

      const htmlContent = await response.text();
      
      // Abrir uma nova janela com o conteúdo HTML para impressão
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Aguardar o carregamento e iniciar impressão
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        };
      }

      toast({
        title: "Relatório aberto",
        description: "Use Ctrl+P ou o menu de impressão para salvar como PDF"
      });
    } catch (error) {
      toast({
        title: "Erro ao gerar relatório",
        description: "Não foi possível gerar o relatório",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const printReport = () => {
    window.print();
  };

  if (processLoading) {
    return <div className="p-8 text-center">Carregando processo...</div>;
  }

  if (!process) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold mb-2">Processo não encontrado</h2>
        <Button onClick={() => setLocation("/processes")}>
          Voltar para Processos
        </Button>
      </div>
    );
  }

  const modality = modalities?.find(m => m.id === process.modalityId);
  const source = sources?.find(s => s.id === process.sourceId);
  const responsible = users?.find(u => u.id === process.responsibleId);
  const currentDepartment = departments?.find(d => d.id === process.currentDepartmentId);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header com ações */}
      <div className="flex justify-between items-center mb-6 no-print">
        <Button
          variant="outline"
          onClick={() => setLocation(`/processes/${parsedId}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Processo
        </Button>
        
        <div className="flex space-x-2">
          <Button variant="outline" onClick={printReport}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <Button onClick={generatePDF} disabled={isGenerating}>
            <Download className="h-4 w-4 mr-2" />
            {isGenerating ? "Abrindo..." : "Gerar PDF"}
          </Button>
        </div>
      </div>

      {/* Relatório imprimível */}
      <div className="bg-white print:shadow-none">
        <Card className="print:border-none print:shadow-none">
          <CardHeader className="text-center border-b">
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-gray-900">
                SEAP - Secretaria de Estado da Administração Penitenciária
              </h1>
              <p className="text-gray-600 mt-2">Relatório de Processo Licitatório</p>
            </div>
            <CardTitle className="text-xl">
              Processo Nº {process.pbdocNumber}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="pt-6">
            {/* Informações Básicas */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold mb-4 text-blue-800 border-b border-blue-200 pb-2">
                Informações Básicas
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-gray-700">Número PBDOC:</label>
                  <p className="text-gray-900">{process.pbdocNumber}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Status:</label>
                  <p className="text-gray-900">{getProcessStatusLabel(process.status)}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Modalidade:</label>
                  <p className="text-gray-900">{modality?.name || "Não informado"}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Prioridade:</label>
                  <p className="text-gray-900">{getProcessPriorityLabel(process.priority)}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Fonte de Recurso:</label>
                  <p className="text-gray-900">
                    {source ? `${source.code} - ${source.description}` : "Não informado"}
                  </p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Responsável:</label>
                  <p className="text-gray-900">{responsible?.fullName || "Não informado"}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Departamento Atual:</label>
                  <p className="text-gray-900">{currentDepartment?.name || "Não informado"}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Central de Compras:</label>
                  <p className="text-gray-900">{process.centralDeCompras || "Não informado"}</p>
                </div>
              </div>
            </section>

            <Separator className="my-6" />

            {/* Objeto */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold mb-4 text-blue-800 border-b border-blue-200 pb-2">
                Objeto
              </h2>
              <p className="text-gray-900 leading-relaxed">{process.description}</p>
            </section>

            <Separator className="my-6" />

            {/* Datas */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold mb-4 text-blue-800 border-b border-blue-200 pb-2">
                Cronograma
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="font-medium text-gray-700">Data de Criação:</label>
                  <p className="text-gray-900">
                    {format(new Date(process.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Última Atualização:</label>
                  <p className="text-gray-900">
                    {format(new Date(process.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Prazo de Entrega:</label>
                  <p className="text-gray-900">
                    {process.deadline ? format(new Date(process.deadline), "dd/MM/yyyy", { locale: ptBR }) : "Não definido"}
                  </p>
                </div>
              </div>
            </section>

            {/* Comentários de Retorno */}
            {process.returnComments && (
              <>
                <Separator className="my-6" />
                <section className="mb-8">
                  <h2 className="text-lg font-semibold mb-4 text-red-800 border-b border-red-200 pb-2">
                    Comentários de Retorno
                  </h2>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-900">{process.returnComments}</p>
                  </div>
                </section>
              </>
            )}

            {/* Histórico de Etapas */}
            {steps && steps.length > 0 && (
              <>
                <Separator className="my-6" />
                <section className="mb-8">
                  <h2 className="text-lg font-semibold mb-4 text-blue-800 border-b border-blue-200 pb-2">
                    Histórico de Etapas
                  </h2>
                  <div className="space-y-4">
                    {steps.map((step, index) => {
                      const stepDepartment = departments?.find(d => d.id === step.departmentId);
                      const completedBy = users?.find(u => u.id === step.completedBy);
                      
                      return (
                        <div key={step.id} className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-medium text-gray-900">
                              {index + 1}. {step.stepName}
                            </h3>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              step.isCompleted 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {step.isCompleted ? 'Concluída' : 'Em andamento'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p><strong>Departamento:</strong> {stepDepartment?.name || "Não informado"}</p>
                            {step.completedBy && (
                              <p><strong>Responsável:</strong> {completedBy?.fullName || "Não informado"}</p>
                            )}
                            {step.completedAt && (
                              <p><strong>Data de Conclusão:</strong> {format(new Date(step.completedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                            )}
                            {step.observations && (
                              <p><strong>Observações:</strong> {step.observations}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </>
            )}

            <Separator className="my-6" />

            {/* Footer */}
            <footer className="text-center text-sm text-gray-500 mt-8 border-t pt-4">
              <p>Relatório gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
              <p>SEAP - Secretaria de Estado da Administração Penitenciária da Paraíba</p>
            </footer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProcessReport;