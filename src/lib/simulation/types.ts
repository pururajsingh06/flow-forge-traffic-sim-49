
export interface Vehicle {
  id: string;
  type: 'car' | 'truck';
  position: { x: number; y: number };
  direction: 'north' | 'south' | 'east' | 'west';
  lane: 'left' | 'right';
  speed: number;
  waitTime: number;
  color: string;
}

export interface TrafficLight {
  id: string;
  position: { x: number; y: number };
  direction: 'north' | 'south' | 'east' | 'west';
  state: 'red' | 'yellow' | 'green';
  timer: number;
}

export interface SimulationState {
  vehicles: Vehicle[];
  trafficLights: TrafficLight[];
  time: number;
  statistics: {
    totalVehicles: number;
    averageWaitTime: number;
    throughput: number;
  };
  config: {
    spawnRate: number;
    simulationSpeed: number;
    aiController: 'fixed' | 'adaptive' | 'reinforcement';
    aiParams: {
      greenDuration: number;
      yellowDuration: number;
      adaptiveThreshold: number;
    };
  };
}

export type Direction = 'north' | 'south' | 'east' | 'west';
export type LightState = 'red' | 'yellow' | 'green';
