
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
  
  // Determine rotation based on direction
  let rotation = 0;
  switch (direction) {
    case 'north':
      rotation = 0;
      break;
    case 'east':
      rotation = 90;
      break;
    case 'south':
      rotation = 180;
      break;
    case 'west':
      rotation = 270;
      break;
  }
  
  // Position adjustments based on direction
  let className = "absolute z-10 ";
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
    <div className={className} style={{ transform: `rotate(${rotation}deg)` }}>
      <svg 
        width="24" 
        height="56" 
        viewBox="0 0 24 56" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Traffic Light Housing */}
        <rect x="2" y="2" width="20" height="52" rx="4" fill="#333" stroke="#222" strokeWidth="2" />
        
        {/* Red Light */}
        <circle 
          cx="12" 
          cy="12" 
          r="7" 
          fill={state === 'red' ? "#ff3b30" : "#5a0500"} 
          filter={state === 'red' ? "url(#glow-red)" : "none"} 
        />
        
        {/* Yellow Light */}
        <circle 
          cx="12" 
          cy="28" 
          r="7" 
          fill={state === 'yellow' ? "#ffcc00" : "#5a4200"} 
          filter={state === 'yellow' ? "url(#glow-yellow)" : "none"} 
        />
        
        {/* Green Light */}
        <circle 
          cx="12" 
          cy="44" 
          r="7" 
          fill={state === 'green' ? "#34c759" : "#0a3a17"} 
          filter={state === 'green' ? "url(#glow-green)" : "none"} 
        />
        
        {/* Glow Filters */}
        <defs>
          <filter id="glow-red" x="0" y="0" width="24" height="24" filterUnits="userSpaceOnUse">
            <feFlood floodColor="#ff3b30" floodOpacity="0.8" result="flood" />
            <feComposite in="flood" in2="SourceGraphic" operator="in" result="comp" />
            <feGaussianBlur in="comp" stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          
          <filter id="glow-yellow" x="0" y="16" width="24" height="24" filterUnits="userSpaceOnUse">
            <feFlood floodColor="#ffcc00" floodOpacity="0.8" result="flood" />
            <feComposite in="flood" in2="SourceGraphic" operator="in" result="comp" />
            <feGaussianBlur in="comp" stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          
          <filter id="glow-green" x="0" y="32" width="24" height="24" filterUnits="userSpaceOnUse">
            <feFlood floodColor="#34c759" floodOpacity="0.8" result="flood" />
            <feComposite in="flood" in2="SourceGraphic" operator="in" result="comp" />
            <feGaussianBlur in="comp" stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
      </svg>
    </div>
  );
};

export default Intersection;
