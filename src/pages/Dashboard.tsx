import React, { useState } from 'react';
import { Plus, Search, Filter, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useGoals, Goal } from '@/contexts/GoalContext';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import GoalCard from '@/components/GoalCard';
import GoalForm from '@/components/GoalForm';
import EmptyState from '@/components/EmptyState';

const Dashboard: React.FC = () => {
  const {
    goals,
    addGoal,
    updateGoal,
    deleteGoal,
    searchTerm,
    setSearchTerm,
    filterCategory,
    setFilterCategory,
    filterStatus,
    setFilterStatus,
    filteredGoals
  } = useGoals();

  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);

  const categories = ['health', 'career', 'education', 'finance', 'personal', 'travel', 'hobbies', 'relationships'];

  const handleCreateGoal = () => {
    setEditingGoal(null);
    setIsFormOpen(true);
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setIsFormOpen(true);
  };

  const handleFormSubmit = (goalData: Omit<Goal, 'id' | 'createdAt' | 'userId' | 'completed'>) => {
    if (editingGoal) {
      updateGoal(editingGoal.id, goalData);
      toast({
        title: "Goal updated!",
        description: "Your goal has been successfully updated.",
      });
    } else {
      addGoal(goalData);
      toast({
        title: "Goal created!",
        description: "Your new goal has been added to your list.",
      });
    }
  };

  const handleDeleteGoal = (id: string) => {
    setDeletingGoalId(id);
  };

  const confirmDelete = () => {
    if (deletingGoalId) {
      deleteGoal(deletingGoalId);
      setDeletingGoalId(null);
      toast({
        title: "Goal deleted",
        description: "Your goal has been removed from your list.",
      });
    }
  };

  const handleToggleComplete = (id: string) => {
    const goal = goals.find(g => g.id === id);
    if (goal) {
      updateGoal(id, { 
        completed: !goal.completed,
        progress: goal.completed ? goal.progress : 100
      });
      toast({
        title: goal.completed ? "Goal reopened" : "Goal completed!",
        description: goal.completed ? "Keep working towards your goal." : "Congratulations on achieving your goal!",
      });
    }
  };

  const getStats = () => {
    const total = goals.length;
    const completed = goals.filter(g => g.completed).length;
    const inProgress = goals.filter(g => !g.completed && g.progress > 0).length;
    const notStarted = goals.filter(g => !g.completed && g.progress === 0).length;
    
    return { total, completed, inProgress, notStarted };
  };

  const stats = getStats();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="goal-card text-center p-4">
            <div className="text-2xl font-bold text-primary">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Goals</div>
          </div>
          <div className="goal-card text-center p-4">
            <div className="text-2xl font-bold text-success">{stats.completed}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </div>
          <div className="goal-card text-center p-4">
            <div className="text-2xl font-bold text-warning">{stats.inProgress}</div>
            <div className="text-sm text-muted-foreground">In Progress</div>
          </div>
          <div className="goal-card text-center p-4">
            <div className="text-2xl font-bold text-muted-foreground">{stats.notStarted}</div>
            <div className="text-sm text-muted-foreground">Not Started</div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1">
            <h2 className="text-3xl font-bold mb-4">Your Goals</h2>
          </div>
          
          <Button onClick={handleCreateGoal} className="btn-hero">
            <Plus className="h-4 w-4 mr-2" />
            New Goal
          </Button>
        </div>

        {/* Filters */}
        {goals.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search goals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterStatus} onValueChange={(value: 'all' | 'active' | 'completed') => setFilterStatus(value)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Goals Grid */}
        {filteredGoals.length === 0 ? (
          goals.length === 0 ? (
            <EmptyState onCreateGoal={handleCreateGoal} />
          ) : (
            <div className="text-center py-16">
              <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No goals match your filters</h3>
              <p className="text-muted-foreground">Try adjusting your search or filter criteria.</p>
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={handleEditGoal}
                onDelete={handleDeleteGoal}
                onToggleComplete={handleToggleComplete}
              />
            ))}
          </div>
        )}
      </main>

      {/* Goal Form Modal */}
      <GoalForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        editingGoal={editingGoal}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingGoalId} onOpenChange={() => setDeletingGoalId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this goal? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;