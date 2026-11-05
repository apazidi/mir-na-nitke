export interface Stage { at: number; image?: string; label?: string }
export interface Item { id: string; workUnits: number; yarnCost: number; art: { stages: Stage[] } }
export interface Interaction {
  id: string; requires: string[]; action: 'pet' | 'sniff';
  trigger: 'manual' | 'idle'; amount: number; cooldownMs: number;
}
export interface Meadow {
  id: string; slots: { id: string; itemId: string }[];
  passive?: { id: string; requires: string[]; ratePerHour: number }[];
  interactions?: Interaction[];
}
export interface Upgrade {
  id: string; target: 'click' | 'idle'; baseCost: number;
  costMultiplier: number; amount: number; maxLevel: number;
}
export interface Config {
  initialYarn: number; reserveYarnPerHour: number; clickWork: number;
  idleWorkPerSecond: number; maxOfflineMs: number;
  items: Item[]; meadows: Meadow[]; upgrades: Upgrade[];
}
export interface State {
  version: 1; lastTimestamp: number; wallet: { yarn: number };
  project: { itemId: string; work: number } | null;
  owned: string[]; placements: Record<string, Record<string, string>>;
  upgrades: Record<string, number>; cooldowns: Record<string, number>;
  transactionSequence: number;
}
export type Action = { now: number } & (
  { type: 'startProject'; itemId: string } |
  { type: 'click' | 'completeCraft' } |
  { type: 'buyUpgrade'; upgradeId: string } |
  { type: 'placeItem'; meadowId: string; slotId: string } |
  { type: 'pet' | 'sniff'; meadowId: string; interactionId: string }
);
export interface View {
  wallet: State['wallet']; owned: string[];
  project: (NonNullable<State['project']> & { progress: number; stage: number; canComplete: boolean }) | null;
  projects: { itemId: string; yarnCost: number; canStart: boolean }[];
  upgrades: { id: string; level: number; cost: number; canBuy: boolean }[];
  meadows: { id: string;
    slots: (Meadow['slots'][number] & { placed: boolean; canPlace: boolean })[];
    interactions: { id: string; action: Interaction['action']; trigger: Interaction['trigger']; available: boolean; readyAt: number | null }[];
  }[];
}
export function validateConfig(config: Config): Config;
export function createInitialState(config: Config, now: number): State;
export function advanceTime(state: State, now: number, config: Config): State;
export function dispatch(state: State, action: Action, config: Config): State;
export function selectView(state: State, catalog: Config): View;
export function serializeState(state: State): string;
export function deserializeState(json: string, config: Config): State;
