import fs from 'fs';
import htmlPdf from 'html-pdf-node';

async function exportReportToPDF() {
  try {
    // Lê o conteúdo do relatório markdown
    const markdownContent = fs.readFileSync('RELATORIO_DESENVOLVIMENTO_26-28_MAI_2025.md', 'utf8');
    
    // Converte markdown para HTML com estilos profissionais
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Relatório de Desenvolvimento - Sistema de Licitação</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 40px;
      color: #1f2937;
      background: white;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #1e40af;
      padding-bottom: 30px;
      margin-bottom: 40px;
    }
    h1 {
      color: #1e40af;
      font-size: 32px;
      margin: 0;
      font-weight: 700;
    }
    .subtitle {
      color: #6b7280;
      font-size: 18px;
      margin-top: 10px;
    }
    h2 {
      color: #1e40af;
      font-size: 24px;
      margin-top: 40px;
      margin-bottom: 20px;
      border-left: 4px solid #1e40af;
      padding-left: 15px;
    }
    h3 {
      color: #374151;
      font-size: 20px;
      margin-top: 30px;
      margin-bottom: 15px;
    }
    .info-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 25px;
      margin: 25px 0;
    }
    .success-box {
      background: #f0fdf4;
      border-left: 5px solid #22c55e;
      padding: 20px;
      margin: 20px 0;
    }
    .code-block {
      background: #1f2937;
      color: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 13px;
      margin: 15px 0;
      overflow-x: auto;
    }
    .check-item {
      color: #059669;
      font-weight: 600;
      margin: 8px 0;
    }
    .tech-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    .tech-item {
      background: #f1f5f9;
      padding: 15px;
      border-radius: 6px;
      border-left: 3px solid #3b82f6;
    }
    .section {
      margin: 40px 0;
      page-break-inside: avoid;
    }
    .footer {
      margin-top: 60px;
      text-align: center;
      padding-top: 30px;
      border-top: 2px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
    .highlight {
      background: #fef3c7;
      padding: 2px 6px;
      border-radius: 4px;
    }
    ul {
      list-style-type: none;
      padding-left: 0;
    }
    li {
      margin: 10px 0;
      padding-left: 25px;
      position: relative;
    }
    li:before {
      content: "▶";
      color: #3b82f6;
      position: absolute;
      left: 0;
    }
    .conclusion {
      background: #1e40af;
      color: white;
      padding: 30px;
      border-radius: 10px;
      margin: 40px 0;
    }
    @media print {
      body { padding: 20px; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>RELATÓRIO DE DESENVOLVIMENTO</h1>
    <div class="subtitle">Sistema de Controle de Processos de Licitação</div>
    <div class="subtitle">Período: 26/05/2025 - 28/05/2025</div>
    <div class="subtitle">SEAP-PB | Secretaria de Estado da Administração Penitenciária</div>
  </div>

${markdownContent
  .replace(/^# (.*)$/gm, '<h1>$1</h1>')
  .replace(/^## (.*)$/gm, '<h2>$1</h2>')
  .replace(/^### (.*)$/gm, '<h3>$1</h3>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/\*([^*]+)\*/g, '<em>$1</em>')
  .replace(/✅/g, '<span class="check-item">✅</span>')
  .replace(/^- ✅ (.*)$/gm, '<div class="check-item">✅ $1</div>')
  .replace(/```typescript\n([\s\S]*?)\n```/g, '<div class="code-block">$1</div>')
  .replace(/```\n([\s\S]*?)\n```/g, '<div class="code-block">$1</div>')
  .replace(/^---$/gm, '<hr style="border: 1px solid #e5e7eb; margin: 30px 0;">')
  .replace(/\n\n/g, '</p><p>')
  .replace(/\n/g, '<br>')
  .replace(/^(.*)$/gm, '<p>$1</p>')
}

  <div class="conclusion">
    <h3 style="color: white; margin-top: 0;">Status Final do Projeto</h3>
    <p>✅ Sistema totalmente funcional e pronto para produção</p>
    <p>✅ Controle de acesso por departamento implementado</p>
    <p>✅ Interface otimizada e responsiva</p>
    <p>✅ Segurança robusta implementada</p>
  </div>

  <div class="footer">
    <p><strong>Relatório gerado automaticamente em ${new Date().toLocaleDateString('pt-BR')}</strong></p>
    <p>Sistema de Controle de Processos de Licitação | SEAP-PB</p>
  </div>
</body>
</html>`;

    // Configurações do PDF
    const options = {
      format: 'A4',
      margin: {
        top: '2cm',
        right: '2cm',
        bottom: '2cm',
        left: '2cm'
      },
      printBackground: true,
      displayHeaderFooter: false
    };

    const file = { content: htmlContent };

    // Gera o PDF
    console.log('📄 Gerando PDF do relatório...');
    const pdfBuffer = await htmlPdf.generatePdf(file, options);
    
    // Salva o arquivo
    fs.writeFileSync('RELATORIO_DESENVOLVIMENTO_26-28_MAI_2025.pdf', pdfBuffer);
    
    console.log('✅ PDF exportado com sucesso: RELATORIO_DESENVOLVIMENTO_26-28_MAI_2025.pdf');
    console.log('📁 O arquivo está disponível na raiz do projeto');
    
  } catch (error) {
    console.error('❌ Erro ao exportar PDF:', error.message);
  }
}

exportReportToPDF();