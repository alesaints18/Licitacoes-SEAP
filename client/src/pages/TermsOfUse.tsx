import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";

const TermsOfUse = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-3xl shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">
            Termos de Uso do Software
          </CardTitle>
          <CardDescription>
            Sistema de Controle de Processos de Licitação - SEAP-PB
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="prose dark:prose-invert max-w-none">
            <h3>1. Aceitação dos Termos</h3>
            <p>Ao utilizar o software Sistema de Controle de Processos de Licitação da SEAP-PB, você concorda em cumprir estes Termos de Uso e todas as leis e regulamentos aplicáveis.</p>
            
            <h3>2. Licença de Uso</h3>
            <p>Este software é fornecido para uso exclusivo dos funcionários e colaboradores autorizados da Secretaria de Estado da Administração Penitenciária. O uso não autorizado é estritamente proibido.</p>
            
            <h3>3. Restrições</h3>
            <p>É expressamente proibido:</p>
            <ul>
              <li>Copiar, modificar ou distribuir o software sem autorização</li>
              <li>Utilizar o software para fins não relacionados às atividades da SEAP-PB</li>
              <li>Realizar engenharia reversa do código</li>
              <li>Remover ou alterar avisos de direitos autorais</li>
            </ul>
            
            <h3>4. Segurança e Privacidade</h3>
            <p>Os usuários são responsáveis por manter suas credenciais seguras e por todas as atividades realizadas sob sua conta. Qualquer suspeita de uso não autorizado deve ser reportada imediatamente.</p>
            
            <h3>5. Disponibilidade e Suporte</h3>
            <p>O sistema é fornecido "como está", sem garantias de disponibilidade contínua. A equipe de TI da SEAP-PB é responsável pelo suporte e manutenção do sistema.</p>
            
            <h3>6. Alterações aos Termos</h3>
            <p>A SEAP-PB reserva-se o direito de modificar estes termos a qualquer momento. As alterações entrarão em vigor imediatamente após sua publicação.</p>
          </div>
        </CardContent>
        <CardFooter className="justify-center">
          <Button variant="outline" size="sm" asChild>
            <Link href="/download/seappb2025">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Voltar para Download
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default TermsOfUse;