import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Search, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Users, 
  Archive,
  AlertTriangle,
  ChevronRight,
  Info
} from 'lucide-react';

interface FlowStep {
  id: string;
  title: string;
  description: string;
  sector: string;
  timeLimit?: string;
  type: 'process' | 'decision' | 'document' | 'archive';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  nextSteps?: string[];
  icon: React.ReactNode;
}

const BiddingFlowchart = () => {
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState<'initiation' | 'preparation' | 'execution' | 'completion'>('initiation');

  const flowSteps: FlowStep[] = [
    // Fase 1: Iniciação
    {
      id: 'dfd',
      title: 'Documento de Formalização da Demanda - DFD',
      description: 'Setor demandante elabora o documento formalizando a necessidade de contratação',
      sector: 'Setor Demandante',
      type: 'document',
      status: 'completed',
      nextSteps: ['etp'],
      icon: <FileText className="w-4 h-4" />
    },
    {
      id: 'etp',
      title: 'Estudo Técnico Preliminar - ETP',
      description: 'Análise técnica da demanda e viabilidade da contratação',
      sector: 'Setor Demandante',
      type: 'process',
      status: 'completed',
      nextSteps: ['mr'],
      icon: <Search className="w-4 h-4" />
    },
    {
      id: 'mr',
      title: 'Mapa de Risco - MR',
      description: 'Identificação e análise dos riscos específicos do processo',
      sector: 'Setor Demandante',
      type: 'document',
      status: 'completed',
      nextSteps: ['tr'],
      icon: <AlertTriangle className="w-4 h-4" />
    },
    {
      id: 'tr',
      title: 'Termo de Referência - TR',
      description: 'Documento técnico detalhando o objeto da contratação',
      sector: 'Setor Demandante',
      type: 'document',
      status: 'pending',
      nextSteps: ['decision1'],
      icon: <FileText className="w-4 h-4" />
    },
    {
      id: 'decision1',
      title: 'Autorização pelo Ordenador de Despesa',
      description: 'Decisão sobre autorização ou arquivamento do processo',
      sector: 'Ordenador de Despesa',
      timeLimit: '10 dias',
      type: 'decision',
      status: 'pending',
      nextSteps: ['create_process', 'archive'],
      icon: <CheckCircle className="w-4 h-4" />
    },

    // Fase 2: Preparação
    {
      id: 'create_process',
      title: 'Criar Processo no Órgão',
      description: 'Formalização do processo administrativo',
      sector: 'Divisão de Licitação',
      timeLimit: '2 dias',
      type: 'process',
      status: 'pending',
      nextSteps: ['price_research'],
      icon: <FileText className="w-4 h-4" />
    },
    {
      id: 'price_research',
      title: 'Pesquisa de Preços',
      description: 'Levantamento de preços no mercado',
      sector: 'Núcleo de Pesquisa de Preços - NPP',
      timeLimit: '10 dias',
      type: 'process',
      status: 'pending',
      nextSteps: ['budget_analysis'],
      icon: <Search className="w-4 h-4" />
    },
    {
      id: 'budget_analysis',
      title: 'Análise Orçamentária',
      description: 'Verificação da disponibilidade orçamentária',
      sector: 'Unidade de Orçamento e Finanças',
      timeLimit: '1 dia',
      type: 'process',
      status: 'pending',
      nextSteps: ['ro_emission'],
      icon: <DollarSign className="w-4 h-4" />
    },
    {
      id: 'ro_emission',
      title: 'Emissão de Reserva Orçamentária - RO',
      description: 'Reserva do valor no orçamento para a contratação',
      sector: 'Unidade de Orçamento e Finanças',
      timeLimit: '1 dia',
      type: 'document',
      status: 'pending',
      nextSteps: ['seap_authorization'],
      icon: <DollarSign className="w-4 h-4" />
    },

    // Fase 3: Execução
    {
      id: 'seap_authorization',
      title: 'Autorização SEAP',
      description: 'Autorização final pelo Secretário de Estado',
      sector: 'Secretário SEAP',
      type: 'decision',
      status: 'pending',
      nextSteps: ['edital_elaboration', 'return_correction'],
      icon: <CheckCircle className="w-4 h-4" />
    },
    {
      id: 'edital_elaboration',
      title: 'Elaboração do Edital',
      description: 'Preparação do edital e seus anexos',
      sector: 'Divisão de Licitação',
      timeLimit: '10 dias',
      type: 'document',
      status: 'pending',
      nextSteps: ['committee_consultation'],
      icon: <FileText className="w-4 h-4" />
    },
    {
      id: 'committee_consultation',
      title: 'Consulta ao Comitê Gestor',
      description: 'Consulta ao Comitê Gestor de Gasto Público',
      sector: 'Divisão de Licitação',
      timeLimit: '2 dias',
      type: 'process',
      status: 'pending',
      nextSteps: ['technical_note'],
      icon: <Users className="w-4 h-4" />
    },

    // Opções de desvio
    {
      id: 'return_correction',
      title: 'Devolver para Correção',
      description: 'Retorno ao setor demandante para correções',
      sector: 'Secretário SEAP',
      type: 'process',
      status: 'pending',
      nextSteps: ['dfd'],
      icon: <XCircle className="w-4 h-4" />
    },
    {
      id: 'archive',
      title: 'Arquivar Processo',
      description: 'Arquivamento por não autorização ou cancelamento',
      sector: 'Diversos',
      type: 'archive',
      status: 'pending',
      nextSteps: [],
      icon: <Archive className="w-4 h-4" />
    },
    {
      id: 'technical_note',
      title: 'Elaboração de Nota Técnica',
      description: 'Elaboração de nota técnica pelo setor competente',
      sector: 'Setor Competente',
      type: 'document',
      status: 'pending',
      nextSteps: [],
      icon: <FileText className="w-4 h-4" />
    }
  ];

  const phases = [
    { id: 'initiation', name: 'Iniciação', color: 'bg-blue-100 text-blue-800' },
    { id: 'preparation', name: 'Preparação', color: 'bg-yellow-100 text-yellow-800' },
    { id: 'execution', name: 'Execução', color: 'bg-green-100 text-green-800' },
    { id: 'completion', name: 'Finalização', color: 'bg-purple-100 text-purple-800' }
  ];

  const getStepsByPhase = (phase: string) => {
    const phaseSteps = {
      initiation: ['dfd', 'etp', 'mr', 'tr', 'decision1'],
      preparation: ['create_process', 'price_research', 'budget_analysis', 'ro_emission'],
      execution: ['seap_authorization', 'edital_elaboration', 'committee_consultation', 'technical_note'],
      completion: ['return_correction', 'archive']
    };
    return flowSteps.filter(step => phaseSteps[phase as keyof typeof phaseSteps]?.includes(step.id));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'document': return 'bg-blue-50 border-blue-200';
      case 'decision': return 'bg-orange-50 border-orange-200';
      case 'process': return 'bg-green-50 border-green-200';
      case 'archive': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
          Fluxograma - Pregão Eletrônico
        </h1>
        <p className="text-gray-600">
          SEAP/PB - Procedimentos conforme Lei nº 14.133/2021
        </p>
      </div>

      {/* Navegação por Fases */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {phases.map((phase) => (
            <Button
              key={phase.id}
              variant={currentPhase === phase.id ? "default" : "outline"}
              onClick={() => setCurrentPhase(phase.id as any)}
              className="flex items-center gap-2"
            >
              {phase.name}
              <Badge className={phase.color}>
                {getStepsByPhase(phase.id).length}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      {/* Legenda */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Legenda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-50 border-2 border-blue-200 rounded"></div>
              <span className="text-sm">Documento</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-50 border-2 border-orange-200 rounded"></div>
              <span className="text-sm">Decisão</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-50 border-2 border-green-200 rounded"></div>
              <span className="text-sm">Processo</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-50 border-2 border-red-200 rounded"></div>
              <span className="text-sm">Arquivamento</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fluxograma */}
      <div className="grid gap-4">
        {getStepsByPhase(currentPhase).map((step) => (
          <Card
            key={step.id}
            className={`cursor-pointer transition-all hover:shadow-md ${getTypeColor(step.type)} ${
              selectedStep === step.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setSelectedStep(selectedStep === step.id ? null : step.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-1">
                    {step.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-800">{step.title}</h3>
                      <Badge className={getStatusColor(step.status)}>
                        {step.status === 'completed' ? 'Concluído' : 
                         step.status === 'pending' ? 'Pendente' : 
                         step.status === 'rejected' ? 'Rejeitado' : 'Em Análise'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {step.sector}
                      </span>
                      {step.timeLimit && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Prazo: {step.timeLimit}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight 
                  className={`w-5 h-5 text-gray-400 transition-transform ${
                    selectedStep === step.id ? 'rotate-90' : ''
                  }`} 
                />
              </div>
              
              {selectedStep === step.id && step.nextSteps && step.nextSteps.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">Próximas etapas:</p>
                  <div className="space-y-1">
                    {step.nextSteps.map((nextStepId) => {
                      const nextStep = flowSteps.find(s => s.id === nextStepId);
                      return nextStep ? (
                        <div key={nextStepId} className="text-sm text-gray-600 flex items-center gap-2">
                          <ChevronRight className="w-3 h-3" />
                          {nextStep.title}
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Setores Envolvidos */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Setores Envolvidos no Processo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              'Setor Demandante',
              'Ordenador de Despesa',
              'Divisão de Licitação',
              'Núcleo de Pesquisa de Preços - NPP',
              'Unidade de Orçamento e Finanças',
              'Secretário SEAP',
              'Comitê Gestor de Gasto Público'
            ].map((sector) => (
              <div key={sector} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium">{sector}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BiddingFlowchart;