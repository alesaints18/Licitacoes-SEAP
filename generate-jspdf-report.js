import { jsPDF } from 'jspdf';
import fs from 'fs';

function generateJsPDFReport() {
  const doc = new jsPDF();
  
  // Header
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text('Relatório de Implementações', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text('Sistema de Controle de Processos de Licitação - SEAP/PB', 105, 28, { align: 'center' });
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 105, 35, { align: 'center' });
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  let yPosition = 55;
  
  // Resumo Executivo
  doc.setFontSize(16);
  doc.setTextColor(30, 64, 175);
  doc.text('Resumo Executivo', 20, yPosition);
  yPosition += 10;
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  const resumoText = 'Sistema de fluxograma interativo totalmente implementado com funcionalidades avançadas de visualização, zoom controlado e imagens específicas por departamento.';
  const resumoLines = doc.splitTextToSize(resumoText, 170);
  doc.text(resumoLines, 20, yPosition);
  yPosition += resumoLines.length * 5 + 10;
  
  // Implementações
  doc.setFontSize(16);
  doc.setTextColor(30, 64, 175);
  doc.text('Implementações Realizadas', 20, yPosition);
  yPosition += 15;
  
  const implementacoes = [
    {
      titulo: 'Sistema de Relatórios PDF',
      descricao: 'Implementada geração de relatório PDF usando impressão do navegador, compatível com ambiente Replit.'
    },
    {
      titulo: 'Fluxograma Interativo',
      descricao: 'Adicionado fluxograma interativo com zoom e expansão em tela cheia para melhor visualização.'
    },
    {
      titulo: 'Componente SimpleImageZoom',
      descricao: 'Sistema de zoom 100% funcional com controles +/- e arrastar para mover imagem.'
    },
    {
      titulo: 'Imagens Departamentais',
      descricao: '5 imagens específicas por departamento: Setor Demandante, Divisão de Licitação, NPP, Orçamento e Finanças, Secretário de Estado.'
    },
    {
      titulo: 'Otimização de Performance',
      descricao: 'Redução de 58% no tamanho das imagens (5.7MB → 2.4MB) para melhor carregamento.'
    },
    {
      titulo: 'Zoom por Níveis Fixos',
      descricao: 'Sistema ajustado para níveis específicos: 100% → 300% → 500% ao invés de incremento contínuo.'
    }
  ];
  
  implementacoes.forEach((impl, index) => {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    // Date badge
    doc.setFillColor(219, 234, 254);
    doc.rect(20, yPosition - 4, 25, 8, 'F');
    doc.setFontSize(8);
    doc.setTextColor(30, 64, 175);
    doc.text('01 Jul 2025', 21, yPosition + 1);
    
    yPosition += 10;
    
    // Title
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(impl.titulo, 20, yPosition);
    yPosition += 7;
    
    // Description
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    const descLines = doc.splitTextToSize(impl.descricao, 170);
    doc.text(descLines, 20, yPosition);
    yPosition += descLines.length * 4 + 8;
  });
  
  // Check if we need a new page for technologies
  if (yPosition > 230) {
    doc.addPage();
    yPosition = 20;
  }
  
  // Tecnologias
  doc.setFontSize(16);
  doc.setTextColor(30, 64, 175);
  doc.text('Tecnologias Utilizadas', 20, yPosition);
  yPosition += 10;
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  const tecnologias = 'React, TypeScript, Drizzle ORM, PostgreSQL, Tailwind CSS, Shadcn UI, SimpleImageZoom, WebSocket, Express.js, Vite';
  const tecLines = doc.splitTextToSize(tecnologias, 170);
  doc.text(tecLines, 20, yPosition);
  yPosition += tecLines.length * 5 + 15;
  
  // Benefícios
  doc.setFontSize(16);
  doc.setTextColor(30, 64, 175);
  doc.text('Benefícios Alcançados', 20, yPosition);
  yPosition += 10;
  
  const beneficios = [
    'Performance: Redução de 58% no tamanho das imagens',
    'Usabilidade: Controles de zoom mais precisos e intuitivos',
    'Funcionalidade: Visualização específica por departamento',
    'Experiência: Interface mais responsiva e profissional'
  ];
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  beneficios.forEach(beneficio => {
    doc.text('• ' + beneficio, 25, yPosition);
    yPosition += 6;
  });
  
  // Footer
  yPosition = 280;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Relatório gerado automaticamente pelo Sistema SEAP', 105, yPosition, { align: 'center' });
  doc.text('Secretaria de Administração Penitenciária da Paraíba', 105, yPosition + 5, { align: 'center' });
  
  // Save PDF
  const fileName = `relatorio-implementacoes-${new Date().toISOString().split('T')[0]}.pdf`;
  const pdfOutput = doc.output('arraybuffer');
  fs.writeFileSync(fileName, Buffer.from(pdfOutput));
  
  console.log(`✅ Relatório PDF gerado: ${fileName}`);
  console.log(`📁 Tamanho: ${(pdfOutput.byteLength / 1024).toFixed(2)} KB`);
  
  return fileName;
}

generateJsPDFReport();