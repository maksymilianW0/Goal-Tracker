import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  targetDate: string;
  progress: number;
  completed: boolean;
  createdAt: string;
  userId: string;
}

interface GoalContextType {
  goals: Goal[];
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'userId' | 'completed'>) => void;
  updateGoal: (id: string, goal: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterCategory: string;
  setFilterCategory: (category: string) => void;
  filterStatus: 'all' | 'active' | 'completed';
  setFilterStatus: (status: 'all' | 'active' | 'completed') => void;
  filteredGoals: Goal[];
}

const GoalContext = createContext<GoalContextType | undefined>(undefined);

interface GoalProviderProps {
  children: ReactNode;
}

export const GoalProvider: React.FC<GoalProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');

  // Load goals from localStorage when user changes
  useEffect(() => {
    if (user) {
      const storedGoals = localStorage.getItem(`goal-tracker-goals-${user.id}`);
      if (storedGoals) {
        setGoals(JSON.parse(storedGoals));
      }
    } else {
      setGoals([]);
    }
  }, [user]);

  // Save goals to localStorage whenever goals change
  useEffect(() => {
    if (user && goals.length >= 0) {
      localStorage.setItem(`goal-tracker-goals-${user.id}`, JSON.stringify(goals));
    }
  }, [goals, user]);

  const addGoal = (goalData: Omit<Goal, 'id' | 'createdAt' | 'userId' | 'completed'>) => {
    if (!user) return;
    
    const newGoal: Goal = {
      ...goalData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      userId: user.id,
      completed: false
    };
    
    setGoals(prev => [...prev, newGoal]);
  };

  const updateGoal = (id: string, goalData: Partial<Goal>) => {
    setGoals(prev => prev.map(goal => 
      goal.id === id ? { ...goal, ...goalData } : goal
    ));
  };

  const deleteGoal = (id: string) => {
    setGoals(prev => prev.filter(goal => goal.id !== id));
  };

  // Filtered goals based on search and filters
  const filteredGoals = goals.filter(goal => {
    const matchesSearch = goal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         goal.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || goal.category === filterCategory;
    
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'completed' && goal.completed) ||
                         (filterStatus === 'active' && !goal.completed);
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const value = {
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
  };

  return (
    <GoalContext.Provider value={value}>
      {children}
    </GoalContext.Provider>
  );
};

export const useGoals = () => {
  const context = useContext(GoalContext);
  if (context === undefined) {
    throw new Error('useGoals must be used within a GoalProvider');
  }
  return context;
};