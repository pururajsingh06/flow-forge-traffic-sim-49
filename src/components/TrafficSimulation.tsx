
import React, { useState, useEffect, useRef } from 'react';
import { SimulationState } from '@/lib/simulation/types';
import { createInitialState, updateSimulation } from '@/lib/simulation/simulator';
import Intersection from './Intersection';
import Vehicle from './Vehicle';
import SimulationControls from './SimulationControls';
import Statistics from './Statistics';
import { toast } from 'sonner';

const TrafficSimulation: React.FC = () => {
  const [simulationState, setSimulationState] = useState<SimulationState>(createInitialState());
  const [isRunning, setIsRunning] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  
  // Frame-based animation loop
  const tick = (time: number) => {
    if (!lastTimeRef.current) {
      lastTimeRef.current = time;
      animationFrameRef.current = requestAnimationFrame(tick);
      return;
    }
    
    const deltaTime = (time - lastTimeRef.current) / 1000; // Convert to seconds
    lastTimeRef.current = time;
    
    // Update simulation state
    setSimulationState(prevState => updateSimulation(prevState, deltaTime));
    
    // Continue the loop
    animationFrameRef.current = requestAnimationFrame(tick);
  };
  
  // Start/stop the simulation
  useEffect(() => {
    if (isRunning) {
      animationFrameRef.current = requestAnimationFrame(tick);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRunning]);
  
  // Reset simulation
  const handleReset = () => {
    setSimulationState(createInitialState());
    lastTimeRef.current = 0;
    toast.success("Simulation reset");
  };
  
  // Toggle play/pause
  const handleTogglePlay = () => {
    setIsRunning(prev => !prev);
    toast(isRunning ? "Simulation paused" : "Simulation started");
  };
  
  // Change simulation speed
  const handleSpeedChange = (value: number) => {
    setSimulationState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        simulationSpeed: value
      }
    }));
  };
  
  // Change vehicle spawn rate
  const handleSpawnRateChange = (value: number) => {
    setSimulationState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        spawnRate: value
      }
    }));
  };
  
  // Change AI controller type
  const handleControllerChange = (value: 'fixed' | 'adaptive' | 'reinforcement') => {
    setSimulationState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        aiController: value
      }
    }));
    toast.success(`Switched to ${value} controller`);
  };
  
  // Change AI parameters
  const handleParamChange = (param: string, value: number) => {
    setSimulationState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        aiParams: {
          ...prev.config.aiParams,
          [param]: value
        }
      }
    }));
  };
  
  return (
    <div className="flex flex-col space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="bg-card rounded-lg shadow-md overflow-hidden p-4">
            <div className="relative w-full h-[400px] border border-border rounded">
              <Intersection trafficLights={simulationState.trafficLights} />
              
              {/* Render all vehicles */}
              {simulationState.vehicles.map(vehicle => (
                <Vehicle key={vehicle.id} vehicle={vehicle} />
              ))}
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <SimulationControls 
            simulationState={simulationState}
            isRunning={isRunning}
            onReset={handleReset}
            onTogglePlay={handleTogglePlay}
            onSpeedChange={handleSpeedChange}
            onSpawnRateChange={handleSpawnRateChange}
            onControllerChange={handleControllerChange}
            onParamChange={handleParamChange}
          />
          
          <Statistics simulationState={simulationState} />
        </div>
      </div>
    </div>
  );
};

export default TrafficSimulation;
