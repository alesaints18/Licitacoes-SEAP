import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Calendar, User } from "lucide-react";

const ReportDownloads = () => {
  const handleDownload = (filename: string, reportName: string) => {
    // Criar elemento de link temporário para download
    const link = document.createElement('a');
    link.href = `/${filename}`;
    link.download = filename;
    link.target = '_blank';
    
    // Adicionar ao DOM, clicar e remover
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log(`📥 Download iniciado: ${reportName}`);
  };

  const reports = [
    {
      id: 1,
      title: "Relatório Simples de Modificações",
      description: "Resumo das principais modificações implementadas no sistema",
      filename: "relatorio-modificacoes-sistema.pdf",
      size: "9.6 KB",
      pages: "3 páginas",
      type: "Resumo Executivo"
    },
    {
      id: 2,
      title: "Relatório Detalhado de Modificações",
      description: "Documentação técnica completa com 11 seções detalhadas",
      filename: "relatorio-detalhado-modificacoes-sistema.pdf",
      size: "30.3 KB", 
      pages: "15+ páginas",
      type: "Documentação Técnica"
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2 mb-8">
        <FileText className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Downloads de Relatórios
          </h1>
          <p className="text-gray-600 mt-2">
            Baixe os relatórios de modificações do sistema
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {reports.map((report) => (
          <Card key={report.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-blue-600" />
                {report.title}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                {report.description}
              </p>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">
                    {new Date().toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Sistema</span>
                </div>
              </div>

              <div className="flex justify-between items-center py-2 border-t">
                <div className="text-sm text-gray-600">
                  <div>Tamanho: <span className="font-medium">{report.size}</span></div>
                  <div>Extensão: <span className="font-medium">{report.pages}</span></div>
                  <div>Tipo: <span className="font-medium">{report.type}</span></div>
                </div>
              </div>

              <Button 
                onClick={() => handleDownload(report.filename, report.title)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar PDF
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">Sobre os Relatórios</h3>
            <p className="text-sm text-blue-700 mt-1">
              Os relatórios documentam as modificações implementadas na funcionalidade 
              "Autorizar Emissão de R.O", incluindo implementação de modal de decisão 
              e criação automática de etapas subsequentes.
            </p>
            <div className="mt-3 text-sm text-blue-600">
              <div>• <strong>Relatório Simples:</strong> Visão geral e resumo executivo</div>
              <div>• <strong>Relatório Detalhado:</strong> Documentação técnica completa com código e métricas</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportDownloads;