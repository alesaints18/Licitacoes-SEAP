import { useEffect } from "react";
import { useLocation } from "wouter";
import seapIntroGif from "@assets/Seap Intro_1756074255110.gif";

export function LoginIntro() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redireciona para o dashboard após 6,5 segundos
    const timer = setTimeout(() => {
      setLocation("/");
    }, 6500);

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
          animation: fadeInScale 1s ease forwards;
        }

        .animate-fadeInDelayed {
          animation: fadeInDelayed 1s ease forwards;
          animation-delay: 1s;
        }

        .animate-fadeOut {
          animation: fadeOut 1s ease forwards;
          animation-delay: 5.5s;
        }
      `}</style>
      
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: '#5892c2' }}>
        <div className="text-center animate-fadeOut">
          <img 
            src={seapIntroGif} 
            alt="SEAP Intro" 
            className="w-[50%] mx-auto opacity-0 animate-fadeInScale"
            style={{ width: '50%' }}
          />
          <div className="mt-5 text-2xl font-bold text-white opacity-0 animate-fadeInDelayed" style={{ fontFamily: "Verdana" }}>
            Sistema de Controle de Processos de Licitação
          </div>
        </div>
      </div>
    </>
  );
}