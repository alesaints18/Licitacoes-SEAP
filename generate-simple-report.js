import htmlPdf from 'html-pdf-node';
import fs from 'fs';

async function generateSimpleReport() {
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Relatório de Implementações - Sistema SEAP</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 20px;
            color: #333;
        }
        .header {
            background: #1e40af;
            color: white;
            padding: 20px;
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .section {
            margin-bottom: 25px;
        }
        .section h2 {
            color: #1e40af;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 5px;
        }
        .implementation {
            background: #f8fafc;
            border-left: 4px solid #3b82f6;
            padding: 15px;
            margin-bottom: 15px;
        }
        .date {
            background: #dbeafe;
            color: #1e40af;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 12px;
            font-weight: bold;
        }
        .highlight {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            padding: 15px;
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Relatório de Implementações</h1>
        <p>Sistema de Controle de Processos de Licitação - SEAP/PB</p>
        <p>Data: ${new Date().toLocaleDateString('pt-BR')}</p>
    </div>

    <div class="section">
        <h2>Resumo Executivo</h2>
        <div class="highlight">
            <p><strong>Sistema de fluxograma interativo totalmente implementado</strong> com funcionalidades avançadas de visualização, zoom controlado e imagens específicas por departamento.</p>
        </div>
    </div>

    <div class="section">
        <h2>Implementações Realizadas</h2>
        
        <div class="implementation">
            <span class="date">01 Jul 2025</span>
            <h3>Sistema de Relatórios PDF</h3>
            <p>Implementada geração de relatório PDF usando impressão do navegador, compatível com ambiente Replit.</p>
        </div>

        <div class="implementation">
            <span class="date">01 Jul 2025</span>
            <h3>Fluxograma Interativo</h3>
            <p>Adicionado fluxograma interativo com zoom e expansão em tela cheia.</p>
        </div>

        <div class="implementation">
            <span class="date">01 Jul 2025</span>
            <h3>Componente SimpleImageZoom</h3>
            <p>Sistema de zoom 100% funcional com controles +/- e arrastar para mover.</p>
        </div>

        <div class="implementation">
            <span class="date">01 Jul 2025</span>
            <h3>Imagens Departamentais</h3>
            <p>5 imagens específicas por departamento: Setor Demandante, Divisão de Licitação, NPP, Orçamento e Finanças, Secretário de Estado.</p>
        </div>

        <div class="implementation">
            <span class="date">01 Jul 2025</span>
            <h3>Otimização de Performance</h3>
            <p>Redução de 58% no tamanho das imagens (5.7MB → 2.4MB).</p>
        </div>

        <div class="implementation">
            <span class="date">01 Jul 2025</span>
            <h3>Zoom por Níveis Fixos</h3>
            <p>Sistema ajustado para níveis: 100% → 300% → 500%.</p>
        </div>
    </div>

    <div class="section">
        <h2>Tecnologias Utilizadas</h2>
        <p>React, TypeScript, Drizzle ORM, PostgreSQL, Tailwind CSS, Shadcn UI, SimpleImageZoom, WebSocket, Express.js, Vite</p>
    </div>

    <div class="section">
        <h2>Benefícios Alcançados</h2>
        <ul>
            <li><strong>Performance:</strong> Redução de 58% no tamanho das imagens</li>
            <li><strong>Usabilidade:</strong> Controles de zoom mais precisos</li>
            <li><strong>Funcionalidade:</strong> Visualização específica por departamento</li>
            <li><strong>Experiência:</strong> Interface mais responsiva</li>
        </ul>
    </div>

    <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #666;">
        <p>Relatório gerado automaticamente pelo Sistema SEAP</p>
        <p>Secretaria de Administração Penitenciária da Paraíba</p>
    </div>
</body>
</html>
  `;

  const options = {
    format: 'A4',
    border: {
      top: "20mm",
      right: "15mm",
      bottom: "20mm",
      left: "15mm"
    }
  };

  try {
    const file = { content: htmlContent };
    const pdfBuffer = await htmlPdf.generatePdf(file, options);
    
    const fileName = `relatorio-implementacoes-${new Date().toISOString().split('T')[0]}.pdf`;
    fs.writeFileSync(fileName, pdfBuffer);
    
    console.log(`✅ Relatório PDF gerado: ${fileName}`);
    console.log(`📁 Tamanho: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
    
    return fileName;
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
  }
}

generateSimpleReport();