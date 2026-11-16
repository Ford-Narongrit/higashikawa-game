import type { Team } from "./types";

// Mirrors the `teams` table seed. Static so the UI can colour itself before any fetch.
export const TEAMS: Team[] = [
  { id: 1, key: "spade", symbol: "♠", name_ja: "スペード", color: "#2563eb" },
  { id: 2, key: "heart", symbol: "♥", name_ja: "ハート", color: "#dc2626" },
  { id: 3, key: "diamond", symbol: "♦", name_ja: "ダイヤ", color: "#eab308" },
  { id: 4, key: "club", symbol: "♣", name_ja: "クラブ", color: "#16a34a" },
];

export function teamById(id: number | null | undefined): Team | undefined {
  return TEAMS.find((t) => t.id === id);
}
