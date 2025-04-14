
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
  
  // Apply lane-specific positioning adjustment
  const calculatePosition = () => {
    // Start with the base position
    const adjustedPosition = {
      x: position.x, 
      y: position.y
    };
    
    // Adjust for vehicle size and center it
    const centerOffset = type === 'car' ? 3 : 4;
    
    // Apply lane offset and direction-specific adjustments
    switch (direction) {
      case 'north':
        // Center horizontally
        adjustedPosition.x -= centerOffset;
        // Adjust for lane (left or right of road)
        adjustedPosition.x += (lane === 'left' ? -10 : 10);
        break;
      case 'south':
        // Center horizontally
        adjustedPosition.x -= centerOffset;
        // Adjust for lane (left or right of road)
        adjustedPosition.x += (lane === 'left' ? -10 : 10);
        break;
      case 'east':
        // Center vertically
        adjustedPosition.y -= centerOffset;
        // Adjust for lane (left or right of road)
        adjustedPosition.y += (lane === 'left' ? -10 : 10);
        break;
      case 'west':
        // Center vertically
        adjustedPosition.y -= centerOffset;
        // Adjust for lane (left or right of road)
        adjustedPosition.y += (lane === 'left' ? -10 : 10);
        break;
    }
    
    return adjustedPosition;
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
