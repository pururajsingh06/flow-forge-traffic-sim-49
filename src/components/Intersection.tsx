
import React from 'react';
import { TrafficLight } from '@/lib/simulation/types';
import { Building, Home, Trees, Building2, Warehouse } from 'lucide-react';

interface IntersectionProps {
  trafficLights: TrafficLight[];
}

const Intersection: React.FC<IntersectionProps> = ({ trafficLights }) => {
  return (
    <div className="relative w-full h-full">
      {/* Background with subtle texture */}
      <div className="absolute inset-0 bg-grass bg-opacity-90 pattern-dots pattern-green-700 pattern-bg-transparent pattern-opacity-10 pattern-size-2" />
      
      {/* Locality elements - top left quadrant */}
      <div className="absolute left-4 top-4 text-green-800 opacity-80">
        <div className="flex space-x-4">
          <Building className="w-12 h-12" />
          <Building2 className="w-10 h-10" />
          <Home className="w-8 h-8" />
        </div>
        <div className="mt-4 flex space-x-6">
          <Trees className="w-10 h-10" />
          <Trees className="w-8 h-8" />
        </div>
      </div>
      
      {/* Locality elements - top right quadrant */}
      <div className="absolute right-4 top-4 text-green-800 opacity-80">
        <div className="flex space-x-6">
          <Home className="w-12 h-12" />
          <Building2 className="w-14 h-14" />
        </div>
        <div className="mt-6 flex space-x-8">
          <Trees className="w-10 h-10" />
          <Trees className="w-8 h-8" />
        </div>
      </div>
      
      {/* Locality elements - bottom left quadrant */}
      <div className="absolute left-4 bottom-4 text-green-800 opacity-80">
        <div className="flex space-x-5">
          <Building className="w-14 h-14" />
          <Warehouse className="w-12 h-12" />
        </div>
        <div className="mt-[-10px] flex space-x-4">
          <Trees className="w-9 h-9" />
          <Trees className="w-7 h-7" />
        </div>
      </div>
      
      {/* Locality elements - bottom right quadrant */}
      <div className="absolute right-4 bottom-4 text-green-800 opacity-80">
        <div className="flex space-x-5">
          <Building2 className="w-11 h-11" />
          <Building className="w-9 h-9" />
          <Home className="w-8 h-8" />
        </div>
        <div className="mt-2 flex space-x-7">
          <Trees className="w-10 h-10" />
          <Trees className="w-8 h-8" />
        </div>
      </div>
      
      {/* Horizontal Road */}
      <div className="absolute left-0 right-0 top-1/2 h-[100px] bg-road transform -translate-y-1/2 border-y-2 border-roadMarking/30">
        {/* Center Line */}
        <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-roadMarking transform -translate-y-1/2 dashed-line" />
        
        {/* Lanes and border markings */}
        <div className="absolute left-0 right-0 top-0 h-[1px] bg-roadMarking/50" />
        <div className="absolute left-0 right-0 bottom-0 h-[1px] bg-roadMarking/50" />
        
        {/* Stop Lines - thicker and more visible */}
        <div className="absolute left-[240px] top-0 bottom-0 w-[8px] bg-roadMarking" />
        <div className="absolute right-[240px] top-0 bottom-0 w-[8px] bg-roadMarking" />
        
        {/* Lane Markers - adjusted for better visibility */}
        <div className="absolute left-[280px] top-[25px] h-[2px] w-[20px] bg-roadMarking" />
        <div className="absolute left-[280px] top-[75px] h-[2px] w-[20px] bg-roadMarking" />
        <div className="absolute right-[280px] top-[25px] h-[2px] w-[20px] bg-roadMarking" />
        <div className="absolute right-[280px] top-[75px] h-[2px] w-[20px] bg-roadMarking" />
      </div>
      
      {/* Vertical Road */}
      <div className="absolute top-0 bottom-0 left-1/2 w-[100px] bg-road transform -translate-x-1/2 border-x-2 border-roadMarking/30">
        {/* Center Line */}
        <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-roadMarking transform -translate-x-1/2 dashed-line" />
        
        {/* Lanes and border markings */}
        <div className="absolute top-0 bottom-0 left-0 w-[1px] bg-roadMarking/50" />
        <div className="absolute top-0 bottom-0 right-0 w-[1px] bg-roadMarking/50" />
        
        {/* Stop Lines - thicker and more visible */}
        <div className="absolute top-[140px] left-0 right-0 h-[8px] bg-roadMarking" />
        <div className="absolute bottom-[140px] left-0 right-0 h-[8px] bg-roadMarking" />
        
        {/* Lane Markers - adjusted for better visibility */}
        <div className="absolute left-[25px] top-[180px] w-[2px] h-[20px] bg-roadMarking" />
        <div className="absolute left-[75px] top-[180px] w-[2px] h-[20px] bg-roadMarking" />
        <div className="absolute left-[25px] bottom-[180px] w-[2px] h-[20px] bg-roadMarking" />
        <div className="absolute left-[75px] bottom-[180px] w-[2px] h-[20px] bg-roadMarking" />
      </div>
      
      {/* Intersection Box with subtle crosswalk pattern */}
      <div className="absolute left-1/2 top-1/2 w-[100px] h-[100px] transform -translate-x-1/2 -translate-y-1/2 border border-roadMarking/30">
        {/* Subtle intersection pattern */}
        <div className="absolute inset-0 bg-road opacity-80 pattern-dots pattern-white pattern-bg-transparent pattern-opacity-10 pattern-size-1" />
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
  
  // Position adjustments based on direction - moved closer to stop lines
  let className = "absolute z-10 ";
  switch (direction) {
    case 'north':
      className += "bottom-1/2 right-1/2 mb-[60px] mr-[10px]";
      break;
    case 'south':
      className += "top-1/2 left-1/2 mt-[60px] ml-[10px]";
      break;
    case 'east':
      className += "left-1/2 top-1/2 ml-[60px] mt-[10px]";
      break;
    case 'west':
      className += "right-1/2 bottom-1/2 mr-[60px] mb-[10px]";
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
        
        {/* Enhanced Glow Filters with stronger intensity */}
        <defs>
          <filter id="glow-red" x="0" y="0" width="24" height="24" filterUnits="userSpaceOnUse">
            <feFlood floodColor="#ff3b30" floodOpacity="1.2" result="flood" />
            <feComposite in="flood" in2="SourceGraphic" operator="in" result="comp" />
            <feGaussianBlur in="comp" stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          
          <filter id="glow-yellow" x="0" y="16" width="24" height="24" filterUnits="userSpaceOnUse">
            <feFlood floodColor="#ffcc00" floodOpacity="1.2" result="flood" />
            <feComposite in="flood" in2="SourceGraphic" operator="in" result="comp" />
            <feGaussianBlur in="comp" stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          
          <filter id="glow-green" x="0" y="32" width="24" height="24" filterUnits="userSpaceOnUse">
            <feFlood floodColor="#34c759" floodOpacity="1.4" result="flood" />
            <feComposite in="flood" in2="SourceGraphic" operator="in" result="comp" />
            <feGaussianBlur in="comp" stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
      </svg>
      
      {/* Traffic light pole */}
      <div className="absolute bottom-0 left-1/2 w-[3px] h-[15px] bg-gray-700 transform -translate-x-1/2 translate-y-full" />
    </div>
  );
};

export default Intersection;
