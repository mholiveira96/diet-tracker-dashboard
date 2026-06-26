export type HistoryDay = {
  day: string;
  kcal: number;
  protein: number;
  workouts_kcal: number;
  net_kcal: number;
};

export function buildDenseHistory(
  rows?: Array<Partial<HistoryDay>>,
  options?: { endDate: string; days?: number }
): HistoryDay[];
