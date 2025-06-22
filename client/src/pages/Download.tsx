import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Calendar } from "lucide-react";

export default function DownloadPage() {
  const handleDownloadReport = () => {
    // Create a download link for the HTML report
    const link = document.createElement('a');
    link.href = '/relatorio/Relatorio_Alteracoes_Sistema_Licitacao.html';
    link.download = 'Relatorio_Alteracoes_Sistema_Licitacao.html';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewReport = () => {
    // Open report in new tab
    window.open('/relatorio/Relatorio_Alteracoes_Sistema_Licitacao.html', '_blank');
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Downloads e Relatórios</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Relatório de Alterações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                Período: 18/06/2025 - 22/06/2025
              </div>
              
              <p className="text-sm text-gray-700">
                Relatório completo das alterações realizadas no Sistema de Controle 
                de Processos de Licitação nos últimos 5 dias, incluindo melhorias na 
                interface, novas funcionalidades e atualizações do backend.
              </p>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleViewReport}
                  variant="outline"
                  size="sm"
                >
                  Visualizar
                </Button>
                <Button 
                  onClick={handleDownloadReport}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download HTML
                </Button>
              </div>
              
              <div className="text-xs text-gray-500">
                <p><strong>Dica:</strong> Após abrir o relatório HTML, use Ctrl+P (ou Cmd+P no Mac) 
                para imprimir ou salvar como PDF diretamente do navegador.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Instruções para PDF</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div>
                <strong>Para gerar PDF:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-gray-700">
                  <li>Clique em "Visualizar" ou "Download HTML"</li>
                  <li>No navegador, pressione Ctrl+P (ou Cmd+P)</li>
                  <li>Selecione "Salvar como PDF" como destino</li>
                  <li>Configure margens e orientação se necessário</li>
                  <li>Clique em "Salvar"</li>
                </ol>
              </div>
              
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-blue-800 text-xs">
                  <strong>Recomendações:</strong><br />
                  • Use orientação retrato<br />
                  • Margens normais ou estreitas<br />
                  • Incluir gráficos de fundo para melhor aparência
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}