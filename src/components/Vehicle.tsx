import React from 'react';
import { Vehicle as VehicleType } from '@/lib/simulation/types';
import { CarFront, Truck } from 'lucide-react';

interface VehicleProps {
  vehicle: VehicleType;
}

const Vehicle: React.FC<VehicleProps> = ({ vehicle }) => {
  const { position, direction, type, color, lane } = vehicle;

  // Calculate rotation degrees instead of Tailwind rotate classes for fine control
  let rotation = 0;
  switch (direction) {
    case 'north':
      rotation = 0;
      break;
    case 'south':
      rotation = 180;
      break;
    case 'east':
      rotation = 90;
      break;
    case 'west':
      rotation = -90;
      break;
  }

  // Define vehicle size (in px)
  const size = type === 'car' ? 16 : 24;

  // Optional lane offset in pixels (can be tuned down for more realism)
  const laneOffset = 5;

  // Compute adjusted position
  let offsetX = -size / 2;
  let offsetY = -size / 2;

  if (direction === 'north' || direction === 'south') {
    offsetX += lane === 'left' ? -laneOffset : lane === 'right' ? laneOffset : 0;
  } else {
    offsetY += lane === 'left' ? -laneOffset : lane === 'right' ? laneOffset : 0;
  }

  const left = position.x + offsetX;
  const top = position.y + offsetY;

  return (
    <div
      className="absolute transition-transform duration-100 ease-linear"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${size}px`,
        height: `${size}px`,
        transform: `rotate(${rotation}deg)`,
        color,
        zIndex: Math.floor(position.y)
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
