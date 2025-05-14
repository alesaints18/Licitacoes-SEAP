import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import BiddingFlowchart from "@/components/bidding/BiddingFlowchart";

const BiddingFlow = () => {
  const [selectedModalityId, setSelectedModalityId] = useState<number>(0);
  
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Fluxo de Licitação</h1>
        <p className="text-gray-600">Visualize o fluxograma das modalidades de licitação</p>
      </div>
      
      <Card className="mb-6">
        <CardContent className="p-6">
          <p>
            O fluxograma abaixo apresenta as etapas de cada modalidade de licitação conforme a 
            legislação vigente. Selecione uma modalidade para visualizar seu fluxo específico.
          </p>
        </CardContent>
      </Card>
      
      <BiddingFlowchart 
        selectedModalityId={selectedModalityId} 
        onModalitySelect={setSelectedModalityId} 
      />
      
      {selectedModalityId > 0 && (
        <Card className="mt-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-medium mb-4">Informações Adicionais</h2>
            
            {selectedModalityId === 1 && (
              <div className="space-y-4">
                <p>
                  <strong>Pregão Eletrônico</strong> - Modalidade de licitação para aquisição 
                  de bens e serviços comuns, qualquer que seja o valor estimado da contratação, 
                  em que a disputa pelo fornecimento é feita por meio de propostas e lances em 
                  sessão pública eletrônica.
                </p>
                <p>
                  Regulamentado pela Lei nº 10.520/2002 e Decreto nº 10.024/2019.
                </p>
              </div>
            )}
            
            {selectedModalityId === 2 && (
              <div className="space-y-4">
                <p>
                  <strong>Concorrência</strong> - Modalidade de licitação entre quaisquer 
                  interessados que, na fase inicial de habilitação preliminar, comprovem 
                  possuir os requisitos mínimos de qualificação exigidos no edital para 
                  execução de seu objeto.
                </p>
                <p>
                  Regulamentada pela Lei nº 8.666/1993.
                </p>
              </div>
            )}
            
            {selectedModalityId === 3 && (
              <div className="space-y-4">
                <p>
                  <strong>Dispensa</strong> - Contratação direta, sem licitação, nos casos 
                  específicos previstos em lei, como em situações de emergência, quando o 
                  valor for abaixo do limite legal, ou quando a licitação for considerada 
                  inviável.
                </p>
                <p>
                  Prevista no Art. 24 da Lei nº 8.666/1993.
                </p>
              </div>
            )}
            
            {selectedModalityId === 4 && (
              <div className="space-y-4">
                <p>
                  <strong>Inexigibilidade</strong> - Contratação direta, sem licitação, 
                  quando houver inviabilidade de competição, como na contratação de 
                  serviços técnicos de natureza singular, com profissionais ou empresas 
                  de notória especialização.
                </p>
                <p>
                  Prevista no Art. 25 da Lei nº 8.666/1993.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BiddingFlow;
