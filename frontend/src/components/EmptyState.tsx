import React from 'react';
import { Target, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  onCreateGoal: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onCreateGoal }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      <div className="rounded-full bg-muted p-6 mb-6">
        <Target className="h-12 w-12 text-muted-foreground" />
      </div>
      
      <h3 className="text-xl font-semibold mb-2">No goals yet</h3>
      
      <p className="text-muted-foreground mb-6 max-w-md">
        Start your journey to success by creating your first goal. 
        Break down your dreams into achievable milestones.
      </p>
      
      <Button onClick={onCreateGoal} className="btn-hero">
        <Plus className="h-4 w-4 mr-2" />
        Create Your First Goal
      </Button>
    </div>
  );
};

export default EmptyState;