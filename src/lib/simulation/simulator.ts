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
}

// Adaptive controller (responds to traffic volume)
export class AdaptiveController implements TrafficController {
  private trafficHistory: { ns: number[], ew: number[] } = { ns: [], ew: [] };
  private maxHistoryLength = 10;
  private currentDirection: 'ns' | 'ew' = 'ns';
  private switchTimer = 0;
  private minGreenTime = 3; // Reduced minimum green time for more responsiveness
  private lastSwitchTime = 0;
  
  getName(): string {
    return "Adaptive Timing";
  }
  
  getDescription(): string {
    return "Intelligently adjusts light timing based on real-time traffic conditions.";
  }

  update(state: SimulationState, deltaTime: number): SimulationState {
    const newState = { ...state };
    const { yellowDuration } = state.config.aiParams;
    
    // Count vehicles in each direction
    const vehiclesByDirection: Record<Direction, number> = {
      north: 0,
      south: 0,
      east: 0,
      west: 0
    };
    
    // Count vehicles in each direction
    state.vehicles.forEach(vehicle => {
      vehiclesByDirection[vehicle.direction]++;
    });
    
    // Get totals by axis
    const northSouthCount = vehiclesByDirection.north + vehiclesByDirection.south;
    const eastWestCount = vehiclesByDirection.east + vehiclesByDirection.west;
    
    // Add current counts to history
    this.trafficHistory.ns.push(northSouthCount);
    this.trafficHistory.ew.push(eastWestCount);
    
    // Keep history at max length
    if (this.trafficHistory.ns.length > this.maxHistoryLength) {
      this.trafficHistory.ns.shift();
    }
    if (this.trafficHistory.ew.length > this.maxHistoryLength) {
      this.trafficHistory.ew.shift();
    }
    
    // Calculate average traffic over recent history (weighted toward most recent)
    const recentWeight = 1.5; // Give more weight to recent counts
    let weightedNS = 0;
    let weightedEW = 0;
    let totalWeight = 0;
    
    for (let i = 0; i < this.trafficHistory.ns.length; i++) {
      const weight = i === this.trafficHistory.ns.length - 1 ? recentWeight : 1;
      weightedNS += this.trafficHistory.ns[i] * weight;
      weightedEW += this.trafficHistory.ew[i] * weight;
      totalWeight += weight;
    }
    
    const avgNS = weightedNS / totalWeight;
    const avgEW = weightedEW / totalWeight;
    
    // Update switch timer
    this.switchTimer += deltaTime;
    this.lastSwitchTime += deltaTime;
    
    // Determine if we need to switch directions based on traffic count
    // SIMPLIFIED LOGIC: Direct comparison of vehicle counts with a small buffer
    // to prevent rapid switching
    const nsGreaterThanEw = avgNS > (avgEW + 1); // Buffer of 1 vehicle
    const ewGreaterThanNs = avgEW > (avgNS + 1); // Buffer of 1 vehicle
    
    // Determine current phase
    const nsGreen = state.trafficLights.some(light => 
      ['north', 'south'].includes(light.direction) && light.state === 'green'
    );
    const ewGreen = state.trafficLights.some(light => 
      ['east', 'west'].includes(light.direction) && light.state === 'green'
    );
    
    let shouldSwitchToNS = false;
    let shouldSwitchToEW = false;
    
    // Logic for when to switch directions
    if (nsGreen && ewGreaterThanNs && this.switchTimer >= this.minGreenTime) {
      shouldSwitchToEW = true;
    } else if (ewGreen && nsGreaterThanEw && this.switchTimer >= this.minGreenTime) {
      shouldSwitchToNS = true;
    }
    
    // Force switch if one direction has had a very long wait and has traffic
    const maxWaitTime = 20; // Maximum time any direction should wait
    if (ewGreen && this.lastSwitchTime > maxWaitTime && northSouthCount > 0) {
      shouldSwitchToNS = true;
    } else if (nsGreen && this.lastSwitchTime > maxWaitTime && eastWestCount > 0) {
      shouldSwitchToEW = true;
    }
    
    // Update traffic lights based on vehicle counts
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
        } else if (shouldSwitchToNS && newLight.state === 'red') {
          // Switch from red to green
          newLight.state = 'green';
          newLight.timer = 0;
          this.lastSwitchTime = 0;
          this.switchTimer = 0;
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
          // Switch from red to green
          newLight.state = 'red';
          newLight.timer = 0;
        } else if (shouldSwitchToEW && newLight.state === 'red') {
          // Switch from red to green
          newLight.state = 'green';
          newLight.timer = 0;
          this.lastSwitchTime = 0;
          this.switchTimer = 0;
        }
      }
      
      return newLight;
    });
    
    // Make sure there's always at least one direction with green lights
    const anyGreen = newState.trafficLights.some(light => light.state === 'green');
    
    if (!anyGreen) {
      // If no lights are green, set the direction with more traffic to green
      const directionToGreen = avgNS >= avgEW ? 'ns' : 'ew';
      
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
}

// Reinforcement Learning controller (learns optimal timing)
export class ReinforcementLearningController implements TrafficController {
  private rewardHistory: number[] = [];
  private lastStateKey: string = '';
  private lastAction: string = '';
  private learningRate = 0.1;
  private discountFactor = 0.9;
  private explorationRate = 0.2;
  
  getName(): string {
    return "Reinforcement Learning";
  }
  
  getDescription(): string {
    return "Uses Q-learning to optimize traffic flow based on historical patterns.";
  }
  
  getCurrentState(state: SimulationState): string {
    // Count vehicles in each direction
    const vehiclesByDirection: Record<Direction, number> = {
      north: 0, south: 0, east: 0, west: 0
    };
    
    state.vehicles.forEach(vehicle => {
      vehiclesByDirection[vehicle.direction]++;
    });
    
    const nsCount = vehiclesByDirection.north + vehiclesByDirection.south;
    const ewCount = vehiclesByDirection.east + vehiclesByDirection.west;
    
    // Get current light phase
    const nsGreen = state.trafficLights.some(light => 
      ['north', 'south'].includes(light.direction) && light.state === 'green'
    );
    
    // Calculate time in current phase
    const maxTime = state.trafficLights.reduce((max, light) => 
      Math.max(max, light.timer), 0);
    
    // Discretize state
    const highNS = nsCount > 3;
    const highEW = ewCount > 3;
    const longPhase = maxTime > 10;
    
    return `${highNS ? 'high' : 'low'}_ns_${highEW ? 'high' : 'low'}_ew_${nsGreen ? 'ns' : 'ew'}_${longPhase ? 'long' : 'short'}`;
  }
  
  getAvailableActions(): string[] {
    return ['extend_current', 'switch_phase'];
  }
  
  selectAction(stateKey: string, availableActions: string[]): string {
    // Exploration vs exploitation
    if (Math.random() < this.explorationRate) {
      // Explore - random action
      return availableActions[Math.floor(Math.random() * availableActions.length)];
    } else {
      // Exploit - would use Q-values from qlearning.ts but simplified here
      if (stateKey.includes('high') && stateKey.includes('long')) {
        return 'switch_phase'; // Switch if high traffic and been in phase for long
      } else if (stateKey.includes('high') && stateKey.includes(stateKey.includes('ns') ? 'ns' : 'ew')) {
        return 'extend_current'; // Extend if high traffic in current green direction
      } else {
        // Otherwise slightly favor switching
        return Math.random() < 0.6 ? 'switch_phase' : 'extend_current';
      }
    }
  }
  
  calculateReward(state: SimulationState): number {
    // Reward is higher for lower wait times and higher throughput
    const { averageWaitTime, throughput } = state.statistics;
    return throughput - (averageWaitTime / 10);
  }
  
  applyAction(state: SimulationState, action: string): SimulationState {
    const newState = { ...state };
    
    // Determine current phase
    const nsGreen = state.trafficLights.some(light => 
      ['north', 'south'].includes(light.direction) && light.state === 'green'
    );
    
    // Apply the selected action
    if (action === 'extend_current') {
      // Keep current phase, do nothing
    } else if (action === 'switch_phase') {
      // Switch phases - set appropriate traffic lights to yellow
      newState.trafficLights = state.trafficLights.map(light => {
        if (light.state === 'green') {
          return { ...light, state: 'yellow', timer: 0 };
        }
        return { ...light };
      });
    }
    
    return newState;
  }
  
  update(state: SimulationState, deltaTime: number): SimulationState {
    // Get current state representation
    const currentStateKey = this.getCurrentState(state);
    
    // Get available actions for the current state
    const availableActions = this.getAvailableActions();
    
    // Select an action
    const selectedAction = this.selectAction(currentStateKey, availableActions);
    
    // Apply action
    let newState = this.applyAction(state, selectedAction);
    
    // Calculate reward
    const reward = this.calculateReward(state);
    this.rewardHistory.push(reward);
    
    // Store state and action for next update
    this.lastStateKey = currentStateKey;
    this.lastAction = selectedAction;
    
    // Apply basic timing rules for light transitions
    const { greenDuration, yellowDuration } = state.config.aiParams;
    
    newState.trafficLights = newState.trafficLights.map(light => {
      const newLight = { ...light };
      newLight.timer += deltaTime;
      
      // Basic state transitions
      if (newLight.state === 'green' && newLight.timer > greenDuration) {
        newLight.state = 'yellow';
        newLight.timer = 0;
      } else if (newLight.state === 'yellow' && newLight.timer > yellowDuration) {
        newLight.state = 'red';
        newLight.timer = 0;
      }
      
      return newLight;
    });
    
    // Ensure traffic light consistency - when one direction goes red, the other should go green
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
    
    if (nsYellowToRed) {
      // NS just turned red, make EW green
      newState.trafficLights = newState.trafficLights.map(light => {
        if (['east', 'west'].includes(light.direction)) {
          return { ...light, state: 'green', timer: 0 };
        }
        return light;
      });
    }
    
    if (ewYellowToRed) {
      // EW just turned red, make NS green
      newState.trafficLights = newState.trafficLights.map(light => {
        if (['north', 'south'].includes(light.direction)) {
          return { ...light, state: 'green', timer: 0 };
        }
        return light;
      });
    }
    
    return newState;
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
      throughput: 0
    },
    config: {
      spawnRate: 0.3,
      simulationSpeed: 1,
      aiController: 'fixed',
      aiParams: {
        greenDuration: 20,
        yellowDuration: 5,
        adaptiveThreshold: 1.5
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
  // This is simplified - in reality would count vehicles completing their journey
  newState.statistics.throughput = Math.floor(state.statistics.totalVehicles * 0.8 - newState.statistics.averageWaitTime * 0.1);
  
  return newState;
}
