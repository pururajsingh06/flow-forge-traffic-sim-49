
import React, { useEffect, useRef } from 'react';
import { SimulationState } from '@/lib/simulation/types';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import {
  Pause,
  Play,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  ArrowRightLeft,
  Activity
} from 'lucide-react';

import { 
  qLearningController, 
  saveQTable, 
  loadQTable, 
  TrafficState 
} from './controllers/qlearning';

interface SimulationControlsProps {
  simulationState: SimulationState;
  isRunning: boolean;
  onReset: () => void;
  onTogglePlay: () => void;
  onSpeedChange: (value: number) => void;
  onSpawnRateChange: (value: number) => void;
  onControllerChange: (value: 'fixed' | 'adaptive' | 'reinforcement') => void;
  onParamChange: (param: string, value: number) => void;
}

const SimulationControls: React.FC<SimulationControlsProps> = ({
  simulationState,
  isRunning,
  onReset,
  onTogglePlay,
  onSpeedChange,
  onSpawnRateChange,
  onControllerChange,
  onParamChange
}) => {
  const { config } = simulationState;
  const qLearningStateRef = useRef<TrafficState>({
    nsQueue: 0,
    ewQueue: 0,
    currentPhase: 'NS',
    timeInPhase: 0
  });
  
  // Load Q-table when component mounts
  useEffect(() => {
    loadQTable();
    
    // Save Q-table when component unmounts
    return () => {
      saveQTable();
    };
  }, []);
  
  // Update Q-learning state based on actual simulation
  useEffect(() => {
    if (config.aiController === 'reinforcement' && isRunning) {
      // Count vehicles in each direction
      const nsVehicles = simulationState.vehicles.filter(
        v => v.direction === 'north' || v.direction === 'south'
      ).length;
      
      const ewVehicles = simulationState.vehicles.filter(
        v => v.direction === 'east' || v.direction === 'west'
      ).length;
      
      // Determine current phase from traffic lights
      const nsGreen = simulationState.trafficLights.some(
        light => (light.direction === 'north' || light.direction === 'south') && light.state === 'green'
      );
      
      // Update our internal state for Q-learning
      qLearningStateRef.current = {
        nsQueue: nsVehicles,
        ewQueue: ewVehicles,
        currentPhase: nsGreen ? 'NS' : 'EW',
        timeInPhase: qLearningStateRef.current.currentPhase === (nsGreen ? 'NS' : 'EW') 
          ? qLearningStateRef.current.timeInPhase + 1
          : 1
      };
      
      // Run Q-learning algorithm
      if (isRunning) {
        qLearningStateRef.current = qLearningController(qLearningStateRef.current);
        
        // Save Q-table periodically
        if (Math.random() < 0.01) { // ~1% chance each update
          saveQTable();
        }
      }
    }
  }, [simulationState, config.aiController, isRunning]);
  
  return (
    <div className="bg-card p-4 rounded-lg shadow-md">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Simulation Controls</h3>
          <div className="flex space-x-2">
            <Button variant="outline" size="icon" onClick={onReset} title="Reset Simulation">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button 
              variant={isRunning ? "destructive" : "default"} 
              size="icon" 
              onClick={onTogglePlay}
              title={isRunning ? "Pause Simulation" : "Start Simulation"}
            >
              {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Speed</label>
              <div className="flex items-center space-x-2">
                <ZoomOut className="h-3 w-3 text-muted-foreground" />
                <Slider 
                  value={[config.simulationSpeed]} 
                  min={0.1} 
                  max={3} 
                  step={0.1} 
                  onValueChange={(value) => onSpeedChange(value[0])}
                  className="w-24"
                />
                <ZoomIn className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground w-8 text-right">
                  {config.simulationSpeed.toFixed(1)}x
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Spawn Rate</label>
              <div className="flex items-center space-x-2">
                <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                <Slider 
                  value={[config.spawnRate]} 
                  min={0.1} 
                  max={1} 
                  step={0.1} 
                  onValueChange={(value) => onSpawnRateChange(value[0])}
                  className="w-24"
                />
                <Activity className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground w-8 text-right">
                  {Math.round(config.spawnRate * 10)}/10
                </span>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div>
              <label className="text-sm font-medium">Traffic Controller</label>
              <Select
                value={config.aiController}
                onValueChange={(value) => onControllerChange(value as any)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select controller" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Timing</SelectItem>
                  <SelectItem value="adaptive">Adaptive</SelectItem>
                  <SelectItem value="reinforcement">Reinforcement Learning</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium">Green Duration</label>
                <div className="flex items-center space-x-2">
                  <Slider 
                    value={[config.aiParams.greenDuration]} 
                    min={5} 
                    max={60} 
                    step={5} 
                    onValueChange={(value) => onParamChange('greenDuration', value[0])}
                    className="w-16"
                  />
                  <span className="text-xs text-muted-foreground">
                    {config.aiParams.greenDuration}s
                  </span>
                </div>
              </div>
              
              <div>
                <label className="text-xs font-medium">Yellow Duration</label>
                <div className="flex items-center space-x-2">
                  <Slider 
                    value={[config.aiParams.yellowDuration]} 
                    min={1} 
                    max={10} 
                    step={1} 
                    onValueChange={(value) => onParamChange('yellowDuration', value[0])}
                    className="w-16"
                  />
                  <span className="text-xs text-muted-foreground">
                    {config.aiParams.yellowDuration}s
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulationControls;
