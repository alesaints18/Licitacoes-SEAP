import { useEffect } from "react";
import { useLocation } from "wouter";
import logoPb4k from "@assets/Logo PB 4k_1756265065361.png";

export function LoginIntro() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redireciona para o dashboard após 4 segundos
    const timer = setTimeout(() => {
      setLocation("/");
    }, 4000);

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
          animation-delay: 3s;
        }
      `}</style>
      
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: '#5892c2' }}>
        <div className="text-center animate-fadeOut">
          <img 
            src={logoPb4k} 
            alt="Logo Paraíba" 
            className="w-[40%] mx-auto opacity-0 animate-fadeInScale"
            style={{ width: '40%', maxWidth: '400px' }}
          />
          <div className="mt-5 text-2xl font-bold text-white opacity-0 animate-fadeInDelayed" style={{ fontFamily: "Verdana" }}>
            Sistema de Controle de Processos de Licitação
          </div>
        </div>
      </div>
    </>
  );
}