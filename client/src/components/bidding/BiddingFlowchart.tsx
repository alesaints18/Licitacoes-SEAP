import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BiddingModality } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

const FLOW_CHARTS = {
  1: { // Pregão Eletrônico
    steps: [
      "Termo de Referência",
      "Pesquisa de Preço",
      "Autorização",
      "Elaboração do Edital",
      "Publicação",
      "Sessão de Lances",
      "Análise de Documentação",
      "Homologação",
      "Contratação"
    ],
    connections: [
      [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8]
    ]
  },
  2: { // Concorrência
    steps: [
      "Projeto Básico",
      "Pesquisa de Preço",
      "Autorização",
      "Elaboração do Edital",
      "Publicação",
      "Habilitação",
      "Julgamento",
      "Homologação",
      "Adjudicação",
      "Contratação"
    ],
    connections: [
      [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9]
    ]
  },
  3: { // Dispensa
    steps: [
      "Termo de Referência",
      "Justificativa da Dispensa",
      "Pesquisa de Preço",
      "Autorização",
      "Habilitação do Fornecedor",
      "Ratificação",
      "Contratação"
    ],
    connections: [
      [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]
    ]
  },
  4: { // Inexigibilidade
    steps: [
      "Termo de Referência",
      "Justificativa da Inexigibilidade",
      "Comprovação de Exclusividade",
      "Autorização",
      "Habilitação do Fornecedor",
      "Ratificação",
      "Contratação"
    ],
    connections: [
      [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]
    ]
  }
};

interface BiddingFlowchartProps {
  selectedModalityId?: number;
  onModalitySelect?: (modalityId: number) => void;
}

const BiddingFlowchart = ({ selectedModalityId, onModalitySelect }: BiddingFlowchartProps) => {
  const [modalityId, setModalityId] = useState<number>(selectedModalityId || 0);

  // Get modalities
  const { data: modalities, isLoading, error } = useQuery<BiddingModality[]>({
    queryKey: ['/api/modalities'],
  });

  const handleModalitySelect = (id: number) => {
    setModalityId(id);
    if (onModalitySelect) {
      onModalitySelect(id);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fluxograma de Licitação</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Carregando modalidades...</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !modalities) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fluxograma de Licitação</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Erro ao carregar modalidades</p>
        </CardContent>
      </Card>
    );
  }

  // Get flowchart data for the selected modality
  const flowchart = FLOW_CHARTS[modalityId as keyof typeof FLOW_CHARTS];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fluxograma de Licitação</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {modalities.map((modality) => (
              <Button
                key={modality.id}
                variant={modalityId === modality.id ? "default" : "outline"}
                onClick={() => handleModalitySelect(modality.id)}
                className="mb-2"
              >
                {modality.name}
              </Button>
            ))}
          </div>
        </div>

        {modalityId && flowchart ? (
          <div className="mt-6">
            <div className="overflow-auto pb-4">
              <div className="min-w-[600px]">
                <svg width="100%" height="150" viewBox="0 0 1000 150" className="mx-auto">
                  {flowchart.steps.map((step, index) => {
                    const x = (index * 120) + 60;
                    return (
                      <g key={index}>
                        {/* Node */}
                        <rect
                          x={x - 50}
                          y="50"
                          width="100"
                          height="50"
                          rx="5"
                          fill="#0066cc"
                          className="transition-all hover:fill-blue-700"
                        />
                        {/* Text */}
                        <text
                          x={x}
                          y="75"
                          fontSize="12"
                          fontWeight="bold"
                          fill="white"
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          {step}
                        </text>
                        {/* Arrow */}
                        {index < flowchart.steps.length - 1 && (
                          <>
                            <line
                              x1={x + 50}
                              y1="75"
                              x2={x + 70}
                              y2="75"
                              stroke="#666"
                              strokeWidth="2"
                            />
                            <polygon
                              points={`${x + 70},70 ${x + 80},75 ${x + 70},80`}
                              fill="#666"
                            />
                          </>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="text-lg font-medium mb-2">Descrição do Fluxo</h3>
              <ol className="list-decimal pl-5 space-y-2">
                {flowchart.steps.map((step, index) => (
                  <li key={index} className="text-gray-700">
                    <span className="font-medium">{step}</span>
                    {index === 0 && " - Início do processo com a definição do objeto"}
                    {index === flowchart.steps.length - 1 && " - Finalização do processo"}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-gray-500">Selecione uma modalidade para visualizar o fluxo</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BiddingFlowchart;
