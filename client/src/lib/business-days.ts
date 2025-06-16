// Utilitário para cálculo de dias úteis no cliente
export function addBusinessDays(startDate: Date, days: number): Date {
  const result = new Date(startDate);
  let addedDays = 0;
  
  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    
    // Verifica se é fim de semana (sábado = 6, domingo = 0)
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      // Verifica se não é feriado nacional
      if (!isHoliday(result)) {
        addedDays++;
      }
    }
  }
  
  return result;
}

// Feriados nacionais fixos do Brasil
function isHoliday(date: Date): boolean {
  const month = date.getMonth() + 1; // getMonth() retorna 0-11
  const day = date.getDate();
  
  // Feriados fixos
  const fixedHolidays = [
    { month: 1, day: 1 },   // Confraternização Universal
    { month: 4, day: 21 },  // Tiradentes
    { month: 5, day: 1 },   // Dia do Trabalhador
    { month: 9, day: 7 },   // Independência do Brasil
    { month: 10, day: 12 }, // Nossa Senhora Aparecida
    { month: 11, day: 2 },  // Finados
    { month: 11, day: 15 }, // Proclamação da República
    { month: 12, day: 25 }, // Natal
  ];
  
  return fixedHolidays.some(holiday => 
    holiday.month === month && holiday.day === day
  );
}

// Calcula quantos dias úteis existem entre duas datas
export function getBusinessDaysBetween(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    if (current.getDay() !== 0 && current.getDay() !== 6 && !isHoliday(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

// Verifica se uma data é dia útil
export function isBusinessDay(date: Date): boolean {
  return date.getDay() !== 0 && date.getDay() !== 6 && !isHoliday(date);
}