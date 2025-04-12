
import React from 'react';
import { Vehicle as VehicleType } from '@/lib/simulation/types';
import { CarFront } from 'lucide-react';

interface VehicleProps {
  vehicle: VehicleType;
}

const Vehicle: React.FC<VehicleProps> = ({ vehicle }) => {
  const { position, direction, type, color } = vehicle;
  
  // Determine rotation based on direction
  let rotation = '';
  switch (direction) {
    case 'north':
      rotation = 'rotate-0';
      break;
    case 'south':
      rotation = 'rotate-180';
      break;
    case 'east':
      rotation = 'rotate-90';
      break;
    case 'west':
      rotation = '-rotate-90';
      break;
  }
  
  // Size based on vehicle type
  const size = type === 'car' ? 'w-6 h-6' : 'w-8 h-8';
  
  return (
    <div 
      className={`absolute transform ${rotation} ${size} transition-transform`} 
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        color: color
      }}
    >
      <CarFront className="w-full h-full" />
    </div>
  );
};

export default Vehicle;
