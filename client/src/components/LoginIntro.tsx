import { useEffect } from "react";
import { useLocation } from "wouter";

export function LoginIntro() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redireciona para o dashboard após 3.5 segundos
    const timer = setTimeout(() => {
      setLocation("/");
    }, 3500);

    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <>
      <style>{`
        @keyframes fadeInScale {
          from { 
            transform: scale(0.5); 
            opacity: 0; 
          }
          to { 
            transform: scale(1); 
            opacity: 1; 
          }
        }

        @keyframes fadeInDelayed {
          to { 
            opacity: 1; 
          }
        }

        @keyframes fadeOut {
          to { 
            opacity: 0; 
            visibility: hidden; 
          }
        }

        .animate-fadeInScale {
          animation: fadeInScale 2s ease forwards;
        }

        .animate-fadeInDelayed {
          animation: fadeInDelayed 2s ease forwards;
          animation-delay: 1s;
        }

        .animate-fadeOut {
          animation: fadeOut 1s ease forwards;
          animation-delay: 3s;
        }
      `}</style>
      
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900">
        <div className="text-center animate-fadeOut">
          <img 
            src="https://paraiba.pb.gov.br/marca-do-governo/GovPBT.png" 
            alt="Logo SEAP" 
            className="w-48 mx-auto opacity-0 animate-fadeInScale"
            onError={(e) => {
              // Fallback para uma div com texto se a imagem não carregar
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="mt-5 text-2xl font-bold text-white opacity-0 animate-fadeInDelayed" style={{ fontFamily: "Verdana" }}>
            Sistema de Controle de Processos de Licitação
          </div>
        </div>
      </div>
    </>
  );
}