import { useEffect, useRef } from 'react';

/**
 * Hook para executar uma função em intervalos regulares. 
 * Baseado na implementação de Dan Abramov: https://overreacted.io/making-setinterval-declarative-with-react-hooks/
 * 
 * @param callback Função a ser executada no intervalo
 * @param delay Intervalo em milissegundos (null para pausar)
 */
export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef<() => void>(callback);

  // Salva a última callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Configura o intervalo
  useEffect(() => {
    function tick() {
      savedCallback.current();
    }

    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}