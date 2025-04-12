
import React from 'react';
import { TrafficLight } from '@/lib/simulation/types';

interface IntersectionProps {
  trafficLights: TrafficLight[];
}

const Intersection: React.FC<IntersectionProps> = ({ trafficLights }) => {
  return (
    <div className="relative w-full h-full">
      {/* Background */}
      <div className="absolute inset-0 bg-grass" />
      
      {/* Horizontal Road */}
      <div className="absolute left-0 right-0 top-1/2 h-[100px] bg-road transform -translate-y-1/2">
        {/* Road Markings */}
        <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-roadMarking transform -translate-y-1/2 dashed-line" />
      </div>
      
      {/* Vertical Road */}
      <div className="absolute top-0 bottom-0 left-1/2 w-[100px] bg-road transform -translate-x-1/2">
        {/* Road Markings */}
        <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-roadMarking transform -translate-x-1/2 dashed-line" />
      </div>
      
      {/* Traffic Lights */}
      {trafficLights.map(light => (
        <TrafficLightComponent 
          key={light.id} 
          light={light} 
        />
      ))}
    </div>
  );
};

interface TrafficLightProps {
  light: TrafficLight;
}

const TrafficLightComponent: React.FC<TrafficLightProps> = ({ light }) => {
  const { position, direction, state } = light;
  
  // Position and size
  const size = 16;
  
  // Position adjustments based on direction
  let className = "absolute flex items-center justify-center ";
  switch (direction) {
    case 'north':
      className += "bottom-1/2 right-1/2 mb-[50px] mr-[10px]";
      break;
    case 'south':
      className += "top-1/2 left-1/2 mt-[50px] ml-[10px]";
      break;
    case 'east':
      className += "left-1/2 top-1/2 ml-[50px] mt-[10px]";
      break;
    case 'west':
      className += "right-1/2 bottom-1/2 mr-[50px] mb-[10px]";
      break;
  }
  
  return (
    <div className={className} style={{ width: size, height: size }}>
      <div 
        className={`w-full h-full rounded-full ${
          state === 'red' ? 'bg-traffic-red' : 
          state === 'yellow' ? 'bg-traffic-yellow' : 
          'bg-traffic-green'
        } shadow-lg`}
      />
    </div>
  );
};

export default Intersection;
