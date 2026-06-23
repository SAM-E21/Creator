
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, PlusCircle, Loader2, Trash2, UserPlus, ExternalLink } from 'lucide-react';
import type { Project } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { addProject, deleteProject, joinProjectWithCode } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
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
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const PLAN_LIMITS = {
  'Gratuito': 7,
  'Pro': 20,
};

export function ProjectsDashboardClient({ projects }: { projects: Project[] }) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [isJoinDialogOpen, setJoinDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);
  
  const currentPlan = userProfile?.plan || 'Gratuito';
  const projectLimit = PLAN_LIMITS[currentPlan];
  const hasReachedLimit = projects.length >= projectLimit;

  const handleCreateProject = async () => {
    if (!user || !newProjectName) return;
    if (hasReachedLimit) {
        toast({ 
            variant: 'destructive', 
            title: 'Límite de proyectos alcanzado',
            description: `Has alcanzado el límite de ${projectLimit} proyectos para el plan ${currentPlan}.`
        });
        return;
    }
    try {
      await addProject({
        name: newProjectName,
        description: newProjectDescription,
        userId: user.uid,
        progress: 0,
        startDate: new Date().toISOString(),
        phases: [],
        goals: [],
      });
      setNewProjectName('');
      setNewProjectDescription('');
      setCreateDialogOpen(false);
      toast({ title: '¡Proyecto creado!' });
    } catch (error) {
      console.error('Error creating project:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear el proyecto.' });
    }
  };

  const handleJoinProject = async () => {
    if (!user || !joinCode.trim()) return;
    setIsJoining(true);
    const result = await joinProjectWithCode(user.uid, joinCode.trim());
    if (result.success) {
        toast({ title: '¡Éxito!', description: result.message });
        setJoinDialogOpen(false);
        setJoinCode('');
    } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
    setIsJoining(false);
  };
  
  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteProject(projectId);
      toast({ title: "Proyecto eliminado exitosamente" });
    } catch (error) {
      console.error("Error deleting project:", error);
      toast({ variant: 'destructive', title: "Error", description: "No se pudo eliminar el proyecto." });
    }
  };

  if (loading || !user) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  const NewProjectButton = (
    <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className={hasReachedLimit ? 'cursor-not-allowed' : ''}>
              <DialogTrigger asChild>
                <Button disabled={hasReachedLimit}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Nuevo Proyecto
                </Button>
              </DialogTrigger>
            </span>
          </TooltipTrigger>
          {hasReachedLimit && (
            <TooltipContent>
              <p>Límite de {projectLimit} proyectos alcanzado.</p>
              <Button variant="link" size="sm" asChild className="p-0 h-auto">
                 <Link href="/pricing">
                    Actualizar plan
                    <ExternalLink className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Proyecto</DialogTitle>
          <DialogDescription>
            Dale un nombre y una descripción opcional a tu nuevo proyecto para empezar.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nombre
            </Label>
            <Input
              id="name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="col-span-3"
              placeholder="Mi Increíble Proyecto"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Descripción
            </Label>
            <Textarea
              id="description"
              value={newProjectDescription}
              onChange={(e) => setNewProjectDescription(e.target.value)}
              className="col-span-3"
              placeholder="Una breve descripción de qué trata este proyecto."
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleCreateProject} disabled={!newProjectName}>
            Crear Proyecto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Proyectos</h1>
          <p className="text-muted-foreground">
            Has creado {projects.length} de {projectLimit} proyectos.
          </p>
        </div>
        <div className="flex gap-2">
            {/* Join Project Dialog */}
            <Dialog open={isJoinDialogOpen} onOpenChange={setJoinDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Unirse a Proyecto
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Unirse a un Proyecto</DialogTitle>
                        <DialogDescription>
                            Ingresa el código de 6 caracteres del proyecto al que deseas unirte.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="join-code" className="text-right">
                                Código
                            </Label>
                            <Input
                                id="join-code"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                className="col-span-3 uppercase"
                                placeholder="ej. AB12CD"
                                maxLength={6}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" onClick={handleJoinProject} disabled={!joinCode || isJoining}>
                            {isJoining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Unirse
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Project Button */}
            {NewProjectButton}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card
            key={project.id}
            className="flex flex-col transition-all hover:shadow-lg group"
          >
            <CardHeader>
              <CardTitle className="text-primary">{project.name}</CardTitle>
              <CardDescription>{project.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <div>
                <span className="text-sm font-medium text-muted-foreground">
                  Progreso
                </span>
                <div className="flex items-center gap-2">
                  <Progress value={project.progress} className="w-full" />
                  <span className="text-sm font-semibold">
                    {project.progress}%
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex-col items-start gap-2">
              <Button asChild variant="ghost" className="w-full justify-start">
                <Link href={`/projects/${project.id}`}>
                  Abrir Proyecto
                  <ArrowRight className="ml-auto h-4 w-4" />
                </Link>
              </Button>
              {project.ownerId === user.uid && (
                 <div className="w-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar Proyecto
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente el proyecto y todos sus datos asociados (tareas, notas, etc.).
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteProject(project.id)}>Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                    </AlertDialog>
                </div>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
       {projects.length === 0 && (
          <div className="col-span-1 md:col-span-2 lg:col-span-3 mt-8 text-center">
            <p className="text-muted-foreground">Aún no tienes proyectos.</p>
            <Button variant="link" onClick={() => setCreateDialogOpen(true)}>Crea tu primer proyecto</Button>
          </div>
        )}
    </div>
  );
}
