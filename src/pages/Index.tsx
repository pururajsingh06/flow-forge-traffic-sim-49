
import React from 'react';
import TrafficSimulation from '@/components/TrafficSimulation';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container py-4">
          <h1 className="text-2xl font-bold">AI Traffic Signal Simulator</h1>
          <p className="text-muted-foreground">
            Test and compare different AI models to optimize traffic flow
          </p>
        </div>
      </header>
      
      <main className="container py-6">
        <TrafficSimulation />
        
        <div className="mt-8 bg-card p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">How to Use This Simulator</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h3 className="font-medium">Traffic Controllers</h3>
              <p className="text-sm text-muted-foreground">
                Try different AI controllers to see how they affect traffic flow:
              </p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li><strong>Fixed Timing:</strong> Traditional timed signals</li>
                <li><strong>Adaptive:</strong> Adjusts to traffic volume</li>
                <li><strong>Reinforcement Learning:</strong> Self-improving AI</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium">Simulation Controls</h3>
              <p className="text-sm text-muted-foreground">
                Adjust various parameters to test different scenarios:
              </p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>Change simulation speed</li>
                <li>Adjust vehicle spawn rate</li>
                <li>Modify light timing parameters</li>
                <li>Reset to start a fresh simulation</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium">Performance Metrics</h3>
              <p className="text-sm text-muted-foreground">
                Compare the effectiveness of different controllers:
              </p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>Average vehicle wait time</li>
                <li>Intersection throughput</li>
                <li>Overall efficiency score</li>
                <li>Traffic flow patterns</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="border-t mt-12 py-6 bg-muted/40">
        <div className="container text-center text-sm text-muted-foreground">
          <p>AI Traffic Signal Simulator &copy; {new Date().getFullYear()}</p>
          <p className="mt-1">Created to explore modern traffic management techniques with AI</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
