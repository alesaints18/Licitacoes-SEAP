import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Process, User, BiddingModality, ResourceSource, Department } from "@shared/schema";

interface ReportData {
  processes: Process[];
  users: User[];
  modalities: BiddingModality[];
  sources: ResourceSource[];
  departments?: Department[];
  filters: {
    department?: string;
    month?: string;
    year?: string;
  };
  reportType: string;
}

/**
 * Filtra os processos com base nos filtros selecionados
 */
function filterReportData(data: ReportData): Process[] {
  let filteredProcesses = [...data.processes];
  
  // Filtrar por mês
  if (data.filters.month && data.filters.month !== "all") {
    const monthIndex = parseInt(data.filters.month) - 1;
    filteredProcesses = filteredProcesses.filter(process => {
      const processMonth = new Date(process.createdAt).getMonth();
      return processMonth === monthIndex;
    });
  }
  
  // Filtrar por ano
  if (data.filters.year) {
    const year = parseInt(data.filters.year);
    filteredProcesses = filteredProcesses.filter(process => {
      const processYear = new Date(process.createdAt).getFullYear();
      return processYear === year;
    });
  }
  
  // Filtrar por departamento
  if (data.filters.department && data.filters.department !== "all" && data.departments) {
    const departmentId = parseInt(data.filters.department);
    const department = data.departments.find(d => d.id === departmentId);
    
    if (department) {
      filteredProcesses = filteredProcesses.filter(process => {
        const user = data.users.find(u => u.id === process.responsibleId);
        return user?.department === department.name;
      });
    }
  }
  
  return filteredProcesses;
}

/**
 * Gera um relatório PDF em formato de linha do tempo (timeline)
 */
export function generateTimelinePdfReport(data: ReportData): void {
  try {
    // Preparar dados
    const filteredProcesses = filterReportData(data);
    
    // Criar documento PDF com fundo escuro e orientação paisagem
    const doc = new jsPDF({ 
      orientation: 'landscape',
      unit: 'mm'
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    
    // Adicionar fundo escuro em toda a página - similar à imagem referência
    doc.setFillColor(60, 64, 75); // Cor de fundo cinza escuro
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // == TÍTULO COM EFEITO DE SOMBRA ==
    doc.setFontSize(28);
    
    // Efeito de sombra (título principal) - texto ligeiramente translúcido em offset
    doc.setTextColor(220, 220, 220, 0.5);
    doc.text('Timeline Infográfico', pageWidth / 2 + 1, 26, { align: 'center' });
    
    // Texto principal (título)
    doc.setTextColor(255, 255, 255);
    doc.text('Timeline Infográfico', pageWidth / 2, 25, { align: 'center' });
    
    // === LINHA DO TEMPO CENTRAL ===
    const timelineY = 70;
    const timelineStartX = margin + 20;
    const timelineEndX = pageWidth - margin - 20;
    const timelineWidth = timelineEndX - timelineStartX;
    
    // Cores para a timeline
    const timelineColors = [
      [41, 121, 255],  // Azul
      [255, 99, 132],  // Rosa/Vermelho
      [132, 255, 99],  // Verde
      [255, 205, 0],   // Amarelo
      [255, 149, 0]    // Laranja
    ];
    
    // Períodos da timeline (como na imagem de referência)
    const periods = [
      { 
        label: 'Inicialização', 
        year: '1980', 
        color: timelineColors[0],
        stats: filteredProcesses.filter(p => new Date(p.createdAt).getFullYear() === 2021).length,
        description: 'Aenean sodales congue\nnisi sed imperdiet. Donec\ndapibus egent sem ac ornare.',
        chartData: [10, 15, 12, 18, 14]
      },
      { 
        label: 'Progresso', 
        year: '1990', 
        color: timelineColors[1],
        stats: filteredProcesses.filter(p => new Date(p.createdAt).getFullYear() === 2022).length,
        description: 'Cras est tortor est. Ut\nvehicula vel placerat,\nvestibulum eget, placerat\nligula mauris.',
        chartData: [15, 22, 18, 25, 20]
      },
      { 
        label: 'Expansão', 
        year: '2000', 
        color: timelineColors[2],
        stats: filteredProcesses.filter(p => new Date(p.createdAt).getFullYear() === 2023).length,
        description: 'In eunisus magna, faucibus\negest erat nunc, tempus\nrhoncus diam. Phasellus\nac, este felis.',
        chartData: [22, 28, 25, 32, 30]
      },
      { 
        label: 'Inovação', 
        year: '2010', 
        color: timelineColors[3],
        stats: filteredProcesses.filter(p => new Date(p.createdAt).getFullYear() === 2024).length,
        description: 'Fusce egestus, nisl at\nlobortis vulputate, velit erat\nconque lactur, et amet\nluctus risus enim.',
        chartData: [25, 30, 35, 40, 38]
      },
      { 
        label: 'Excelência', 
        year: '2020', 
        color: timelineColors[4],
        stats: filteredProcesses.filter(p => new Date(p.createdAt).getFullYear() === 2025).length,
        description: 'Cras et allocicitude nulla,\nsapien dolor, semper lac,\nsapien eu tincidunt felis.',
        chartData: [30, 35, 42, 48, 45]
      }
    ];
    
    // Desenhar linha do tempo base (cinza)
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(8);
    doc.line(timelineStartX, timelineY, timelineEndX, timelineY);
    
    // Calcular largura de cada segmento
    const segmentWidth = timelineWidth / periods.length;
    
    // Desenhar os segmentos coloridos da timeline
    periods.forEach((period, index) => {
      const segmentStartX = timelineStartX + (segmentWidth * index);
      const segmentEndX = segmentStartX + segmentWidth;
      
      // Desenhar segmento colorido
      doc.setDrawColor(period.color[0], period.color[1], period.color[2]);
      doc.setLineWidth(8);
      doc.line(segmentStartX, timelineY, segmentEndX, timelineY);
      
      // Adicionar círculo no início do segmento
      doc.setFillColor(255, 255, 255);
      doc.circle(segmentStartX, timelineY, 6, 'F');
      doc.setDrawColor(period.color[0], period.color[1], period.color[2]);
      doc.setLineWidth(2);
      doc.circle(segmentStartX, timelineY, 6, 'S');
      
      // Se for o último, adicionar círculo no final
      if (index === periods.length - 1) {
        doc.setFillColor(255, 255, 255);
        doc.circle(segmentEndX, timelineY, 6, 'F');
        doc.setDrawColor(period.color[0], period.color[1], period.color[2]);
        doc.setLineWidth(2);
        doc.circle(segmentEndX, timelineY, 6, 'S');
      }
    });
    
    // === ADICIONAR CONTEÚDO ACIMA E ABAIXO DA TIMELINE ===
    periods.forEach((period, index) => {
      const x = timelineStartX + (segmentWidth * index) + (segmentWidth / 2);
      const isEvenPeriod = index % 2 === 0;
      
      // Ano em grande destaque
      doc.setFontSize(24);
      doc.setTextColor(period.color[0], period.color[1], period.color[2]);
      doc.text(period.year, x, timelineY + (isEvenPeriod ? 50 : -35), { align: 'center' });
      
      // Definir onde desenhar o gráfico de barras e o texto descritivo
      let chartY, descriptionY, circleY;
      
      if (isEvenPeriod) {
        // Conteúdo abaixo da timeline
        chartY = timelineY + 25;
        descriptionY = timelineY + 75;
        circleY = timelineY + 115;
      } else {
        // Conteúdo acima da timeline
        chartY = timelineY - 65;
        descriptionY = timelineY - 25;
        circleY = timelineY - 115;
      }
      
      // Desenhar gráfico de barras
      let barWidth = 7;
      let barGap = 2;
      let chartStartX = x - ((barWidth + barGap) * period.chartData.length / 2);
      
      // Encontrar valor máximo para escala do gráfico
      const maxValue = Math.max(...period.chartData);
      
      // Desenhar barras do gráfico de período
      period.chartData.forEach((value, i) => {
        const barHeight = (value / maxValue) * 40; // altura máxima de 40mm
        const barX = chartStartX + (i * (barWidth + barGap));
        
        // Cores alternadas da mesma família de cores
        if (i % 2 === 0) {
          doc.setFillColor(period.color[0], period.color[1], period.color[2]);
        } else {
          doc.setFillColor(
            Math.min(255, period.color[0] + 40),
            Math.min(255, period.color[1] + 40),
            Math.min(255, period.color[2] + 40)
          );
        }
        
        if (isEvenPeriod) {
          // Barras crescendo para baixo
          doc.rect(barX, chartY, barWidth, barHeight, 'F');
        } else {
          // Barras crescendo para cima
          doc.rect(barX, chartY, barWidth, -barHeight, 'F');
        }
      });
      
      // Texto descritivo
      doc.setFontSize(9);
      doc.setTextColor(220, 220, 220);
      doc.text(period.description, x, descriptionY, { 
        align: 'center',
        maxWidth: segmentWidth - 20
      });
      
      // Círculo com gráfico de pizza/donut
      const circleRadius = 20;
      
      // Desenhar círculo principal
      doc.setFillColor(period.color[0], period.color[1], period.color[2]);
      doc.circle(x, circleY, circleRadius, 'F');
      
      // Segmentos decorativos no círculo (como na imagem de referência)
      const numSegments = 3;
      for(let i = 0; i < numSegments; i++) {
        const segAngle = (2 * Math.PI / numSegments) * i;
        const segX = x + (circleRadius * 0.6) * Math.cos(segAngle);
        const segY = circleY + (circleRadius * 0.6) * Math.sin(segAngle);
        
        // Cores alternadas
        doc.setFillColor(
          Math.min(255, period.color[0] + 60 + (i * 20)),
          Math.min(255, period.color[1] + 60 + (i * 20)),
          Math.min(255, period.color[2] + 60 + (i * 20))
        );
        doc.circle(segX, segY, circleRadius * 0.4, 'F');
      }
      
      // Círculo no centro com o mesmo fundo para criar efeito donut
      doc.setFillColor(60, 64, 75); // Mesma cor do fundo
      doc.circle(x, circleY, circleRadius * 0.5, 'F');
      
      // Texto com estatísticas
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text(`${period.stats || 0}`, x, circleY + 4, { align: 'center' });
    });
    
    // Rodapé com informações de geração
    doc.setFontSize(9);
    doc.setTextColor(180, 180, 180);
    doc.text(`SEAP-PB | Sistema de Controle de Processos Licitatórios | Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 
      pageWidth / 2, pageHeight - 10, { align: 'center' });
    
    // Salvar o PDF
    doc.save(`timeline-processos-${new Date().toLocaleDateString('pt-BR').replaceAll('/', '-')}.pdf`);
  } catch (error) {
    console.error('Erro ao gerar relatório PDF:', error);
    alert('Ocorreu um erro ao gerar o relatório PDF. Por favor, tente novamente.');
  }
}