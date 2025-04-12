
import React from 'react';
import { SimulationState } from '@/lib/simulation/types';
import { getControllerByType } from '@/lib/simulation/simulator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Car, Clock, ArrowRightLeft, Brain } from 'lucide-react';

interface StatisticsProps {
  simulationState: SimulationState;
}

const Statistics: React.FC<StatisticsProps> = ({ simulationState }) => {
  const { statistics, config, time, vehicles } = simulationState;
  const { totalVehicles, averageWaitTime, throughput } = statistics;
  
  const controller = getControllerByType(config.aiController);
  const formattedTime = formatTime(time);
  
  // Calculate efficiency score (0-100)
  const efficiencyScore = Math.min(100, Math.max(0, 
    throughput > 0 
      ? (throughput / (averageWaitTime + 1)) * 10 
      : 0
  ));
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Traffic Overview</CardTitle>
            <Badge variant="outline">{formattedTime}</Badge>
          </div>
          <CardDescription>Current simulation metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Car className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Active Vehicles</p>
                <p className="text-2xl font-bold">{vehicles.length}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Avg. Wait Time</p>
                <p className="text-2xl font-bold">{averageWaitTime.toFixed(1)}s</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <ArrowRightLeft className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">Throughput</p>
                <p className="text-2xl font-bold">{throughput}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Car className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Total Vehicles</p>
                <p className="text-2xl font-bold">{totalVehicles}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">AI Controller</CardTitle>
          <CardDescription>{controller.getDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Brain className="h-4 w-4 text-indigo-500" />
              <p className="font-medium">{controller.getName()}</p>
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <p className="text-sm">Efficiency Score</p>
                <p className="text-sm font-medium">{Math.round(efficiencyScore)}%</p>
              </div>
              <Progress value={efficiencyScore} className="h-2" />
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2 bg-muted rounded">
                <p className="text-muted-foreground">Speed</p>
                <p className="font-medium">{config.simulationSpeed.toFixed(1)}x</p>
              </div>
              
              <div className="p-2 bg-muted rounded">
                <p className="text-muted-foreground">Green Time</p>
                <p className="font-medium">{config.aiParams.greenDuration}s</p>
              </div>
              
              <div className="p-2 bg-muted rounded">
                <p className="text-muted-foreground">Yellow Time</p>
                <p className="font-medium">{config.aiParams.yellowDuration}s</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Helper function to format time as MM:SS
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default Statistics;
