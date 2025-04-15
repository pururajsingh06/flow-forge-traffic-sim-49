
// qlearning.ts - Q-Learning Controller for Traffic Simulation
export type Phase = 'NS' | 'EW';
export type Action = 'stay' | 'switch';

export interface TrafficState {
  nsQueue: number;
  ewQueue: number;
  currentPhase: Phase;
  timeInPhase: number;
}

type QTable = Record<string, Record<Action, number>>;

// Global Q-table
const Q: QTable = {};
const alpha = 0.1; // Learning rate
const gamma = 0.9; // Discount factor
const epsilon = 0.1; // Exploration rate - using a fixed value to ensure stable learning

// Convert a traffic state to a string key for the Q-table
export function getStateKey(state: TrafficState): string {
  // Discretize state to prevent Q-table explosion
  // Cap queue lengths at 10 for state representation
  return `${Math.min(10, state.nsQueue)}_${Math.min(10, state.ewQueue)}_${state.currentPhase}_${Math.min(5, state.timeInPhase)}`;
}

// Calculate reward based on current state
export function getReward(state: TrafficState): number {
  // Negative reward based on queue lengths - we want to minimize waiting vehicles
  const queuePenalty = -(state.nsQueue + state.ewQueue);
  
  // Additional penalty for very long queues (to prioritize addressing severe congestion)
  const congestionPenalty = 
    (state.nsQueue > 8 ? -5 : 0) + 
    (state.ewQueue > 8 ? -5 : 0);
  
  // Penalty for frequent switching (to avoid flickering lights)
  const switchingPenalty = state.timeInPhase < 2 ? -3 : 0;
  
  return queuePenalty + congestionPenalty + switchingPenalty;
}

// Choose an action based on the current state
export function chooseAction(stateKey: string): Action {
  // Initialize Q-values for this state if they don't exist
  if (!Q[stateKey]) {
    Q[stateKey] = { stay: 0, switch: 0 };
  }
  
  // Exploration: choose a random action
  if (Math.random() < epsilon) {
    return Math.random() < 0.5 ? 'stay' : 'switch';
  }
  
  // Exploitation: choose the best action
  const actions = Q[stateKey];
  return actions.stay >= actions.switch ? 'stay' : 'switch';
}

// Update Q-table using the Q-learning algorithm
export function updateQTable(prevKey: string, action: Action, reward: number, nextKey: string): void {
  // Initialize Q-values if they don't exist
  if (!Q[prevKey]) Q[prevKey] = { stay: 0, switch: 0 };
  if (!Q[nextKey]) Q[nextKey] = { stay: 0, switch: 0 };

  // Q-learning update formula: Q(s,a) = Q(s,a) + alpha * [r + gamma * max Q(s',a') - Q(s,a)]
  const oldValue = Q[prevKey][action];
  const nextMax = Math.max(Q[nextKey].stay, Q[nextKey].switch);
  Q[prevKey][action] = oldValue + alpha * (reward + gamma * nextMax - oldValue);
}

// Simulate the next state after taking an action
export function simulateNextState(state: TrafficState, action: Action): TrafficState {
  // Determine the new phase
  const newPhase: Phase = (action === 'switch')
    ? (state.currentPhase === 'NS' ? 'EW' : 'NS')
    : state.currentPhase;

  // Simulate random arrivals (0-2 cars per direction)
  const nsArrivals = Math.floor(Math.random() * 3);
  const ewArrivals = Math.floor(Math.random() * 3);

  // Calculate departures based on green light
  const nsDepartures = newPhase === 'NS' ? Math.min(state.nsQueue, 2) : 0;
  const ewDepartures = newPhase === 'EW' ? Math.min(state.ewQueue, 2) : 0;

  // Update queues and time in phase
  return {
    currentPhase: newPhase,
    timeInPhase: newPhase === state.currentPhase ? state.timeInPhase + 1 : 1,
    nsQueue: Math.max(0, state.nsQueue - nsDepartures) + nsArrivals,
    ewQueue: Math.max(0, state.ewQueue - ewDepartures) + ewArrivals,
  };
}

// Main controller function
export function qLearningController(currentState: TrafficState): TrafficState {
  // Get the state key for the current state
  const prevKey = getStateKey(currentState);
  
  // Choose an action using the Q-learning policy
  const action = chooseAction(prevKey);

  // Simulate the next state
  const nextState = simulateNextState(currentState, action);
  
  // Calculate the reward
  const reward = getReward(nextState);
  
  // Get the state key for the next state
  const nextKey = getStateKey(nextState);

  // Update the Q-table
  updateQTable(prevKey, action, reward, nextKey);
  
  // Return the next state
  return nextState;
}

// Save and load Q-table to/from localStorage
export function saveQTable(): void {
  try {
    localStorage.setItem('qTable', JSON.stringify(Q));
    console.log('Q-table saved successfully');
  } catch (error) {
    console.error('Error saving Q-table:', error);
  }
}

export function loadQTable(): void {
  try {
    const saved = localStorage.getItem('qTable');
    if (saved) {
      const parsedTable = JSON.parse(saved);
      // Update the global Q-table with saved values
      Object.keys(parsedTable).forEach(key => {
        Q[key] = parsedTable[key];
      });
      console.log('Q-table loaded successfully');
    }
  } catch (error) {
    console.error('Error loading Q-table:', error);
  }
}
