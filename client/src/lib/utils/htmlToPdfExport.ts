import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Process, User, BiddingModality, ResourceSource, Department } from "@shared/schema";
import autoTable from 'jspdf-autotable';

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
 * Gera um relatório PDF moderno usando jsPDF com layout widescreen
 */
export function generateWidescreenPdfReport(data: ReportData): void {
  try {
    // Preparar dados
    const filteredProcesses = filterReportData(data);
    
    // Status counts
    const statusCounts = {
      draft: filteredProcesses.filter(p => p.status === 'draft').length,
      in_progress: filteredProcesses.filter(p => p.status === 'in_progress').length,
      completed: filteredProcesses.filter(p => p.status === 'completed').length,
      canceled: filteredProcesses.filter(p => p.status === 'canceled').length,
    };
    
    // Criar documento PDF em formato paisagem (widescreen)
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    // Largura e altura da página
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    
    // --- CABEÇALHO MODERNO ---
    
    // Não é possível criar degradês diretamente no jsPDF
    // Então vamos usar uma cor sólida para o cabeçalho
    
    // Desenhar retângulo com gradiente
    doc.setFillColor(30, 64, 175); // Cor de fallback 
    doc.rect(0, 0, pageWidth, 30, 'F');
    
    // Título principal
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('Relatório Infográfico SEAP-PB', margin, 14);
    
    // Subtítulo
    doc.setFontSize(12);
    doc.setTextColor(230, 230, 230);
    doc.text('Sistema de Controle de Processos de Licitação', margin, 22);
    
    // Data e informações do relatório (lado direito)
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - margin, 14, { align: 'right' });
    
    const departmentText = data.filters.department && data.filters.department !== 'all' && data.departments
      ? data.departments.find(d => d.id === parseInt(data.filters.department))?.name || 'Todos'
      : 'Todos os departamentos';
    doc.text(`Departamento: ${departmentText}`, pageWidth - margin, 22, { align: 'right' });
    
    // --- DASHBOARD DE ESTATÍSTICAS ---
    
    // Título da seção
    doc.setFontSize(16);
    doc.setTextColor(30, 64, 175);
    doc.text('Visão Geral', margin, 40);
    
    // Linha separadora
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(margin, 43, pageWidth - margin, 43);
    
    // Grid de 4 cards de status
    const cardWidth = (pageWidth - (margin * 2) - 15) / 4;
    const cardHeight = 30;
    const cardY = 50;
    
    // Função para desenhar card
    function drawCard(title: string, value: number, x: number, colorR: number, colorG: number, colorB: number) {
      // Borda superior colorida
      doc.setFillColor(colorR, colorG, colorB);
      doc.rect(x, cardY, cardWidth, 4, 'F');
      
      // Fundo do card
      doc.setFillColor(250, 250, 250);
      doc.rect(x, cardY + 4, cardWidth, cardHeight - 4, 'F');
      
      // Valor
      doc.setFontSize(18);
      doc.setTextColor(colorR, colorG, colorB);
      doc.text(value.toString(), x + cardWidth / 2, cardY + 22, { align: 'center' });
      
      // Título
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(title, x + cardWidth / 2, cardY + 30, { align: 'center' });
    }
    
    // Desenhar os 4 cards de status
    drawCard('Total de Processos', filteredProcesses.length, margin, 59, 130, 246);
    drawCard('Em Andamento', statusCounts.in_progress, margin + cardWidth + 5, 16, 185, 129);
    drawCard('Concluídos', statusCounts.completed, margin + (cardWidth + 5) * 2, 245, 158, 11);
    drawCard('Cancelados', statusCounts.canceled, margin + (cardWidth + 5) * 3, 239, 68, 68);
    
    // --- GRÁFICO DE LINHAS DO TEMPO (TIMELINE) ---
    
    // Título da seção
    doc.setFontSize(16);
    doc.setTextColor(30, 64, 175);
    doc.text('Linha do Tempo dos Processos', margin, 95);
    
    // Linha separadora
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(margin, 98, pageWidth - margin, 98);
    
    // Desenhar a linha do tempo (timeline)
    const timelineY = 120;
    const timelineStartX = margin + 10;
    const timelineEndX = pageWidth - margin - 10;
    
    // Linha base
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(3);
    doc.line(timelineStartX, timelineY, timelineEndX, timelineY);
    
    // Processos por status
    const colors = {
      draft: [150, 150, 150],
      in_progress: [59, 130, 246],
      completed: [16, 185, 129], 
      canceled: [239, 68, 68]
    };
    
    const statusLabels = {
      draft: 'Rascunho',
      in_progress: 'Em Andamento',
      completed: 'Concluído',
      canceled: 'Cancelado'
    };
    
    // Pontos na timeline com status
    const timelinePoints = [
      { label: 'Status', sublabel: 'Distribuição', data: statusCounts },
      { label: 'Modalidades', sublabel: 'Mais comuns', data: {} },
      { label: 'Eficiência', sublabel: 'Taxa de conclusão', data: {} },
      { label: 'Responsáveis', sublabel: 'Principais', data: {} }
    ];
    
    const timelineWidth = timelineEndX - timelineStartX;
    const pointGap = timelineWidth / (timelinePoints.length - 0.5);
    
    timelinePoints.forEach((point, index) => {
      const x = timelineStartX + (pointGap * index);
      
      // Círculo do ponto
      doc.setFillColor(30, 64, 175);
      doc.circle(x, timelineY, 5, 'F');
      
      // Texto principal acima
      doc.setFontSize(12);
      doc.setTextColor(50, 50, 50);
      doc.setFont("helvetica", "bold");
      doc.text(point.label, x, timelineY - 15, { align: 'center' });
      
      // Subtexto
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      doc.text(point.sublabel, x, timelineY - 8, { align: 'center' });
      
      // Para o primeiro ponto (Status), desenhar pequenos círculos com os status
      if (index === 0) {
        const statusItems = Object.keys(statusCounts);
        const statusY = timelineY + 15;
        
        statusItems.forEach((status, sIdx) => {
          const statusX = x - 30 + (sIdx * 20);
          const count = statusCounts[status as keyof typeof statusCounts];
          const color = colors[status as keyof typeof colors];
          
          // Círculo colorido com o status
          doc.setFillColor(color[0], color[1], color[2]);
          doc.circle(statusX, statusY, count > 0 ? 5 : 3, 'F');
          
          // Valor do status
          doc.setFontSize(8);
          doc.setTextColor(80, 80, 80);
          doc.text(count.toString(), statusX, statusY + 10, { align: 'center' });
          
          // Label do status
          doc.setFontSize(6);
          doc.text(statusLabels[status as keyof typeof statusLabels], statusX, statusY + 15, { align: 'center' });
        });
      }
      
      // Para o segundo ponto (Modalidades), desenhar distribuição de modalidades
      if (index === 1) {
        // Contar processos por modalidade
        const modalityCounts = new Map<number, number>();
        filteredProcesses.forEach(p => {
          const count = modalityCounts.get(p.modalityId) || 0;
          modalityCounts.set(p.modalityId, count + 1);
        });
        
        // Preparar dados de modalidades
        const modalityData = Array.from(modalityCounts.entries())
          .map(([id, count]) => {
            const modality = data.modalities.find(m => m.id === id);
            return {
              name: modality?.name || `Modalidade ${id}`,
              count
            };
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);
        
        // Desenhar mini gráfico
        const modalityY = timelineY + 15;
        const barWidth = 15;
        const maxCount = Math.max(...modalityData.map(m => m.count), 1);
        
        modalityData.forEach((modality, mIdx) => {
          const barX = x - 25 + (mIdx * 25);
          const barHeight = Math.min(30, (modality.count / maxCount) * 30);
          
          // Desenhar barra
          doc.setFillColor(59, 130, 246);
          doc.rect(barX, modalityY, barWidth, barHeight, 'F');
          
          // Valor 
          doc.setFontSize(8);
          doc.setTextColor(80, 80, 80);
          doc.text(modality.count.toString(), barX + barWidth/2, modalityY + barHeight + 5, { align: 'center' });
          
          // Nome abreviado da modalidade
          doc.setFontSize(6);
          const shortName = modality.name.split(' ')[0];
          doc.text(shortName, barX + barWidth/2, modalityY + barHeight + 12, { align: 'center' });
        });
      }
      
      // Para o terceiro ponto (Eficiência)
      if (index === 2) {
        const total = filteredProcesses.length;
        const completed = statusCounts.completed;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        // Desenhar gráfico circular de progresso
        const centerY = timelineY + 25;
        const radius = 15;
        
        // Círculo de fundo
        doc.setFillColor(220, 220, 220);
        doc.circle(x, centerY, radius, 'F');
        
        // Círculo de progresso (implementação simples)
        if (rate > 0) {
          doc.setFillColor(16, 185, 129);
          // Em um PDF real, aqui usaríamos um arco para mostrar o progresso
          // Como simplificação, apenas desenhamos um círculo menor
          doc.circle(x, centerY, radius * (rate/100), 'F');
        }
        
        // Texto de porcentagem no centro
        doc.setFontSize(12);
        doc.setTextColor(50, 50, 50);
        doc.setFont("helvetica", "bold");
        doc.text(`${rate}%`, x, centerY + 4, { align: 'center' });
        
        // Legenda
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        doc.setFont("helvetica", "normal");
        doc.text(`${completed} de ${total}`, x, centerY + 20, { align: 'center' });
      }
      
      // Para o quarto ponto (Responsáveis)
      if (index === 3) {
        // Contar processos por responsável
        const respCounts = new Map<number, {total: number, name: string}>();
        filteredProcesses.forEach(p => {
          const current = respCounts.get(p.responsibleId) || {total: 0, name: ''};
          const resp = data.users.find(u => u.id === p.responsibleId);
          respCounts.set(p.responsibleId, {
            total: current.total + 1,
            name: resp?.fullName || `Usuário ${p.responsibleId}`
          });
        });
        
        // Preparar dados
        const respData = Array.from(respCounts.entries())
          .map(([_, data]) => data)
          .sort((a, b) => b.total - a.total)
          .slice(0, 3);
        
        // Desenhar mini gráfico
        const respY = timelineY + 15;
        
        respData.forEach((resp, rIdx) => {
          const respX = x - 30 + (rIdx * 30);
          
          // Ícone de usuário (circulo simples)
          doc.setFillColor(59, 130, 246);
          doc.circle(respX, respY, 8, 'F');
          
          // Iniciais do usuário
          doc.setFontSize(8);
          doc.setTextColor(255, 255, 255);
          const initials = resp.name.split(' ')
            .map(name => name[0])
            .slice(0, 2)
            .join('');
          doc.text(initials, respX, respY + 3, { align: 'center' });
          
          // Total de processos
          doc.setFontSize(8);
          doc.setTextColor(80, 80, 80);
          doc.text(resp.total.toString(), respX, respY + 15, { align: 'center' });
          
          // Nome abreviado
          doc.setFontSize(6);
          const firstName = resp.name.split(' ')[0];
          doc.text(firstName, respX, respY + 22, { align: 'center' });
        });
      }
    });
    
    // --- TABELA DE PROCESSOS RECENTES ---
    
    // Título da seção
    doc.setFontSize(16);
    doc.setTextColor(30, 64, 175);
    doc.text('Processos Recentes', margin, 160);
    
    // Linha separadora
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(margin, 163, pageWidth - margin, 163);
    
    // Preparar dados da tabela
    const tableData = filteredProcesses
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8)
      .map(p => {
        const modality = data.modalities.find(m => m.id === p.modalityId);
        const responsible = data.users.find(u => u.id === p.responsibleId);
        const description = p.description.length > 40 ? p.description.substring(0, 40) + '...' : p.description;
        
        let statusText = 'Desconhecido';
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
    
    // Definir cabeçalhos
    const headers = [
      'PBDOC', 
      'Descrição', 
      'Modalidade', 
      'Responsável', 
      'Status',
      'Data de Criação'
    ];
    
    // Estilo da tabela
    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 170,
      margin: { left: margin, right: margin },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250]
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 35 },
        3: { cellWidth: 35 },
        4: { cellWidth: 30 },
        5: { cellWidth: 30 }
      },
      styles: {
        font: 'helvetica',
        fontSize: 9
      }
    });
    
    // --- RODAPÉ ---
    const footerY = pageHeight - 10;
    
    // Linha separadora
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
    
    // Texto do rodapé
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('SEAP-PB - Secretaria de Estado da Administração Penitenciária', pageWidth / 2, footerY, { align: 'center' });
    
    // Salvar o PDF
    const fileName = `seap-pb-relatorio-${new Date().toLocaleDateString('pt-BR').replaceAll('/', '-')}.pdf`;
    doc.save(fileName);
  } catch (error) {
    console.error('Erro ao gerar relatório PDF:', error);
    alert('Ocorreu um erro ao gerar o relatório PDF. Por favor, tente novamente.');
  }
}