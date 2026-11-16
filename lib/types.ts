export type Room = "A" | "B" | "C" | "D" | "E" | "F";
export const ROOMS: Room[] = ["A", "B", "C", "D", "E", "F"];

export type ScreenView = "join" | "teams" | "leaderboard" | "tree";
export const SCREEN_VIEWS: ScreenView[] = ["join", "teams", "leaderboard", "tree"];

export type Team = {
  id: number;
  key: "spade" | "heart" | "diamond" | "club";
  symbol: string;
  name_ja: string;
  color: string;
};

export type GameState = {
  teams_revealed: boolean;
  box_open: boolean;
  photo_open: boolean;
  screen_view: ScreenView;
  updated_at: string;
};

export type Me = {
  id: string;
  name: string;
  room: Room;
  team_id: number | null;
};

export type MeResponse = {
  player: Me;
  state: GameState;
  playerCount: number;
  scores: TeamScore[];
};

export type ScreenPlayer = {
  id: string;
  name: string;
  room: Room;
  team_id: number | null;
  created_at: string;
};

export type AdminPlayer = ScreenPlayer & { last_seen_at: string };

export type TeamScore = { team_id: number; score: number };

export type ScoreKind = "admin" | "box" | "photo";

export type ScoreEvent = {
  id: number;
  team_id: number;
  points: number;
  kind: ScoreKind;
  label: string | null;
  player_name: string | null;
  photo_id: string | null;
  voided: boolean;
  created_at: string;
};
