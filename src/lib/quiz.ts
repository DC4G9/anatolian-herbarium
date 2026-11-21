export type Outcome = "green" | "yellow" | "red";
export const MAX_TRIES = 3;
export const ROUND_SIZES = [15, 30, 50, "all"] as const;
export type RoundSize = (typeof ROUND_SIZES)[number];

export function shuffle<T>(items: readonly T[], rand: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j] as T, a[i] as T]; }
  return a;
}
export function pickQuestions<T>(items: readonly T[], size: RoundSize, rand?: () => number): T[] {
  const s = shuffle(items, rand);
  return size === "all" ? s : s.slice(0, Math.min(size, s.length));
}
/** Result after a click. `misses` = wrong clicks before this one. null = keep guessing. */
export function judge(correct: boolean, misses: number): Outcome | null {
  if (correct) return misses === 0 ? "green" : "yellow";
  return misses + 1 >= MAX_TRIES ? "red" : null;
}
/** Points for one answer. `streak` = streak including this answer, `seconds` = answer time. */
export function points(outcome: Outcome, misses: number, streak: number, seconds: number): number {
  if (outcome === "red") return 0;
  if (outcome === "yellow") return misses <= 1 ? 60 : 30;
  const streakBonus = Math.min(Math.max(streak - 1, 0), 5) * 10;
  const speedBonus = seconds < 5 ? 20 : 0;
  return 100 + streakBonus + speedBonus;
}
export function rankFor(accuracy: number): string {
  if (accuracy >= 90) return "Anadolu Etnobotanikçisi";
  if (accuracy >= 70) return "Herbaryum Uzmanı";
  if (accuracy >= 45) return "Botanik Gezgini";
  return "Çırak Herbaryumcu";
}
