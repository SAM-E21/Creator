
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { addCodiumProgram, getCodiumPrograms, deleteCodiumProgram, getProjects } from '@/lib/data';
import type { CodiumProgram, Project } from '@/types';
import { Loader2, PlusCircle, Blocks, Trash2 } from 'lucide-react';
import Link from 'next/link';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


export default function CodiumPage() {
  const [programs, setPrograms] = useState<CodiumProgram[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [newProgramName, setNewProgramName] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      const unsubscribePrograms = getCodiumPrograms(user.uid, (newPrograms) => {
        setPrograms(newPrograms);
        setIsLoading(false);
      });
      const unsubscribeProjects = getProjects(user.uid, (newProjects) => {
        setProjects(newProjects);
      });
      return () => {
        unsubscribePrograms();
        unsubscribeProjects();
      };
    }
  }, [user]);

  const handleCreateProgram = async () => {
    if (!user || !newProgramName.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'El nombre del programa no puede estar vacío.' });
      return;
    }
    try {
      const newProgramId = await addCodiumProgram(user.uid, newProgramName.trim(), selectedProjectId);
      setNewProgramName('');
      setSelectedProjectId(undefined);
      setDialogOpen(false);
      toast({ title: '¡Programa Creado!', description: 'Tu nuevo programa de Codium ha sido creado.' });
      router.push(`/codium/${newProgramId}`);
    } catch (error) {
      console.error('Error creating codium program:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear el programa.' });
    }
  };

  const handleDelete = async (programId: string) => {
    try {
        await deleteCodiumProgram(programId);
        toast({ title: 'Programa Eliminado' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el programa.' });
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Blocks className="w-8 h-8 text-primary"/>
            Codium
          </h1>
          <p className="text-muted-foreground">
            Crea y visualiza la lógica de tus programas con bloques.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Programa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Programa en Codium</DialogTitle>
              <DialogDescription>
                Dale un nombre a tu programa y, opcionalmente, asígnalo a un proyecto.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="program-name">Nombre del Programa</Label>
                <Input
                  id="program-name"
                  value={newProgramName}
                  onChange={(e) => setNewProgramName(e.target.value)}
                  placeholder="Ej. Algoritmo de Ordenamiento"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="project-id">Asignar a Proyecto (Opcional)</Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger id="project-id">
                        <SelectValue placeholder="Selecciona un proyecto" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="no-project">No asignar a ningún proyecto</SelectItem>
                        {projects.map(project => (
                            <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateProgram} disabled={!newProgramName.trim()}>
                Crear y Abrir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {programs.map((program) => (
          <Card key={program.id} className="h-full flex flex-col justify-between transition-shadow hover:shadow-lg group">
            <Link href={`/codium/${program.id}`} className="flex flex-col flex-grow">
              <CardHeader>
                <CardTitle className="text-primary">{program.name}</CardTitle>
                 <CardDescription>
                  {program.updatedAt ? `Última actualización: ${program.updatedAt.toLocaleDateString()}` : 'Aún no actualizado'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex items-center justify-center bg-muted/20 aspect-video">
                 <Blocks className="w-16 h-16 text-muted-foreground/30" />
              </CardContent>
            </Link>
             <div className="p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full">
                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción no se puede deshacer. Esto eliminará permanentemente este programa de Codium.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(program.id!)}>
                                Eliminar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
          </Card>
        ))}
      </div>

      {programs.length === 0 && !isLoading && (
        <div className="col-span-1 md:col-span-2 lg:col-span-4 mt-8 text-center">
          <p className="text-muted-foreground">Aún no tienes programas en Codium.</p>
          <Button variant="link" onClick={() => setDialogOpen(true)}>
            Crea tu primer programa
          </Button>
        </div>
      )}
    </div>
  );
}
