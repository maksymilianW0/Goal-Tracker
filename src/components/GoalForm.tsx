import React, { useState, useEffect } from 'react';
import { X, Plus, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Goal } from '@/contexts/GoalContext';

interface GoalFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (goal: Omit<Goal, 'id' | 'createdAt' | 'userId' | 'completed'>) => void;
  editingGoal?: Goal | null;
}

const categories = [
  'health', 'career', 'education', 'finance', 'personal', 
  'travel', 'hobbies', 'relationships'
];

const GoalForm: React.FC<GoalFormProps> = ({ isOpen, onClose, onSubmit, editingGoal }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [progress, setProgress] = useState([0]);
  const [errors, setErrors] = useState<{
    title?: string;
    description?: string;
    category?: string;
    targetDate?: string;
  }>({});

  useEffect(() => {
    if (editingGoal) {
      setTitle(editingGoal.title);
      setDescription(editingGoal.description);
      setCategory(editingGoal.category);
      setTargetDate(editingGoal.targetDate);
      setProgress([editingGoal.progress]);
    } else {
      // Reset form for new goal
      setTitle('');
      setDescription('');
      setCategory('');
      setTargetDate('');
      setProgress([0]);
    }
  }, [editingGoal, isOpen]);

  const validateForm = () => {
    const newErrors: {
      title?: string;
      description?: string;
      category?: string;
      targetDate?: string;
    } = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    } else if (description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (!category) {
      newErrors.category = 'Category is required';
    }

    if (!targetDate) {
      newErrors.targetDate = 'Target date is required';
    } else if (new Date(targetDate) <= new Date()) {
      newErrors.targetDate = 'Target date must be in the future';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      category,
      targetDate,
      progress: progress[0]
    });

    // Reset form
    setTitle('');
    setDescription('');
    setCategory('');
    setTargetDate('');
    setProgress([0]);
    setErrors({});
    onClose();
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setCategory('');
    setTargetDate('');
    setProgress([0]);
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {editingGoal ? (
              <>
                <Save className="h-5 w-5" />
                Edit Goal
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" />
                Create New Goal
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Goal Title</Label>
            <Input
              id="title"
              placeholder="Enter your goal title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={errors.title ? 'border-destructive' : ''}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your goal in detail"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={errors.description ? 'border-destructive' : ''}
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className={errors.category ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-destructive">{errors.category}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetDate">Target Date</Label>
            <Input
              id="targetDate"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className={errors.targetDate ? 'border-destructive' : ''}
              min={new Date().toISOString().split('T')[0]}
            />
            {errors.targetDate && (
              <p className="text-sm text-destructive">{errors.targetDate}</p>
            )}
          </div>

          <div className="space-y-4">
            <Label>Progress</Label>
            <div className="space-y-2">
              <Slider
                value={progress}
                onValueChange={setProgress}
                max={100}
                step={5}
                className="w-full"
              />
              <div className="text-center text-sm text-muted-foreground">
                {progress[0]}% complete
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" className="flex-1 btn-hero">
              {editingGoal ? (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Update Goal
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Goal
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default GoalForm;