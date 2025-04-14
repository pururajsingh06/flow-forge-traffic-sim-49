// qlearning.ts
export type Phase = 'NS' | 'EW';
export type Action = 'stay' | 'switch';

export interface TrafficState {
  nsQueue: number;
  ewQueue: number;
  currentPhase: Phase;
  timeInPhase: number;
}

type QTable = Record<string, Record<Action, number>>;

const Q: QTable = {};
const alpha = 0.1;
const gamma = 0.9;
let epsilon = 0.1; // For exploration, use 0 after training

function getStateKey(state: TrafficState): string {
  return `${Math.min(10, state.nsQueue)}_${Math.min(10, state.ewQueue)}_${state.currentPhase}`;
}

function getReward(state: TrafficState): number {
  return -1 * (state.nsQueue + state.ewQueue); // Encourage clearing queues
}

function chooseAction(stateKey: string): Action {
  if (!Q[stateKey]) Q[stateKey] = { stay: 0, switch: 0 };
  if (Math.random() < epsilon) return Math.random() < 0.5 ? 'stay' : 'switch';

  const actions = Q[stateKey];
  return actions.stay >= actions.switch ? 'stay' : 'switch';
}

function updateQTable(prevKey: string, action: Action, reward: number, nextKey: string): void {
  if (!Q[prevKey]) Q[prevKey] = { stay: 0, switch: 0 };
  if (!Q[nextKey]) Q[nextKey] = { stay: 0, switch: 0 };

  const oldValue = Q[prevKey][action];
  const nextMax = Math.max(Q[nextKey].stay, Q[nextKey].switch);
  Q[prevKey][action] = oldValue + alpha * (reward + gamma * nextMax - oldValue);
}

function simulateNextState(state: TrafficState, action: Action): TrafficState {
  const newPhase: Phase = (action === 'switch')
    ? (state.currentPhase === 'NS' ? 'EW' : 'NS')
    : state.currentPhase;

  const nsArrivals = Math.floor(Math.random() * 3); // 0–2 cars
  const ewArrivals = Math.floor(Math.random() * 3);

  const nsDepartures = newPhase === 'NS' ? Math.min(state.nsQueue, 2) : 0;
  const ewDepartures = newPhase === 'EW' ? Math.min(state.ewQueue, 2) : 0;

  return {
    currentPhase: newPhase,
    timeInPhase: newPhase === state.currentPhase ? state.timeInPhase + 1 : 1,
    nsQueue: Math.max(0, state.nsQueue - nsDepartures) + nsArrivals,
    ewQueue: Math.max(0, state.ewQueue - ewDepartures) + ewArrivals,
  };
}

// Main controller function
export function qLearningController(currentState: TrafficState): TrafficState {
  const prevKey = getStateKey(currentState);
  const action = chooseAction(prevKey);

  const nextState = simulateNextState(currentState, action);
  const reward = getReward(nextState);
  const nextKey = getStateKey(nextState);

  updateQTable(prevKey, action, reward, nextKey);
  return nextState;
}

// Optional save/load Q-table
export function saveQTable(): void {
  localStorage.setItem('qTable', JSON.stringify(Q));
}

export function loadQTable(): void {
  const saved = localStorage.getItem('qTable');
  if (saved) Object.assign(Q, JSON.parse(saved));
}
