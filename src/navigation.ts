/**
 * Shared navigation type for the React Navigation native stack.
 *
 * Adding a new screen? Add it here AND register it in App.tsx.
 */

export type GameMode = 'vsBot' | 'local2P';

export interface GameStartParams {
  mode: GameMode;
  defenderLevel: 1 | 2 | 3 | 4;
}

export type RootStackParamList = {
  Home: undefined;
  Game: GameStartParams;
  Progression: undefined;
  Settings: undefined;
};
