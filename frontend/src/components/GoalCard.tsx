import React from 'react';
import { Calendar, Edit, Trash2, CheckCircle, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Goal } from '@/contexts/GoalContext';

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (id: string) => void;
}

const GoalCard: React.FC<GoalCardProps> = ({ goal, onEdit, onDelete, onToggleComplete }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      health: 'bg-green-500/10 text-green-700 dark:text-green-400',
      career: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
      education: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
      finance: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
      personal: 'bg-pink-500/10 text-pink-700 dark:text-pink-400',
      travel: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
      hobbies: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
      relationships: 'bg-red-500/10 text-red-700 dark:text-red-400',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
  };

  const isOverdue = new Date(goal.targetDate) < new Date() && !goal.completed;

  return (
    <Card className={`goal-card animate-fade-in ${goal.completed ? 'opacity-75' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className={`text-lg ${goal.completed ? 'line-through text-muted-foreground' : ''}`}>
              {goal.title}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={getCategoryColor(goal.category)}>
                {goal.category}
              </Badge>
              {isOverdue && !goal.completed && (
                <Badge variant="destructive" className="text-xs">
                  Overdue
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleComplete(goal.id)}
            className="ml-2"
          >
            {goal.completed ? (
              <CheckCircle className="h-5 w-5 text-success" />
            ) : (
              <Circle className="h-5 w-5" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <p className={`text-sm text-muted-foreground mb-4 ${goal.completed ? 'line-through' : ''}`}>
          {goal.description}
        </p>
        
        <div className="space-y-3">
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 mr-2" />
            Target: {formatDate(goal.targetDate)}
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span className="font-medium">{goal.progress}%</span>
            </div>
            <Progress 
              value={goal.progress} 
              className="h-2"
            />
          </div>
        </div>
        
        <div className="flex gap-2 mt-4 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(goal)}
            className="flex-1"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(goal.id)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default GoalCard;