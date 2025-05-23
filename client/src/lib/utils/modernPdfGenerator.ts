import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import autoTable from 'jspdf-autotable';
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
 * Gera um relatório PDF com layout moderno em formato widescreen
 */
export function generateModernPdf(data: ReportData): void {
  try {
    // Filtrar dados conforme os critérios
    const filteredProcesses = filterReportData(data);
    
    // Criar estatísticas
    const statusCounts = {
      draft: filteredProcesses.filter(p => p.status === 'draft').length,
      in_progress: filteredProcesses.filter(p => p.status === 'in_progress').length,
      completed: filteredProcesses.filter(p => p.status === 'completed').length,
      canceled: filteredProcesses.filter(p => p.status === 'canceled').length,
    };
    
    // Estatísticas por modalidade
    const modalityCounts = new Map<number, number>();
    filteredProcesses.forEach(p => {
      const count = modalityCounts.get(p.modalityId) || 0;
      modalityCounts.set(p.modalityId, count + 1);
    });
    
    const modalityData = Array.from(modalityCounts.entries())
      .map(([id, count]) => {
        const modality = data.modalities.find(m => m.id === id);
        return {
          name: modality?.name || `Modalidade ${id}`,
          count
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Estatísticas por fonte
    const sourceCounts = new Map<number, number>();
    filteredProcesses.forEach(p => {
      const count = sourceCounts.get(p.sourceId) || 0;
      sourceCounts.set(p.sourceId, count + 1);
    });
    
    const sourceData = Array.from(sourceCounts.entries())
      .map(([id, count]) => {
        const source = data.sources.find(s => s.id === id);
        return {
          name: source ? `Fonte ${source.code}` : `Fonte ${id}`,
          count
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Criar um novo documento PDF com orientação paisagem (widescreen)
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    // Configurar dimensões do documento
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    
    // ----- CABEÇALHO DO RELATÓRIO -----
    
    // Fundo do cabeçalho
    doc.setFillColor(30, 64, 175); // Azul escuro
    doc.rect(0, 0, pageWidth, 30, 'F');
    
    // Título principal
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text("Relatório SEAP-PB", margin, 15);
    
    // Subtítulo
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Sistema de Controle de Processos de Licitação", margin, 22);
    
    // Data do relatório
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - margin, 15, { align: 'right' });
    
    // Filtros aplicados
    let departmentInfo = "Todos os departamentos";
    if (data.filters.department && data.filters.department !== 'all' && data.departments) {
      const deptId = parseInt(data.filters.department);
      const dept = data.departments.find(d => d.id === deptId);
      if (dept) {
        departmentInfo = `Departamento: ${dept.name}`;
      }
    }
    doc.text(departmentInfo, pageWidth - margin, 22, { align: 'right' });
    
    // ----- CARTÕES DE ESTATÍSTICAS -----
    const statCardsY = 45;
    const cardWidth = (pageWidth - (margin * 2) - 30) / 4;
    const cardHeight = 30;
    
    // Desenhar cards de estatísticas
    const drawStatCard = (title: string, value: number, x: number, y: number, colorR: number, colorG: number, colorB: number) => {
      // Fundo do card
      doc.setFillColor(255, 255, 255);
      doc.rect(x, y, cardWidth, cardHeight, 'F');
      
      // Borda superior colorida
      doc.setFillColor(colorR, colorG, colorB);
      doc.rect(x, y, cardWidth, 4, 'F');
      
      // Valor (grande e centralizado)
      doc.setFontSize(18);
      doc.setTextColor(colorR, colorG, colorB);
      doc.setFont("helvetica", "bold");
      doc.text(value.toString(), x + cardWidth / 2, y + 20, { align: 'center' });
      
      // Título
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      doc.text(title, x + cardWidth / 2, y + 27, { align: 'center' });
    }
    
    // Desenhar os 4 cards de estatísticas
    drawStatCard("Total de Processos", filteredProcesses.length, margin, statCardsY, 59, 130, 246); // Azul
    drawStatCard("Em Andamento", statusCounts.in_progress, margin + cardWidth + 10, statCardsY, 14, 165, 233); // Azul claro
    drawStatCard("Concluídos", statusCounts.completed, margin + (cardWidth + 10) * 2, statCardsY, 16, 185, 129); // Verde
    drawStatCard("Cancelados", statusCounts.canceled, margin + (cardWidth + 10) * 3, statCardsY, 239, 68, 68); // Vermelho
    
    // ----- SEÇÃO DE GRÁFICOS -----
    
    // Título da seção
    doc.setFontSize(14);
    doc.setTextColor(30, 64, 175);
    doc.setFont("helvetica", "bold");
    doc.text("Visão Geral dos Processos", margin, 90);
    
    // Linha separadora
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(margin, 94, pageWidth - margin, 94);
    
    // ----- GRÁFICO DE PIZZA (STATUS DE PROCESSOS) -----
    
    // Posicionar o gráfico
    const pieX = margin + 60;
    const pieY = 125;
    const pieRadius = 25;
    
    // Desenhar os setores com base nas proporções
    const total = filteredProcesses.length || 1;
    let startAngle = 0;
    
    // Cores para os status
    const statusColors = {
      completed: [16, 185, 129], // Verde
      in_progress: [59, 130, 246], // Azul
      draft: [156, 163, 175], // Cinza
      canceled: [239, 68, 68]  // Vermelho
    };
    
    // Desenhar gráfico de pizza se houver processos
    if (filteredProcesses.length > 0) {
      // Preparar dados para o gráfico e legenda
      // Mapear diretamente as cores do COLORS para os dados de status
      const COLORS_MAP = {
        "completed": [0, 196, 159],  // Verde
        "in_progress": [0, 136, 254], // Azul
        "draft": [156, 163, 175],     // Cinza
        "canceled": [255, 128, 66]    // Laranja
      };
      
      // Preparar os dados para o gráfico com cores consistentes
      const statusData = [
        { status: "completed", count: statusCounts.completed, label: "Concluídos", color: COLORS_MAP.completed },
        { status: "in_progress", count: statusCounts.in_progress, label: "Em Andamento", color: COLORS_MAP.in_progress },
        { status: "draft", count: statusCounts.draft, label: "Rascunho", color: COLORS_MAP.draft },
        { status: "canceled", count: statusCounts.canceled, label: "Cancelados", color: COLORS_MAP.canceled }
      ].filter(item => item.count > 0);
      
      // Em vez de tentar desenhar um gráfico de pizza complexo com jsPDF,
      // vamos usar uma abordagem simples de mostrar os blocos coloridos lado a lado
      // que representam claramente as proporções

      // Garantir que os dados estejam ordenados por status para manter consistência visual
      const sortedStatusData = [...statusData];
      
      // Configuração do layout dos blocos
      const blockTotalWidth = 120;  // Largura total disponível
      const blockHeight = 20;       // Altura de cada bloco
      const blockY = pieY - 30;     // Posição Y dos blocos
      const blockStartX = pieX - blockTotalWidth/2; // Centralizar os blocos
      
      // Texto explicativo acima dos blocos
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.setFont("helvetica", "bold");
      doc.text("Distribuição de Processos por Status", pieX, blockY - 15, { align: 'center' });
      
      // Texto com total abaixo dos blocos
      doc.setFontSize(10);
      doc.text(`Total: ${total} processos`, pieX, blockY + blockHeight + 15, { align: 'center' });
      
      // Desenhar a representação colorida da distribuição
      let currentX = blockStartX;
      sortedStatusData.forEach(item => {
        // Calcular a largura proporcional deste bloco
        const blockWidth = (item.count / total) * blockTotalWidth;
        
        // Definir a cor do bloco
        doc.setFillColor(item.color[0], item.color[1], item.color[2]);
        
        // Desenhar o bloco - largura proporcional à quantidade de processos
        doc.rect(currentX, blockY, blockWidth, blockHeight, 'F');
        
        // Se o bloco for grande o suficiente, adicionar texto
        if (blockWidth > 25) {
          doc.setFontSize(8);
          doc.setTextColor(255, 255, 255);
          doc.text(`${item.count}`, currentX + blockWidth/2, blockY + blockHeight/2 + 3, { align: 'center' });
        }
        
        // Avançar para a próxima posição
        currentX += blockWidth;
      });
      
      // Círculo branco no centro para criar efeito de rosca
      doc.setFillColor(255, 255, 255);
      doc.circle(pieX, pieY, pieRadius * 0.6, 'F');
      
      // Adicionar número total no centro
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(total.toString(), pieX, pieY + 4, { align: 'center' });
      
      // Legendas com maior espaçamento
      let legendY = pieY - 20;
      statusData.forEach((item, index) => {
        const color = item.color;
        const percentage = Math.round((item.count / total) * 100);
        
        // Quadrado colorido
        doc.setFillColor(color[0], color[1], color[2]);
        doc.rect(pieX + 40, legendY + (index * 15), 5, 5, 'F');
        
        // Texto da legenda
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(`${item.label}: ${item.count} (${percentage}%)`, pieX + 48, legendY + (index * 15) + 4);
      });
    } else {
      // Mensagem caso não haja dados
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(10);
      doc.text("Não há dados disponíveis", pieX, pieY, { align: 'center' });
    }
    
    // ----- GRÁFICO DE BARRAS (MODALIDADES) -----
    
    // Posicionar o gráfico
    const barChartX = pageWidth / 2 + 10;
    const barChartY = 160;
    const barChartWidth = pageWidth - barChartX - margin;
    const barChartHeight = 40;
    
    // Título do gráfico
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Processos por Modalidade", barChartX + barChartWidth / 2, 105, { align: 'center' });
    
    // Dados ordenados
    const sortedModalityData = [...modalityData].sort((a, b) => b.count - a.count);
    const maxCount = Math.max(...sortedModalityData.map(m => m.count), 1);
    
    // Cores para as barras - array de cores diferentes
    const barColors = [
      [59, 130, 246],  // Azul
      [16, 185, 129],  // Verde
      [245, 158, 11],  // Amarelo
      [239, 68, 68],   // Vermelho
      [168, 85, 247],  // Roxo
      [14, 165, 233],  // Azul claro
      [34, 197, 94],   // Verde escuro
      [249, 115, 22]   // Laranja
    ];
    
    // Desenhar barras
    const barWidth = Math.min(20, barChartWidth / (sortedModalityData.length * 2));
    const barGap = barWidth / 2;
    
    sortedModalityData.forEach((modality, index) => {
      const barHeight = (modality.count / maxCount) * barChartHeight;
      const barX = barChartX + (index * (barWidth + barGap));
      
      // Escolher cor para esta barra
      const colorIndex = index % barColors.length;
      const barColor = barColors[colorIndex];
      
      // Barra com cor diferente para cada modalidade
      doc.setFillColor(barColor[0], barColor[1], barColor[2]);
      doc.rect(barX, barChartY - barHeight, barWidth, barHeight, 'F');
      
      // Valor acima da barra
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(8);
      doc.text(modality.count.toString(), barX + barWidth / 2, barChartY - barHeight - 2, { align: 'center' });
      
      // Nome da modalidade (abreviado)
      const displayName = modality.name.length > 12 ? modality.name.substring(0, 12) + '...' : modality.name;
      doc.setFontSize(7);
      doc.text(displayName, barX + barWidth / 2, barChartY + 5, { align: 'center' });
    });
    
    // ----- ADICIONAR RODAPÉ NA PRIMEIRA PÁGINA -----
    const footerY = pageHeight - 10;
    
    // Linha separadora
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
    
    // Texto do rodapé
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "normal");
    doc.text('SEAP-PB - Secretaria de Estado da Administração Penitenciária', pageWidth / 2, footerY, { align: 'center' });
    
    // ----- ADICIONAR NOVA PÁGINA PARA TABELA DE PROCESSOS -----
    doc.addPage();
    
    // ----- CABEÇALHO DA SEGUNDA PÁGINA -----
    doc.setFillColor(30, 64, 175); // Azul escuro
    doc.rect(0, 0, pageWidth, 20, 'F');
    
    // Título
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Relatório SEAP-PB - Processos Recentes", margin, 14);
    
    // Data
    doc.setFontSize(8);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - margin, 14, { align: 'right' });
    
    // ----- TABELA DE PROCESSOS RECENTES -----
    
    // Título da seção
    doc.setFontSize(14);
    doc.setTextColor(30, 64, 175);
    doc.setFont("helvetica", "bold");
    doc.text("Processos Recentes", margin, 30);
    
    // Linha separadora
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(margin, 34, pageWidth - margin, 34);
    
    // Preparar dados para a tabela
    const tableData = filteredProcesses
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20) // Aumentamos o número de processos exibidos na tabela
      .map(p => {
        const modality = data.modalities.find(m => m.id === p.modalityId);
        const responsible = data.users.find(u => u.id === p.responsibleId);
        const description = p.description.length > 50 ? p.description.substring(0, 50) + '...' : p.description;
        
        let statusText = '';
        switch(p.status) {
          case 'draft': statusText = 'Rascunho'; break;
          case 'in_progress': statusText = 'Em Andamento'; break;
          case 'completed': statusText = 'Concluído'; break;
          case 'canceled': statusText = 'Cancelado'; break;
        }
        
        return [
          p.pbdocNumber,
          description,
          modality?.name || 'N/A',
          responsible?.fullName || 'N/A',
          statusText,
          new Date(p.createdAt).toLocaleDateString('pt-BR')
        ];
      });
    
    // Definir cabeçalhos da tabela
    const headers = [
      'PBDOC', 
      'Descrição', 
      'Modalidade', 
      'Responsável', 
      'Status',
      'Data de Criação'
    ];
    
    // Desenhar a tabela
    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 40,
      margin: { left: margin, right: margin },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250]
      },
      styles: {
        font: 'helvetica',
        fontSize: 9 // Aumentei o tamanho da fonte para melhor legibilidade
      },
      columnStyles: {
        0: { cellWidth: 25 }, // PBDOC
        1: { cellWidth: 'auto' }, // Descrição - Largura automática
        2: { cellWidth: 45 }, // Modalidade
        3: { cellWidth: 45 }, // Responsável
        4: { cellWidth: 30 }, // Status
        5: { cellWidth: 30 }  // Data de Criação
      }
    });
    
    // ----- RODAPÉ DA SEGUNDA PÁGINA -----
    
    // Linha separadora
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    
    // Texto do rodapé
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "normal");
    doc.text('SEAP-PB - Secretaria de Estado da Administração Penitenciária', pageWidth / 2, footerY, { align: 'center' });
    
    // Gerar nome do arquivo
    const fileName = `relatorio-seap-${new Date().toLocaleDateString('pt-BR').replaceAll('/', '-')}.pdf`;
    
    // Salvar o PDF
    doc.save(fileName);
  } catch (error) {
    console.error('Erro ao gerar relatório PDF moderno:', error);
    alert('Ocorreu um erro ao gerar o relatório PDF. Por favor, tente novamente.');
  }
}