
'use client';

import { useState, useTransition, useEffect } from 'react';
import { Bot, Loader2, Plus, CornerDownRight, Trash2, Pencil, Sparkles, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { handleSuggestTasks } from '@/app/actions';
import type { Task, Project } from '@/types';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';
import { getTasksByProjectId, addTask, updateTask, deleteTask } from '@/lib/data';
import { useAuth } from '@/hooks/use-auth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';

export function ChecklistClient({ project }: { project: Project }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskContent, setNewTaskContent] = useState('');
  const [isPending, startTransition] = useTransition();
  const [suggestingTaskId, setSuggestingTaskId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  const isPro = userProfile?.plan === 'Pro';

  useEffect(() => {
    if (user) {
      const unsubscribe = getTasksByProjectId(project.id, (newTasks) => {
        setTasks(newTasks.sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0)));
        setLoadingTasks(false);
      });
      return () => unsubscribe();
    }
  }, [project.id, user]);

  const handleAddTask = async () => {
    if (newTaskContent.trim() === '' || !user) return;
    try {
      await addTask(project.id, {
        content: newTaskContent.trim(),
        completed: false,
        subtasks: [],
        projectId: project.id,
        userId: user.uid,
        createdAt: new Date(),
      });
      setNewTaskContent('');
      toast({ title: "¡Tarea añadida!" });
    } catch (error) {
      toast({ variant: 'destructive', title: "Error", description: "No se pudo añadir la tarea." });
    }
  };

  const handleToggleCompletion = async (task: Task, parentTask?: Task) => {
    const taskToUpdate = { ...task, completed: !task.completed };
    if (parentTask) {
        const updatedSubtasks = parentTask.subtasks.map(st => st.id === task.id ? taskToUpdate : st);
        await updateTask(project.id, parentTask.id!, { subtasks: updatedSubtasks });
    } else {
        await updateTask(project.id, task.id!, taskToUpdate);
    }
  };

  const handleDeleteTask = async (taskId: string, parentTask?: Task) => {
    try {
        if (parentTask) {
            const updatedSubtasks = parentTask.subtasks.filter(st => st.id !== taskId);
            await updateTask(project.id, parentTask.id!, { subtasks: updatedSubtasks });
        } else {
            await deleteTask(project.id, taskId);
        }
        toast({ title: "Tarea eliminada" });
    } catch (error) {
        toast({ variant: 'destructive', title: "Error", description: "No se pudo eliminar la tarea." });
    }
  };

  const startEditing = (task: Task) => {
    setEditingTaskId(task.id!);
    setEditingContent(task.content);
  };

  const cancelEditing = () => {
    setEditingTaskId(null);
    setEditingContent('');
  };

  const handleUpdateTaskContent = async (task: Task, parentTask?: Task) => {
    if (editingContent.trim() === '') return;
    const taskToUpdate = { ...task, content: editingContent };

     try {
        if (parentTask) {
            const updatedSubtasks = parentTask.subtasks.map(st => st.id === task.id ? taskToUpdate : st);
            await updateTask(project.id, parentTask.id!, { subtasks: updatedSubtasks });
        } else {
            await updateTask(project.id, task.id!, taskToUpdate);
        }
        cancelEditing();
        toast({ title: "Tarea actualizada" });
    } catch (error) {
        toast({ variant: 'destructive', title: "Error", description: "No se pudo actualizar el contenido de la tarea." });
    }
  };

  const handleSuggest = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !user) return;

    startTransition(async () => {
      setSuggestingTaskId(taskId);
      const result = await handleSuggestTasks(task.content, project.description);
      if (result.success && result.subtasks) {
        const newSubtasks: Task[] = result.subtasks.map((content, index) => ({
          id: `sub-${taskId}-${Date.now()}-${index}`,
          content,
          completed: false,
          subtasks: [],
          projectId: project.id,
          userId: user.uid,
          createdAt: new Date(Date.now() + index),
        }));
        
        const updatedTask = { ...task, subtasks: [...task.subtasks, ...newSubtasks] };
        await updateTask(project.id, taskId, updatedTask);

        toast({
          title: '¡Subtareas añadidas!',
          description: `${result.subtasks.length} nuevas subtareas sugeridas por IA.`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Sugerencia de IA Fallida',
          description: result.error,
        });
      }
      setSuggestingTaskId(null);
    });
  };

  const TaskItem = ({ task, isSubtask = false, parentTask }: { task: Task; isSubtask?: boolean; parentTask?: Task }) => (
    <div
      key={task.id}
      className={cn('flex flex-col group', isSubtask && 'pl-8')}
    >
      <div className="flex items-center gap-3 py-2">
        {!isSubtask && <CornerDownRight className="h-4 w-4 text-muted-foreground/0" />}
        {isSubtask && <CornerDownRight className="h-4 w-4 text-muted-foreground" />}
        <Checkbox
            id={task.id}
            checked={task.completed}
            onCheckedChange={() => handleToggleCompletion(task, parentTask)}
        />
        {editingTaskId === task.id ? (
             <Input
                type="text"
                value={editingContent}
                onChange={(e) => setEditingContent(e.target.value)}
                onBlur={() => handleUpdateTaskContent(task, parentTask)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdateTaskContent(task, parentTask);
                    if (e.key === 'Escape') cancelEditing();
                }}
                autoFocus
                className="flex-1 h-8"
            />
        ) : (
            <label
                htmlFor={task.id}
                className={cn('flex-1 text-sm font-medium leading-none cursor-pointer', task.completed && 'text-muted-foreground line-through')}
                onDoubleClick={() => startEditing(task)}
            >
                {task.content}
            </label>
        )}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isSubtask && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleSuggest(task.id!)}
                                disabled={!isPro || (isPending && suggestingTaskId === task.id)}
                                className="h-8 w-8"
                            >
                                {isPending && suggestingTaskId === task.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                <Bot className="h-4 w-4" />
                                )}
                            </Button>
                        </TooltipTrigger>
                        {!isPro && (
                            <TooltipContent>
                                <p>Función Pro: Sugerir subtareas con IA.</p>
                                <Button variant="link" size="sm" asChild className="p-0 h-auto">
                                    <Link href="/pricing">
                                        Actualizar plan <ExternalLink className="ml-1 h-3 w-3" />
                                    </Link>
                                </Button>
                            </TooltipContent>
                        )}
                    </Tooltip>
                </TooltipProvider>
            )}
             <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEditing(task)}>
                <Pencil className="h-4 w-4" />
            </Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción no se puede deshacer. Esto eliminará permanentemente la tarea
                        {isSubtask ? '.' : ' y todas sus subtareas.'}
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDeleteTask(task.id!, parentTask)}>Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      </div>
      {task.subtasks?.length > 0 && (
          <div className="flex flex-col">
              {task.subtasks.sort((a,b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0)).map(subtask => (
                <TaskItem key={subtask.id} task={subtask} isSubtask={true} parentTask={task} />
              ))}
          </div>
      )}
    </div>
  );

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Añadir una nueva tarea..."
              value={newTaskContent}
              onChange={(e) => setNewTaskContent(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
            />
            <Button onClick={handleAddTask} disabled={isPending || !user}>
              <Plus className="h-4 w-4 mr-2" /> Añadir Tarea
            </Button>
          </div>

          <Separator />
          
          {loadingTasks ? (
             <div className="flex justify-center items-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
             </div>
          ) : (
            <div className="flex flex-col divide-y divide-border">
                {tasks.map(task => (
                <TaskItem key={task.id} task={task} />
                ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
