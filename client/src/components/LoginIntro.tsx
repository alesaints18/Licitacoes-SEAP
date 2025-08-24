import { useEffect } from "react";
import { useLocation } from "wouter";
import seapLogo from "@assets/0c23f6f0-fd84-44a4-8f77-554f3bee6049-removebg-preview_1756065735485.png";

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
            src={seapLogo} 
            alt="Logo SEAP" 
            className="w-48 mx-auto opacity-0 animate-fadeInScale"
          />
          <div className="mt-5 text-2xl font-bold text-white opacity-0 animate-fadeInDelayed" style={{ fontFamily: "Verdana" }}>
            Sistema de Controle de Processos de Licitação
          </div>
        </div>
      </div>
    </>
  );
}