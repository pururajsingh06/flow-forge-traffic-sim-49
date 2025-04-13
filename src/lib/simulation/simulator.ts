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
  getName(): string {
    return "Adaptive Timing";
  }
  
  getDescription(): string {
    return "Adjusts light timing based on current traffic volume in each direction.";
  }

  update(state: SimulationState, deltaTime: number): SimulationState {
    const newState = { ...state };
    const { greenDuration, yellowDuration, adaptiveThreshold } = state.config.aiParams;
    
    // Count vehicles in each direction
    const vehiclesByDirection: Record<Direction, number> = {
      north: 0,
      south: 0,
      east: 0,
      west: 0
    };
    
    state.vehicles.forEach(vehicle => {
      vehiclesByDirection[vehicle.direction]++;
    });
    
    const northSouthCount = vehiclesByDirection.north + vehiclesByDirection.south;
    const eastWestCount = vehiclesByDirection.east + vehiclesByDirection.west;
    
    // Determine which direction has more traffic
    const moreTrafficInNorthSouth = northSouthCount > eastWestCount * adaptiveThreshold;
    const moreTrafficInEastWest = eastWestCount > northSouthCount * adaptiveThreshold;
    
    newState.trafficLights = state.trafficLights.map(light => {
      const newLight = { ...light };
      newLight.timer += deltaTime;
      
      if (['north', 'south'].includes(light.direction)) {
        if (moreTrafficInNorthSouth) {
          // Extend green time for north-south
          if (newLight.state === 'green') {
            // Keep green longer
            if (newLight.timer % (greenDuration * 1.5) < greenDuration * 1.5) {
              newLight.state = 'green';
            } else {
              newLight.state = 'yellow';
              newLight.timer = 0;
            }
          } else if (newLight.state === 'yellow') {
            if (newLight.timer >= yellowDuration) {
              newLight.state = 'red';
              newLight.timer = 0;
            }
          } else if (newLight.state === 'red') {
            if (newLight.timer >= greenDuration * 0.8) {
              newLight.state = 'green';
              newLight.timer = 0;
            }
          }
        } else {
          // Normal timing
          if (newLight.timer % (greenDuration + yellowDuration + greenDuration) < greenDuration) {
            newLight.state = 'green';
          } else if (newLight.timer % (greenDuration + yellowDuration + greenDuration) < greenDuration + yellowDuration) {
            newLight.state = 'yellow';
          } else {
            newLight.state = 'red';
          }
        }
      } else {
        if (moreTrafficInEastWest) {
          // Extend green time for east-west
          if (newLight.state === 'green') {
            // Keep green longer
            if (newLight.timer % (greenDuration * 1.5) < greenDuration * 1.5) {
              newLight.state = 'green';
            } else {
              newLight.state = 'yellow';
              newLight.timer = 0;
            }
          } else if (newLight.state === 'yellow') {
            if (newLight.timer >= yellowDuration) {
              newLight.state = 'red';
              newLight.timer = 0;
            }
          } else if (newLight.state === 'red') {
            if (newLight.timer >= greenDuration * 0.8) {
              newLight.state = 'green';
              newLight.timer = 0;
            }
          }
        } else {
          // Normal timing with offset
          if (newLight.timer % (greenDuration + yellowDuration + greenDuration) < greenDuration) {
            newLight.state = 'red';
          } else if (newLight.timer % (greenDuration + yellowDuration + greenDuration) < greenDuration + yellowDuration) {
            newLight.state = 'red';
          } else {
            newLight.state = 'green';
          }
        }
      }
      
      return newLight;
    });
    
    return newState;
  }
}

// Reinforcement Learning controller (learns optimal timing)
export class ReinforcementLearningController implements TrafficController {
  private rewardHistory: number[] = [];
  private qTable: Record<string, Record<string, number>> = {};
  private learningRate = 0.1;
  private discountFactor = 0.9;
  private explorationRate = 0.2;
  
  constructor() {
    // Initialize Q-table with some states and actions
    const states = ['low_ns_low_ew', 'low_ns_high_ew', 'high_ns_low_ew', 'high_ns_high_ew'];
    const actions = ['extend_ns', 'extend_ew', 'switch_to_ns', 'switch_to_ew'];
    
    states.forEach(state => {
      this.qTable[state] = {};
      actions.forEach(action => {
        this.qTable[state][action] = 0;
      });
    });
  }
  
  getName(): string {
    return "Reinforcement Learning";
  }
  
  getDescription(): string {
    return "Uses Q-learning to optimize traffic flow based on historical patterns.";
  }
  
  getCurrentState(state: SimulationState): string {
    // Determine current traffic density
    const vehiclesByDirection: Record<Direction, number> = {
      north: 0, south: 0, east: 0, west: 0
    };
    
    state.vehicles.forEach(vehicle => {
      vehiclesByDirection[vehicle.direction]++;
    });
    
    const nsCount = vehiclesByDirection.north + vehiclesByDirection.south;
    const ewCount = vehiclesByDirection.east + vehiclesByDirection.west;
    
    const highNS = nsCount > 3;
    const highEW = ewCount > 3;
    
    if (highNS && highEW) return 'high_ns_high_ew';
    if (highNS && !highEW) return 'high_ns_low_ew';
    if (!highNS && highEW) return 'low_ns_high_ew';
    return 'low_ns_low_ew';
  }
  
  getAvailableActions(state: SimulationState): string[] {
    const nsGreen = state.trafficLights.some(light => 
      ['north', 'south'].includes(light.direction) && light.state === 'green'
    );
    
    const ewGreen = state.trafficLights.some(light => 
      ['east', 'west'].includes(light.direction) && light.state === 'green'
    );
    
    if (nsGreen) {
      return ['extend_ns', 'switch_to_ew'];
    } else if (ewGreen) {
      return ['extend_ew', 'switch_to_ns'];
    } else {
      // In yellow or transition state
      return ['switch_to_ns', 'switch_to_ew'];
    }
  }
  
  selectAction(stateKey: string, availableActions: string[]): string {
    // Exploration vs exploitation
    if (Math.random() < this.explorationRate) {
      // Explore - random action
      return availableActions[Math.floor(Math.random() * availableActions.length)];
    } else {
      // Exploit - best known action
      let bestAction = availableActions[0];
      let bestValue = this.qTable[stateKey][bestAction] || 0;
      
      availableActions.forEach(action => {
        const actionValue = this.qTable[stateKey][action] || 0;
        if (actionValue > bestValue) {
          bestValue = actionValue;
          bestAction = action;
        }
      });
      
      return bestAction;
    }
  }
  
  calculateReward(state: SimulationState): number {
    // Reward is higher for lower wait times and higher throughput
    const { averageWaitTime, throughput } = state.statistics;
    return throughput - (averageWaitTime / 10);
  }
  
  applyAction(state: SimulationState, action: string): SimulationState {
    const newState = { ...state };
    
    // Apply the selected action
    switch (action) {
      case 'extend_ns':
        newState.trafficLights = state.trafficLights.map(light => {
          if (['north', 'south'].includes(light.direction) && light.state === 'green') {
            // Extend green for north-south
            return { ...light, timer: Math.max(0, light.timer - 2) };
          }
          return { ...light };
        });
        break;
        
      case 'extend_ew':
        newState.trafficLights = state.trafficLights.map(light => {
          if (['east', 'west'].includes(light.direction) && light.state === 'green') {
            // Extend green for east-west
            return { ...light, timer: Math.max(0, light.timer - 2) };
          }
          return { ...light };
        });
        break;
        
      case 'switch_to_ns':
        newState.trafficLights = state.trafficLights.map(light => {
          if (['north', 'south'].includes(light.direction)) {
            return { ...light, state: 'green', timer: 0 };
          } else {
            return { ...light, state: 'red', timer: 0 };
          }
        });
        break;
        
      case 'switch_to_ew':
        newState.trafficLights = state.trafficLights.map(light => {
          if (['east', 'west'].includes(light.direction)) {
            return { ...light, state: 'green', timer: 0 };
          } else {
            return { ...light, state: 'red', timer: 0 };
          }
        });
        break;
    }
    
    return newState;
  }
  
  update(state: SimulationState, deltaTime: number): SimulationState {
    // Get current state representation
    const currentStateKey = this.getCurrentState(state);
    
    // Get available actions for the current state
    const availableActions = this.getAvailableActions(state);
    
    // Select an action
    const selectedAction = this.selectAction(currentStateKey, availableActions);
    
    // Apply action
    let newState = this.applyAction(state, selectedAction);
    
    // Calculate reward
    const reward = this.calculateReward(state);
    this.rewardHistory.push(reward);
    
    // Update Q-table (Q-learning update)
    if (this.rewardHistory.length > 1) {
      // Get previous state and action (simplified for demonstration)
      const prevStateKey = currentStateKey; // In real implementation, you'd store previous state
      const prevAction = selectedAction; // In real implementation, you'd store previous action
      
      // Calculate maximum Q value for new state
      const maxQNewState = Math.max(
        ...availableActions.map(action => this.qTable[currentStateKey][action] || 0)
      );
      
      // Update Q-value
      if (!this.qTable[prevStateKey]) this.qTable[prevStateKey] = {};
      if (!this.qTable[prevStateKey][prevAction]) this.qTable[prevStateKey][prevAction] = 0;
      
      this.qTable[prevStateKey][prevAction] += this.learningRate * (
        reward + this.discountFactor * maxQNewState - this.qTable[prevStateKey][prevAction]
      );
    }
    
    // Apply some timing logic as a fallback
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
  
  // Check if vehicle is close to the intersection
  const isAtIntersection = (
    Math.abs(vehicle.position.x - 300) < 50 &&
    Math.abs(vehicle.position.y - 200) < 50
  );
  
  if (isAtIntersection) {
    return { atLight: true, lightState: light.state };
  }
  
  return { atLight: false, lightState: 'green' };
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
  
  // Get spawn position based on direction
  let position;
  switch (direction) {
    case 'north':
      position = { x: 310, y: 400 };
      break;
    case 'south':
      position = { x: 330, y: 0 };
      break;
    case 'east':
      position = { x: 0, y: 230 };
      break;
    case 'west':
      position = { x: 600, y: 210 };
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
