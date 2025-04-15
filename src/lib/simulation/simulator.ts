import { SimulationState, Vehicle, TrafficLight, Direction, LightState } from './types';

// Base controller interface
export interface TrafficController {
  update(state: SimulationState, deltaTime: number): SimulationState;
  getName(): string;
  getDescription(): string;
}

// Fixed timing controller (traditional traffic lights)
export class FixedTimingController implements TrafficController {
  getName(): string {
    return "Fixed Timing";
  }
  
  getDescription(): string {
    return "Traditional traffic lights with fixed timing regardless of traffic conditions.";
  }

  update(state: SimulationState, deltaTime: number): SimulationState {
    const newState = { ...state };
    const { greenDuration, yellowDuration } = state.config.aiParams;
    const totalCycleDuration = (greenDuration + yellowDuration) * 2;
    
    // Calculate traffic density to provide feedback even though this controller doesn't use it
    const trafficDensity = this.calculateTrafficDensity(state.vehicles);
    newState.statistics.trafficDensity = trafficDensity;
    
    newState.trafficLights = state.trafficLights.map(light => {
      const newLight = { ...light };
      newLight.timer += deltaTime;
      
      // North-South green, East-West red
      if (['north', 'south'].includes(light.direction)) {
        if (newLight.timer % totalCycleDuration < greenDuration) {
          newLight.state = 'green';
        } else if (newLight.timer % totalCycleDuration < greenDuration + yellowDuration) {
          newLight.state = 'yellow';
        } else {
          newLight.state = 'red';
        }
      } 
      // East-West green, North-South red
      else {
        if (newLight.timer % totalCycleDuration < greenDuration) {
          newLight.state = 'red';
        } else if (newLight.timer % totalCycleDuration < greenDuration + yellowDuration) {
          newLight.state = 'red';
        } else if (newLight.timer % totalCycleDuration < 2 * greenDuration + yellowDuration) {
          newLight.state = 'green';
        } else {
          newLight.state = 'yellow';
        }
      }
      
      return newLight;
    });
    
    return newState;
  }
  
  // Calculate traffic density for each direction
  private calculateTrafficDensity(vehicles: Vehicle[]): { north: number; south: number; east: number; west: number; } {
    const density = { north: 0, south: 0, east: 0, west: 0 };
    
    vehicles.forEach(vehicle => {
      density[vehicle.direction]++;
    });
    
    return density;
  }
}

// Adaptive controller (responds to traffic volume)
export class AdaptiveController implements TrafficController {
  private trafficHistory: { ns: {count: number, timestamp: number}[]; ew: {count: number, timestamp: number}[]; } = { 
    ns: [], 
    ew: [] 
  };
  private maxHistoryLength = 10;
  private currentDirection: 'ns' | 'ew' = 'ns';
  private switchTimer = 0;
  private lastSwitchTime = 0;
  private currentPhase: 'green' | 'yellow' | 'red-transition' = 'green';
  
  getName(): string {
    return "Adaptive Timing";
  }
  
  getDescription(): string {
    return "Intelligently adjusts light timing based on real-time traffic conditions and vehicle counts.";
  }

  update(state: SimulationState, deltaTime: number): SimulationState {
    const newState = { ...state };
    const { yellowDuration } = state.config.aiParams;
    const minGreenTime = state.config.aiParams.adaptiveMinGreenTime || 3; // Default if not set
    const maxWaitTime = state.config.aiParams.adaptiveMaxWaitTime || 20; // Default if not set
    
    // Count vehicles in each direction with distance weighting
    const trafficDensity = this.calculateWeightedTrafficDensity(state.vehicles);
    newState.statistics.trafficDensity = trafficDensity;
    
    // Get totals by axis
    const northSouthCount = trafficDensity.north + trafficDensity.south;
    const eastWestCount = trafficDensity.east + trafficDensity.west;
    
    // Add current counts to history with timestamp
    const currentTime = state.time;
    this.trafficHistory.ns.push({ count: northSouthCount, timestamp: currentTime });
    this.trafficHistory.ew.push({ count: eastWestCount, timestamp: currentTime });
    
    // Keep history at max length and remove old entries (older than 10 seconds)
    this.trafficHistory.ns = this.trafficHistory.ns
      .filter(entry => currentTime - entry.timestamp < 10)
      .slice(-this.maxHistoryLength);
    
    this.trafficHistory.ew = this.trafficHistory.ew
      .filter(entry => currentTime - entry.timestamp < 10)
      .slice(-this.maxHistoryLength);
    
    // Calculate weighted average traffic with recency and trend analysis
    const { avgNS, avgEW, trendNS, trendEW } = this.calculateTrafficMetrics();
    
    // Update timers
    this.switchTimer += deltaTime;
    this.lastSwitchTime += deltaTime;
    
    // Determine current phase state
    const nsGreen = state.trafficLights.some(light => 
      ['north', 'south'].includes(light.direction) && light.state === 'green'
    );
    const ewGreen = state.trafficLights.some(light => 
      ['east', 'west'].includes(light.direction) && light.state === 'green'
    );
    
    let shouldSwitchToNS = false;
    let shouldSwitchToEW = false;
    
    // Advanced decision logic based on traffic counts, trends, and timing constraints
    if (this.currentPhase === 'green') {
      if (nsGreen) {
        // If NS has green, check if should switch to EW
        if ((eastWestCount > northSouthCount * 1.5 || trendEW > 0.5) && this.switchTimer >= minGreenTime) {
          shouldSwitchToEW = true;
          this.currentPhase = 'yellow';
        }
      } else if (ewGreen) {
        // If EW has green, check if should switch to NS
        if ((northSouthCount > eastWestCount * 1.5 || trendNS > 0.5) && this.switchTimer >= minGreenTime) {
          shouldSwitchToNS = true;
          this.currentPhase = 'yellow';
        }
      }
      
      // Force switch if one direction has had a very long wait and has traffic
      if (ewGreen && this.lastSwitchTime > maxWaitTime && northSouthCount > 0) {
        shouldSwitchToNS = true;
        this.currentPhase = 'yellow';
      } else if (nsGreen && this.lastSwitchTime > maxWaitTime && eastWestCount > 0) {
        shouldSwitchToEW = true;
        this.currentPhase = 'yellow';
      }
    }
    
    // Update traffic lights based on vehicle counts and phase
    newState.trafficLights = state.trafficLights.map(light => {
      const newLight = { ...light };
      newLight.timer += deltaTime;
      
      const isNorthSouth = ['north', 'south'].includes(light.direction);
      const isEastWest = ['east', 'west'].includes(light.direction);
      
      // Process NS lights
      if (isNorthSouth) {
        if (shouldSwitchToEW && newLight.state === 'green') {
          // Switch from green to yellow
          newLight.state = 'yellow';
          newLight.timer = 0;
          this.switchTimer = 0;
        } else if (newLight.state === 'yellow' && newLight.timer >= yellowDuration) {
          // Switch from yellow to red
          newLight.state = 'red';
          newLight.timer = 0;
          if (this.currentPhase === 'yellow') {
            this.currentPhase = 'red-transition';
          }
        } else if (shouldSwitchToNS && newLight.state === 'red') {
          // Switch from red to green
          newLight.state = 'green';
          newLight.timer = 0;
          this.lastSwitchTime = 0;
          this.switchTimer = 0;
          this.currentPhase = 'green';
        }
      }
      
      // Process EW lights
      if (isEastWest) {
        if (shouldSwitchToNS && newLight.state === 'green') {
          // Switch from green to yellow
          newLight.state = 'yellow';
          newLight.timer = 0;
          this.switchTimer = 0;
        } else if (newLight.state === 'yellow' && newLight.timer >= yellowDuration) {
          // Switch from yellow to red
          newLight.state = 'red';
          newLight.timer = 0;
          if (this.currentPhase === 'yellow') {
            this.currentPhase = 'red-transition';
          }
        } else if (shouldSwitchToEW && newLight.state === 'red') {
          // Switch from red to green
          newLight.state = 'green';
          newLight.timer = 0;
          this.lastSwitchTime = 0;
          this.switchTimer = 0;
          this.currentPhase = 'green';
        }
      }
      
      return newLight;
    });
    
    // Complete phase transition if all yellows have turned red
    if (this.currentPhase === 'red-transition') {
      const allYellowsComplete = newState.trafficLights.every(light => 
        light.state !== 'yellow'
      );
      
      if (allYellowsComplete) {
        // Determine which direction should now get green based on traffic
        const directionToGreen = northSouthCount >= eastWestCount ? 'ns' : 'ew';
        
        newState.trafficLights = newState.trafficLights.map(light => {
          const isNorthSouth = ['north', 'south'].includes(light.direction);
          const isEastWest = ['east', 'west'].includes(light.direction);
          
          if ((directionToGreen === 'ns' && isNorthSouth) || 
              (directionToGreen === 'ew' && isEastWest)) {
            return { ...light, state: 'green', timer: 0 };
          }
          return light;
        });
        
        this.lastSwitchTime = 0;
        this.switchTimer = 0;
        this.currentDirection = directionToGreen;
        this.currentPhase = 'green';
      }
    }
    
    // Ensure there's always at least one direction with green lights
    const anyGreen = newState.trafficLights.some(light => light.state === 'green');
    
    if (!anyGreen && this.currentPhase === 'green') {
      // If no lights are green but we should be in green phase, 
      // set the direction with more traffic to green
      const directionToGreen = northSouthCount >= eastWestCount ? 'ns' : 'ew';
      
      newState.trafficLights = newState.trafficLights.map(light => {
        const isNorthSouth = ['north', 'south'].includes(light.direction);
        const isEastWest = ['east', 'west'].includes(light.direction);
        
        if ((directionToGreen === 'ns' && isNorthSouth) || 
            (directionToGreen === 'ew' && isEastWest)) {
          return { ...light, state: 'green', timer: 0 };
        }
        return light;
      });
      
      this.lastSwitchTime = 0;
      this.switchTimer = 0;
      this.currentDirection = directionToGreen;
    }
    
    return newState;
  }
  
  // Calculate traffic density for each direction with distance weighting
  private calculateWeightedTrafficDensity(vehicles: Vehicle[]): { north: number; south: number; east: number; west: number; } {
    const density = { north: 0, south: 0, east: 0, west: 0 };
    const intersectionCenter = { x: 300, y: 200 };
    const maxDistance = 200; // Maximum distance to consider for weighting
    
    vehicles.forEach(vehicle => {
      // Calculate distance to intersection
      const dx = vehicle.position.x - intersectionCenter.x;
      const dy = vehicle.position.y - intersectionCenter.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Weight calculation: closer vehicles get higher weight (1.0 to 0.2)
      let weight = 1.0;
      if (distance <= maxDistance) {
        // Exponential decay formula: closer vehicles matter more
        weight = 1.0 * Math.exp(-0.008 * distance);
      } else {
        weight = 0.2; // Minimum weight for very distant vehicles
      }
      
      // Add weighted vehicle count
      density[vehicle.direction] += weight;
    });
    
    return density;
  }
  
  // Calculate traffic metrics including averages and trends
  private calculateTrafficMetrics() {
    // Recent history has higher weight
    const recentWeight = 1.5;
    let weightedNS = 0;
    let weightedEW = 0;
    let totalWeight = 0;
    
    // Calculate weighted averages
    for (let i = 0; i < this.trafficHistory.ns.length; i++) {
      const weight = i === this.trafficHistory.ns.length - 1 ? recentWeight : 1;
      weightedNS += this.trafficHistory.ns[i].count * weight;
      weightedEW += this.trafficHistory.ew[i].count * weight;
      totalWeight += weight;
    }
    
    const avgNS = weightedNS / (totalWeight || 1); // Avoid division by zero
    const avgEW = weightedEW / (totalWeight || 1);
    
    // Calculate trends (rate of change over time)
    let trendNS = 0;
    let trendEW = 0;
    
    if (this.trafficHistory.ns.length >= 3) {
      const recent = this.trafficHistory.ns.slice(-3);
      const oldAvg = (recent[0].count + recent[1].count) / 2;
      const newAvg = recent[2].count;
      trendNS = (newAvg - oldAvg) / (oldAvg || 1); // Normalized trend
      
      const recentEW = this.trafficHistory.ew.slice(-3);
      const oldAvgEW = (recentEW[0].count + recentEW[1].count) / 2;
      const newAvgEW = recentEW[2].count;
      trendEW = (newAvgEW - oldAvgEW) / (oldAvgEW || 1); // Normalized trend
    }
    
    return { avgNS, avgEW, trendNS, trendEW };
  }
}

// Reinforcement Learning controller (learns optimal timing)
export class ReinforcementLearningController implements TrafficController {
  private rewardHistory: number[] = [];
  private lastStateKey: string = '';
  private lastAction: string = '';
  private learningRate = 0.1;
  private discountFactor = 0.9;
  private explorationRate = 0.2;
  private qValues: Record<string, Record<string, number>> = {};
  private stateHistory: {state: string, action: string, reward: number}[] = [];
  private maxMemorySize = 100;
  private batchUpdateSize = 10;
  private updateCounter = 0;
  
  getName(): string {
    return "Reinforcement Learning";
  }
  
  getDescription(): string {
    return "Uses Q-learning to optimize traffic flow based on historical patterns and continuous adaptation.";
  }
  
  getCurrentState(state: SimulationState): string {
    // Calculate weighted traffic density for more accurate state representation
    const trafficDensity = this.calculateWeightedTrafficDensity(state.vehicles);
    
    // Get current light phase
    const nsGreen = state.trafficLights.some(light => 
      ['north', 'south'].includes(light.direction) && light.state === 'green'
    );
    
    // Calculate time in current phase
    const maxTime = state.trafficLights.reduce((max, light) => 
      Math.max(max, light.timer), 0);
    
    // Discretize traffic levels for each direction (low, medium, high)
    const nsLevel = this.discretizeTraffic(trafficDensity.north + trafficDensity.south);
    const ewLevel = this.discretizeTraffic(trafficDensity.east + trafficDensity.west);
    
    // Discretize phase duration
    const phaseDuration = this.discretizeTime(maxTime);
    
    // Current active phase
    const currentPhase = nsGreen ? 'ns' : 'ew';
    
    // Create a state key that captures the current traffic situation
    return `${nsLevel}_${ewLevel}_${currentPhase}_${phaseDuration}`;
  }
  
  discretizeTraffic(count: number): string {
    if (count < 1.5) return 'low';
    if (count < 4) return 'medium';
    return 'high';
  }
  
  discretizeTime(time: number): string {
    if (time < 5) return 'short';
    if (time < 15) return 'medium';
    return 'long';
  }
  
  getAvailableActions(state: SimulationState): string[] {
    // More granular actions based on current state
    const nsGreen = state.trafficLights.some(light => 
      ['north', 'south'].includes(light.direction) && light.state === 'green'
    );
    
    if (nsGreen) {
      return ['maintain_ns', 'extend_ns', 'switch_to_ew'];
    } else {
      return ['maintain_ew', 'extend_ew', 'switch_to_ns'];
    }
  }
  
  selectAction(stateKey: string, availableActions: string[], state: SimulationState): string {
    // Initialize Q-values for this state if they don't exist
    if (!this.qValues[stateKey]) {
      this.qValues[stateKey] = {};
      availableActions.forEach(action => {
        this.qValues[stateKey][action] = 0;
      });
    }
    
    // Exploration vs exploitation with decaying exploration rate
    // We reduce exploration rate as we learn more
    const effectiveExplorationRate = Math.max(0.05, this.explorationRate * (1 - state.time / 500));
    
    if (Math.random() < effectiveExplorationRate) {
      // Explore - random action with bias toward actions that make sense
      const randomIndex = Math.floor(Math.random() * availableActions.length);
      return availableActions[randomIndex];
    } else {
      // Exploit - choose action with highest Q-value
      let bestAction = availableActions[0];
      let bestValue = this.qValues[stateKey][bestAction] || 0;
      
      for (const action of availableActions) {
        const qValue = this.qValues[stateKey][action] || 0;
        if (qValue > bestValue) {
          bestValue = qValue;
          bestAction = action;
        }
      }
      
      return bestAction;
    }
  }
  
  calculateReward(state: SimulationState): number {
    // More sophisticated reward function
    const { averageWaitTime, throughput } = state.statistics;
    
    // Calculate vehicle density near intersection
    const nearbyVehicles = state.vehicles.filter(v => {
      const dx = v.position.x - 300; // Center x
      const dy = v.position.y - 200; // Center y
      const distanceSquared = dx * dx + dy * dy;
      return distanceSquared < 10000; // Within 100px of intersection
    }).length;
    
    // Reward is complex:
    // 1. Higher throughput is good (+)
    // 2. Lower wait times are good (+)
    // 3. Fewer vehicles near intersection is good (+)
    // 4. Long wait times are penalized more severely (-)
    
    return (throughput * 2) - (averageWaitTime * 0.8) - (nearbyVehicles * 0.5) - (Math.pow(averageWaitTime, 1.5) * 0.02);
  }
  
  applyAction(state: SimulationState, action: string): SimulationState {
    const newState = { ...state };
    const { yellowDuration } = state.config.aiParams;
    
    // Determine current phase
    const nsGreen = state.trafficLights.some(light => 
      ['north', 'south'].includes(light.direction) && light.state === 'green'
    );
    const ewGreen = state.trafficLights.some(light => 
      ['east', 'west'].includes(light.direction) && light.state === 'green'
    );
    
    // Apply the selected action
    if (action.includes('maintain')) {
      // Keep current phase, do nothing
    } else if (action.includes('extend')) {
      // Extend current phase - reset timers to give more green time
      newState.trafficLights = state.trafficLights.map(light => {
        if (light.state === 'green') {
          // Reset timer to half its current value to extend but not fully restart
          return { ...light, timer: Math.min(light.timer, 2) };
        }
        return { ...light };
      });
    } else if (action === 'switch_to_ew' && nsGreen) {
      // Switch from NS to EW
      newState.trafficLights = state.trafficLights.map(light => {
        if (['north', 'south'].includes(light.direction) && light.state === 'green') {
          return { ...light, state: 'yellow', timer: 0 };
        }
        return { ...light };
      });
    } else if (action === 'switch_to_ns' && ewGreen) {
      // Switch from EW to NS
      newState.trafficLights = state.trafficLights.map(light => {
        if (['east', 'west'].includes(light.direction) && light.state === 'green') {
          return { ...light, state: 'yellow', timer: 0 };
        }
        return { ...light };
      });
    }
    
    return newState;
  }
  
  updateQValues(stateKey: string, action: string, reward: number, nextStateKey: string): void {
    // Initialize if not existing
    if (!this.qValues[stateKey]) {
      this.qValues[stateKey] = {};
    }
    if (!this.qValues[stateKey][action]) {
      this.qValues[stateKey][action] = 0;
    }
    
    // Find maximum Q-value for next state
    let maxNextQ = 0;
    if (this.qValues[nextStateKey]) {
      maxNextQ = Math.max(...Object.values(this.qValues[nextStateKey]));
    }
    
    // Q-learning update formula
    const oldValue = this.qValues[stateKey][action];
    const newValue = oldValue + this.learningRate * (reward + this.discountFactor * maxNextQ - oldValue);
    
    this.qValues[stateKey][action] = newValue;
  }
  
  update(state: SimulationState, deltaTime: number): SimulationState {
    // Get current state representation
    const currentStateKey = this.getCurrentState(state);
    
    // Get available actions for the current state
    const availableActions = this.getAvailableActions(state);
    
    // Select an action using the policy (exploration vs exploitation)
    const selectedAction = this.selectAction(currentStateKey, availableActions, state);
    
    // Apply action to get the new state
    let newState = this.applyAction(state, selectedAction);
    
    // Calculate traffic density for statistics
    newState.statistics.trafficDensity = this.calculateWeightedTrafficDensity(state.vehicles);
    
    // Calculate reward for this state-action pair
    const reward = this.calculateReward(state);
    this.rewardHistory.push(reward);
    
    // Update Q-values if we have previous state-action
    if (this.lastStateKey && this.lastAction) {
      this.updateQValues(this.lastStateKey, this.lastAction, reward, currentStateKey);
      
      // Store transition in history for batch updates
      this.stateHistory.push({
        state: this.lastStateKey,
        action: this.lastAction,
        reward: reward
      });
      
      // Keep history size limited
      if (this.stateHistory.length > this.maxMemorySize) {
        this.stateHistory.shift();
      }
    }
    
    // Periodically perform batch updates from history (experience replay)
    this.updateCounter += 1;
    if (this.updateCounter >= this.batchUpdateSize && this.stateHistory.length > 10) {
      // Sample random transitions for experience replay
      for (let i = 0; i < 5; i++) {
        const randomIndex = Math.floor(Math.random() * this.stateHistory.length);
        const experience = this.stateHistory[randomIndex];
        
        // Find a next state to use (ideally the one that followed this state)
        let nextStateKey = currentStateKey; // Default to current if no better option
        if (randomIndex < this.stateHistory.length - 1) {
          nextStateKey = this.stateHistory[randomIndex + 1].state;
        }
        
        this.updateQValues(experience.state, experience.action, experience.reward, nextStateKey);
      }
      this.updateCounter = 0;
    }
    
    // Store state and action for next update
    this.lastStateKey = currentStateKey;
    this.lastAction = selectedAction;
    
    // Apply basic timing rules for light transitions
    const { greenDuration, yellowDuration } = state.config.aiParams;
    
    newState.trafficLights = newState.trafficLights.map(light => {
      const newLight = { ...light };
      newLight.timer += deltaTime;
      
      // Force yellow->red transition after yellowDuration
      if (newLight.state === 'yellow' && newLight.timer > yellowDuration) {
        newLight.state = 'red';
        newLight.timer = 0;
      }
      
      return newLight;
    });
    
    // Ensure traffic light consistency when one direction goes red
    const nsYellowToRed = newState.trafficLights.some(light => 
      ['north', 'south'].includes(light.direction) && 
      light.state === 'red' && 
      light.timer === 0
    );
    
    const ewYellowToRed = newState.trafficLights.some(light => 
      ['east', 'west'].includes(light.direction) && 
      light.state === 'red' && 
      light.timer === 0
    );
    
    // When NS turns red, make EW green (and vice versa)
    if (nsYellowToRed) {
      newState.trafficLights = newState.trafficLights.map(light => {
        if (['east', 'west'].includes(light.direction)) {
          return { ...light, state: 'green', timer: 0 };
        }
        return light;
      });
    }
    
    if (ewYellowToRed) {
      newState.trafficLights = newState.trafficLights.map(light => {
        if (['north', 'south'].includes(light.direction)) {
          return { ...light, state: 'green', timer: 0 };
        }
        return light;
      });
    }
    
    // Safety check: ensure at least one direction has green
    const anyGreen = newState.trafficLights.some(light => light.state === 'green');
    
    if (!anyGreen) {
      // No direction has green - force green based on traffic density
      const northSouthDensity = newState.statistics.trafficDensity?.north ?? 0 + newState.statistics.trafficDensity?.south ?? 0;
      const eastWestDensity = newState.statistics.trafficDensity?.east ?? 0 + newState.statistics.trafficDensity?.west ?? 0;
      
      const directionToMakeGreen = northSouthDensity >= eastWestDensity ? 'ns' : 'ew';
      
      newState.trafficLights = newState.trafficLights.map(light => {
        const isNorthSouth = ['north', 'south'].includes(light.direction);
        const isEastWest = ['east', 'west'].includes(light.direction);
        
        if ((directionToMakeGreen === 'ns' && isNorthSouth) || 
            (directionToMakeGreen === 'ew' && isEastWest)) {
          return { ...light, state: 'green', timer: 0 };
        }
        return light;
      });
    }
    
    return newState;
  }
  
  // Calculate traffic density for each direction with distance weighting
  private calculateWeightedTrafficDensity(vehicles: Vehicle[]): { north: number; south: number; east: number; west: number; } {
    const density = { north: 0, south: 0, east: 0, west: 0 };
    const intersectionCenter = { x: 300, y: 200 };
    const maxDistance = 200; // Maximum distance to consider for weighting
    
    vehicles.forEach(vehicle => {
      // Calculate distance to intersection
      const dx = vehicle.position.x - intersectionCenter.x;
      const dy = vehicle.position.y - intersectionCenter.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Weight calculation: closer vehicles get higher weight
      let weight = 1.0;
      if (distance <= maxDistance) {
        weight = 1.0 * Math.exp(-0.008 * distance);
      } else {
        weight = 0.2; // Minimum weight for very distant vehicles
      }
      
      // Add weighted vehicle count
      density[vehicle.direction] += weight;
    });
    
    return density;
  }
}

export function createInitialState(): SimulationState {
  return {
    vehicles: [],
    trafficLights: [
      {
        id: 'light-north',
        position: { x: 295, y: 195 },
        direction: 'north',
        state: 'red',
        timer: 0
      },
      {
        id: 'light-south',
        position: { x: 335, y: 235 },
        direction: 'south',
        state: 'red',
        timer: 0
      },
      {
        id: 'light-east',
        position: { x: 335, y: 195 },
        direction: 'east',
        state: 'green',
        timer: 0
      },
      {
        id: 'light-west',
        position: { x: 295, y: 235 },
        direction: 'west',
        state: 'green',
        timer: 0
      }
    ],
    time: 0,
    statistics: {
      totalVehicles: 0,
      averageWaitTime: 0,
      throughput: 0,
      trafficDensity: {
        north: 0,
        south: 0,
        east: 0,
        west: 0
      }
    },
    config: {
      spawnRate: 0.3,
      simulationSpeed: 1,
      aiController: 'fixed',
      aiParams: {
        greenDuration: 20,
        yellowDuration: 5,
        adaptiveThreshold: 1.5,
        adaptiveMinGreenTime: 3,
        adaptiveMaxWaitTime: 20
      }
    }
  };
}

export function getControllerByType(type: string): TrafficController {
  switch (type) {
    case 'adaptive':
      return new AdaptiveController();
    case 'reinforcement':
      return new ReinforcementLearningController();
    case 'fixed':
    default:
      return new FixedTimingController();
  }
}

export function updateSimulation(state: SimulationState, deltaTime: number): SimulationState {
  // Get the appropriate controller
  const controller = getControllerByType(state.config.aiController);
  
  // Update traffic lights using the controller
  let newState = controller.update(state, deltaTime);
  
  // Update other simulation elements
  newState = updateVehicles(newState, deltaTime);
  newState = spawnVehicles(newState, deltaTime);
  newState = updateStatistics(newState);
  
  // Increment simulation time
  newState.time += deltaTime;
  
  return newState;
}

function updateVehicles(state: SimulationState, deltaTime: number): SimulationState {
  const newState = { ...state };
  const adjustedDelta = deltaTime * state.config.simulationSpeed;
  
  // Process each vehicle
  newState.vehicles = state.vehicles
    .map(vehicle => {
      const newVehicle = { ...vehicle };
      
      // Check if vehicle is at a traffic light
      const isAtLight = isVehicleAtTrafficLight(newVehicle, state.trafficLights);
      
      if (isAtLight.atLight && isAtLight.lightState === 'red') {
        // Stop at red light
        newVehicle.waitTime += adjustedDelta;
      } else {
        // Check for vehicles ahead
        const shouldStop = isVehicleAhead(newVehicle, state.vehicles);
        
        if (shouldStop) {
          // Vehicle ahead, stop and wait
          newVehicle.waitTime += adjustedDelta;
        } else {
          // Move the vehicle
          switch (newVehicle.direction) {
            case 'north':
              newVehicle.position.y -= newVehicle.speed * adjustedDelta;
              break;
            case 'south':
              newVehicle.position.y += newVehicle.speed * adjustedDelta;
              break;
            case 'east':
              newVehicle.position.x += newVehicle.speed * adjustedDelta;
              break;
            case 'west':
              newVehicle.position.x -= newVehicle.speed * adjustedDelta;
              break;
          }
        }
      }
      
      return newVehicle;
    })
    // Filter out vehicles that have left the simulation area
    .filter(vehicle => 
      vehicle.position.x >= 0 && 
      vehicle.position.x <= 600 && 
      vehicle.position.y >= 0 && 
      vehicle.position.y <= 400
    );
  
  return newState;
}

function isVehicleAtTrafficLight(vehicle: Vehicle, lights: TrafficLight[]): { atLight: boolean, lightState: 'red' | 'yellow' | 'green' } {
  // Find the relevant traffic light for this vehicle's direction
  const light = lights.find(l => l.direction === vehicle.direction);
  
  if (!light) return { atLight: false, lightState: 'green' };
  
  // Define stop line positions based on direction
  let atStopLine = false;
  
  switch (vehicle.direction) {
    case 'north':
      // Check if vehicle is at the bottom stop line
      atStopLine = vehicle.position.y >= 260 && vehicle.position.y <= 270;
      break;
    case 'south':
      // Check if vehicle is at the top stop line
      atStopLine = vehicle.position.y >= 130 && vehicle.position.y <= 140;
      break;
    case 'east':
      // Check if vehicle is at the left stop line
      atStopLine = vehicle.position.x >= 230 && vehicle.position.x <= 240;
      break;
    case 'west':
      // Check if vehicle is at the right stop line
      atStopLine = vehicle.position.x >= 360 && vehicle.position.x <= 370;
      break;
  }
  
  // If at stop line, check light state
  if (atStopLine) {
    return { atLight: true, lightState: light.state };
  }
  
  // Also check if vehicle is approaching intersection (keep the original check as fallback)
  const isAtIntersection = (
    Math.abs(vehicle.position.x - 300) < 50 &&
    Math.abs(vehicle.position.y - 200) < 50
  );
  
  if (isAtIntersection) {
    return { atLight: true, lightState: light.state };
  }
  
  return { atLight: false, lightState: 'green' };
}

function isVehicleAhead(vehicle: Vehicle, vehicles: Vehicle[]): boolean {
  // Vehicle size (approximate)
  const vehicleSize = vehicle.type === 'car' ? 20 : 30;
  const safeDistance = vehicleSize + 5; // Add some buffer
  
  return vehicles.some(otherVehicle => {
    // Skip self comparison
    if (otherVehicle.id === vehicle.id) return false;
    
    // Only check vehicles in the same direction and same lane
    if (otherVehicle.direction !== vehicle.direction) return false;
    if (otherVehicle.lane !== vehicle.lane) return false;
    
    // Calculate distance based on direction
    let distance = 0;
    switch (vehicle.direction) {
      case 'north':
        // Check if other vehicle is ahead (lower Y position)
        if (otherVehicle.position.y >= vehicle.position.y) return false;
        distance = vehicle.position.y - otherVehicle.position.y;
        break;
        
      case 'south':
        // Check if other vehicle is ahead (higher Y position)
        if (otherVehicle.position.y <= vehicle.position.y) return false;
        distance = otherVehicle.position.y - vehicle.position.y;
        break;
        
      case 'east':
        // Check if other vehicle is ahead (higher X position)
        if (otherVehicle.position.x <= vehicle.position.x) return false;
        distance = otherVehicle.position.x - vehicle.position.x;
        break;
        
      case 'west':
        // Check if other vehicle is ahead (lower X position)
        if (otherVehicle.position.x >= vehicle.position.x) return false;
        distance = vehicle.position.x - otherVehicle.position.x;
        break;
    }
    
    // Return true if vehicle is too close to the one ahead
    return distance < safeDistance;
  });
}

function spawnVehicles(state: SimulationState, deltaTime: number): SimulationState {
  const newState = { ...state };
  const spawnChance = state.config.spawnRate * deltaTime * state.config.simulationSpeed;
  
  // Only spawn if random chance is met
  if (Math.random() > spawnChance) return newState;
  
  // Choose random direction
  const directions: Direction[] = ['north', 'south', 'east', 'west'];
  const direction = directions[Math.floor(Math.random() * directions.length)];
  
  // Choose vehicle type (mostly cars, some trucks)
  const type = Math.random() > 0.8 ? 'truck' : 'car';
  
  // Randomize lane (left or right lane)
  const lane = Math.random() > 0.5 ? 'left' : 'right';
  
  // Get spawn position based on direction and lane
  let position;
  switch (direction) {
    case 'north':
      position = { 
        x: lane === 'left' ? 280 : 300, 
        y: 400 
      };
      break;
    case 'south':
      position = { 
        x: lane === 'left' ? 320 : 340, 
        y: 0 
      };
      break;
    case 'east':
      position = { 
        x: 0, 
        y: lane === 'left' ? 180 : 200
      };
      break;
    case 'west':
      position = { 
        x: 600, 
        y: lane === 'left' ? 200 : 220
      };
      break;
    default:
      position = { x: 0, y: 0 };
  }
  
  // Choose random color for the vehicle
  const colors = ['#2196F3', '#9C27B0', '#FF9800', '#E91E63'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  // Create new vehicle
  const newVehicle: Vehicle = {
    id: `vehicle-${Date.now()}-${Math.random()}`,
    type,
    position,
    direction,
    lane,
    speed: type === 'car' ? 40 : 30,
    waitTime: 0,
    color
  };
  
  newState.vehicles.push(newVehicle);
  newState.statistics.totalVehicles += 1;
  
  return newState;
}

function updateStatistics(state: SimulationState): SimulationState {
  const newState = { ...state };
  
  // Calculate average wait time
  if (state.vehicles.length > 0) {
    const totalWaitTime = state.vehicles.reduce((sum, vehicle) => sum + vehicle.waitTime, 0);
    newState.statistics.averageWaitTime = totalWaitTime / state.vehicles.length;
  } else {
    newState.statistics.averageWaitTime = 0;
  }
  
  // Calculate throughput (vehicles passing through intersection)
  // Enhanced calculation that considers more factors
  const throughputBase = Math.floor(state.statistics.totalVehicles * 0.8);
  const waitTimePenalty = newState.statistics.averageWaitTime * 0.15;
  const vehicleCountBonus = Math.min(10, state.vehicles.length * 0.5);
  
  newState.statistics.throughput = Math.max(0, throughputBase - waitTimePenalty + vehicleCountBonus);
  
  return newState;
}
