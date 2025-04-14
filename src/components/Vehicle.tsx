
import React from 'react';
import { Vehicle as VehicleType } from '@/lib/simulation/types';
import { CarFront, Truck } from 'lucide-react';

interface VehicleProps {
  vehicle: VehicleType;
}

const Vehicle: React.FC<VehicleProps> = ({ vehicle }) => {
  const { position, direction, type, color, lane } = vehicle;
  
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
  
  // Get precise lane offset for accurate alignment
  const getLaneOffset = () => {
    switch (direction) {
      case 'north':
        return lane === 'left' ? -10 : 10;
      case 'south':
        return lane === 'left' ? -10 : 10;
      case 'east':
        return lane === 'left' ? 10 : -10;
      case 'west':
        return lane === 'left' ? 10 : -10;
      default:
        return 0;
    }
  };
  
  // Apply lane-specific positioning adjustment
  const calculatePosition = () => {
    const basePosition = {
      x: position.x, 
      y: position.y
    };
    
    // Center the vehicle on its position
    const centerOffset = type === 'car' ? 3 : 4;
    
    switch (direction) {
      case 'north':
      case 'south':
        basePosition.x -= centerOffset;
        break;
      case 'east':
      case 'west':
        basePosition.y -= centerOffset;
        break;
    }
    
    return basePosition;
  };
  
  const calculatedPosition = calculatePosition();
  
  return (
    <div 
      className={`absolute transform ${rotation} ${size} transition-transform`} 
      style={{ 
        left: `${calculatedPosition.x}px`, 
        top: `${calculatedPosition.y}px`,
        color: color,
        zIndex: Math.floor(position.y) // Keep z-index based on position
      }}
    >
      {type === 'car' ? (
        <CarFront className="w-full h-full" />
      ) : (
        <Truck className="w-full h-full" />
      )}
    </div>
  );
};

export default Vehicle;
