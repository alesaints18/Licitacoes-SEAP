import fs from 'fs';
import puppeteer from 'puppeteer';
import path from 'path';

async function generateReportPDF() {
  try {
    // Lê o conteúdo do relatório em markdown
    const markdownContent = fs.readFileSync('RELATORIO_DESENVOLVIMENTO_26-28_MAI_2025.md', 'utf8');
    
    // Converte markdown para HTML básico
    const htmlContent = `
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
    .header-info {
      background: #f3f4f6;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .summary {
      background: #ecfdf5;
      border-left: 4px solid #10b981;
      padding: 20px;
      margin: 20px 0;
    }
    .tech-block {
      background: #f9fafb;
      border: 1px solid #d1d5db;
      padding: 15px;
      margin: 15px 0;
      border-radius: 6px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
    }
    .checklist {
      color: #059669;
      font-weight: bold;
    }
    .section {
      margin: 30px 0;
      page-break-inside: avoid;
    }
    .footer {
      margin-top: 50px;
      text-align: center;
      font-style: italic;
      color: #6b7280;
    }
    @page {
      margin: 2cm;
      @bottom-right {
        content: "Página " counter(page);
      }
    }
  </style>
</head>
<body>
${markdownContent
  .replace(/# (.*)/g, '<h1>$1</h1>')
  .replace(/## (.*)/g, '<h2>$1</h2>')
  .replace(/### (.*)/g, '<h3>$1</h3>')
  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  .replace(/✅/g, '<span class="checklist">✅</span>')
  .replace(/- ✅/g, '• <span class="checklist">✅</span>')
  .replace(/```typescript(.*?)```/gs, '<div class="tech-block">$1</div>')
  .replace(/```(.*?)```/gs, '<div class="tech-block">$1</div>')
  .replace(/\n\n/g, '</p><p>')
  .replace(/\n/g, '<br>')
  .replace(/^(.*)$/, '<p>$1</p>')
}
</body>
</html>`;

    // Inicializa o Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    
    // Gera o PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '2cm',
        right: '2cm',
        bottom: '2cm',
        left: '2cm'
      },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="font-size: 10px; text-align: center; width: 100%; margin: 0 2cm;">
          Sistema de Controle de Processos de Licitação - Relatório de Desenvolvimento | Página <span class="pageNumber"></span> de <span class="totalPages"></span>
        </div>
      `
    });
    
    // Salva o PDF
    fs.writeFileSync('RELATORIO_DESENVOLVIMENTO_26-28_MAI_2025.pdf', pdfBuffer);
    
    await browser.close();
    
    console.log('✅ PDF gerado com sucesso: RELATORIO_DESENVOLVIMENTO_26-28_MAI_2025.pdf');
    
  } catch (error) {
    console.error('❌ Erro ao gerar PDF:', error);
  }
}

generateReportPDF();