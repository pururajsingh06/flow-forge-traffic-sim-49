
import React from 'react';
import { SimulationState } from '@/lib/simulation/types';
import { getControllerByType } from '@/lib/simulation/simulator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Car, Clock, ArrowRightLeft, Brain, TrendingUp } from 'lucide-react';

interface StatisticsProps {
  simulationState: SimulationState;
}

const Statistics: React.FC<StatisticsProps> = ({ simulationState }) => {
  const { statistics, config, time, vehicles } = simulationState;
  const { totalVehicles, averageWaitTime, throughput, trafficDensity } = statistics;
  
  const controller = getControllerByType(config.aiController);
  const formattedTime = formatTime(time);
  
  // Calculate efficiency score (0-100)
  const efficiencyScore = Math.min(100, Math.max(0, 
    throughput > 0 
      ? (throughput / (averageWaitTime + 1)) * 10 
      : 0
  ));
  
  // Calculate traffic density for display
  const totalNorthSouth = (trafficDensity?.north || 0) + (trafficDensity?.south || 0);
  const totalEastWest = (trafficDensity?.east || 0) + (trafficDensity?.west || 0);
  const totalDensity = totalNorthSouth + totalEastWest;
  
  // Calculate percentage for visual display
  const nsPercentage = totalDensity > 0 ? (totalNorthSouth / totalDensity) * 100 : 50;
  
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
          
          {/* Traffic density visualization */}
          {trafficDensity && (
            <div className="mt-4">
              <div className="flex justify-between mb-1">
                <span className="text-xs">North-South Traffic</span>
                <span className="text-xs">East-West Traffic</span>
              </div>
              <div className="h-2 w-full bg-gray-200 rounded overflow-hidden flex">
                <div 
                  className="bg-blue-500 h-full" 
                  style={{ width: `${nsPercentage}%` }}
                />
                <div 
                  className="bg-green-500 h-full" 
                  style={{ width: `${100 - nsPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span>{totalNorthSouth.toFixed(1)}</span>
                <span>{totalEastWest.toFixed(1)}</span>
              </div>
            </div>
          )}
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
            
            {/* Traffic priority indicator */}
            {trafficDensity && (
              <div className="mt-2">
                <p className="text-sm font-medium flex items-center mb-1">
                  <TrendingUp className="h-3 w-3 mr-1" /> Traffic Priority
                </p>
                <div className="flex flex-col gap-1">
                  <div className="grid grid-cols-4 gap-1 text-xs">
                    <div className="p-1 bg-blue-100 rounded text-center">North</div>
                    <div className="p-1 bg-blue-100 rounded text-center">South</div>
                    <div className="p-1 bg-green-100 rounded text-center">East</div>
                    <div className="p-1 bg-green-100 rounded text-center">West</div>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    <Progress value={trafficDensity.north ? (trafficDensity.north / (totalDensity || 1)) * 100 : 0} 
                      className="h-1 bg-blue-100" 
                      indicatorClassName="bg-blue-500" />
                    <Progress value={trafficDensity.south ? (trafficDensity.south / (totalDensity || 1)) * 100 : 0} 
                      className="h-1 bg-blue-100" 
                      indicatorClassName="bg-blue-500" />
                    <Progress value={trafficDensity.east ? (trafficDensity.east / (totalDensity || 1)) * 100 : 0} 
                      className="h-1 bg-green-100" 
                      indicatorClassName="bg-green-500" />
                    <Progress value={trafficDensity.west ? (trafficDensity.west / (totalDensity || 1)) * 100 : 0} 
                      className="h-1 bg-green-100" 
                      indicatorClassName="bg-green-500" />
                  </div>
                </div>
              </div>
            )}
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
