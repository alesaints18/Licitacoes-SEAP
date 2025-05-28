import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileText, Calendar, Building2 } from 'lucide-react';

const ReportExport = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const reportContent = `
# RELATÓRIO DE DESENVOLVIMENTO - SISTEMA DE CONTROLE DE PROCESSOS DE LICITAÇÃO
**Período:** 26/05/2025 - 28/05/2025  
**Cliente:** Secretaria de Estado da Administração Penitenciária - PB  
**Sistema:** Controle de Processos de Licitação Web

## RESUMO EXECUTIVO

Durante o período de 26 a 28 de maio de 2025, foram realizadas implementações significativas no sistema de controle de processos de licitação, focando em:
- Correções críticas de visibilidade por departamento
- Otimização da interface de usuário
- Implementação de controles de acesso administrativo
- Limpeza e otimização do sistema para produção

## PRINCIPAIS IMPLEMENTAÇÕES REALIZADAS

### ✅ CORREÇÃO CRÍTICA DE VISIBILIDADE POR DEPARTAMENTO
- Implementação de filtro duplo de segurança por departamento
- Mapeamento correto de departamentos incluindo "Divisão de Licitação"
- Validação crítica para prevenir falhas após deploy
- Administradores agora têm acesso total a todos os processos
- Usuários comuns mantêm visibilidade restrita ao seu departamento

### ✅ CONTROLE DE ACESSO ADMINISTRATIVO
- Administradores visualizam todos os processos sem restrição de departamento
- Usuários comuns mantêm acesso restrito ao departamento atual
- Dupla validação de segurança para garantir integridade dos dados

### ✅ OTIMIZAÇÃO DO SISTEMA PARA PRODUÇÃO
- Removidos logs excessivos de autenticação
- Eliminados logs de serialização/deserialização
- Sistema funciona silenciosamente em produção
- Mantidos apenas logs essenciais para debugging

### ✅ MELHORIAS NA INTERFACE DE USUÁRIO
- Visualização clara de processos por departamento
- Filtragem automática baseada no usuário logado
- Interface responsiva e limpa

## FUNCIONALIDADES PRINCIPAIS DO SISTEMA

### 1. Gestão de Processos
✅ Criação, edição e exclusão de processos
✅ Controle de status (Draft, Em Andamento, Concluído, Cancelado)
✅ Transferência entre departamentos
✅ Sistema de checklist por fase

### 2. Controle de Acesso
✅ Autenticação com Passport.js
✅ Roles (Admin/Comum)
✅ Visibilidade por departamento
✅ Aprovação de novos usuários por admin

### 3. Relatórios e Analytics
✅ Dashboard com gráficos em tempo real
✅ Estatísticas por fonte de recursos
✅ Análise por responsável
✅ Exportação em PDF

### 4. Fluxo de Licitação
✅ Visualização do fluxograma oficial
✅ Checklist por fase do processo
✅ Transferência automática entre departamentos
✅ Controle de prazos e deadlines

## TECNOLOGIAS UTILIZADAS

### Backend
- Node.js com TypeScript
- Express.js para API REST
- Passport.js para autenticação
- PostgreSQL com Drizzle ORM
- WebSocket para comunicação em tempo real

### Frontend
- React com TypeScript
- Vite para build e desenvolvimento
- TailwindCSS + shadcn/ui para interface
- React Query para gerenciamento de estado
- Wouter para roteamento

## RESULTADOS ALCANÇADOS

✅ **Funcionalidade** - Sistema totalmente funcional com visibilidade por departamento
✅ **Segurança** - Controle de acesso robusto
✅ **Performance** - Sistema otimizado para produção
✅ **Usabilidade** - Interface intuitiva e limpa

## CONCLUSÃO

O sistema de controle de processos de licitação foi significativamente aprimorado durante o período analisado. As principais correções de segurança e visibilidade por departamento foram implementadas com sucesso.

**Data do Relatório:** 28/05/2025  
**Status:** Concluído com Sucesso ✅
`;

  const handlePrintReport = () => {
    setIsGenerating(true);
    
    // Cria uma nova janela para impressão
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Relatório de Desenvolvimento - Sistema de Licitação</title>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              margin: 40px;
              color: #333;
            }
            h1 {
              color: #1e40af;
              border-bottom: 3px solid #1e40af;
              padding-bottom: 10px;
              font-size: 28px;
            }
            h2 {
              color: #1e40af;
              margin-top: 30px;
              font-size: 22px;
            }
            h3 {
              color: #374151;
              margin-top: 25px;
              font-size: 18px;
            }
            .check-item {
              color: #059669;
              font-weight: bold;
            }
            @media print {
              body { margin: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${reportContent
            .replace(/# (.*)/g, '<h1>$1</h1>')
            .replace(/## (.*)/g, '<h2>$1</h2>')
            .replace(/### (.*)/g, '<h3>$1</h3>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/✅/g, '<span class="check-item">✅</span>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/^(.*)$/, '<p>$1</p>')
          }
          <div class="no-print" style="margin-top: 40px;">
            <button onclick="window.print()" style="background: #1e40af; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">
              Imprimir / Salvar como PDF
            </button>
            <button onclick="window.close()" style="background: #6b7280; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
              Fechar
            </button>
          </div>
        </body>
        </html>
      `);
      
      printWindow.document.close();
      
      // Auto-imprime após 1 segundo
      setTimeout(() => {
        printWindow.print();
        setIsGenerating(false);
      }, 1000);
    } else {
      setIsGenerating(false);
      alert('Erro ao abrir janela de impressão. Verifique se o bloqueador de pop-ups está desabilitado.');
    }
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([reportContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'RELATORIO_DESENVOLVIMENTO_26-28_MAI_2025.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Exportar Relatório de Desenvolvimento
        </h1>
        <p className="text-gray-600">
          Relatório completo das implementações realizadas no período de 26-28/05/2025
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Informações do Relatório
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm">Período: 26/05/2025 - 28/05/2025</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-500" />
              <span className="text-sm">SEAP-PB</span>
            </div>
            <div className="text-sm text-gray-600">
              <strong>Principais implementações:</strong>
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li>Correção de visibilidade por departamento</li>
                <li>Controle de acesso administrativo</li>
                <li>Otimização para produção</li>
                <li>Melhorias na interface</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Opções de Exportação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handlePrintReport}
              disabled={isGenerating}
              className="w-full"
              size="lg"
            >
              <Download className="mr-2 h-4 w-4" />
              {isGenerating ? 'Gerando PDF...' : 'Gerar PDF (Imprimir)'}
            </Button>
            
            <Button 
              onClick={handleDownloadMarkdown}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <FileText className="mr-2 h-4 w-4" />
              Download Markdown
            </Button>
            
            <div className="text-xs text-gray-500 mt-4">
              <p><strong>PDF:</strong> Abre janela de impressão do navegador onde você pode salvar como PDF</p>
              <p><strong>Markdown:</strong> Baixa o arquivo fonte em formato .md</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pré-visualização do Relatório</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-6 rounded-lg max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm font-mono">
              {reportContent.substring(0, 1000)}...
            </pre>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Mostrando primeiros 1000 caracteres. O relatório completo será exportado.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportExport;