
'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { addSketch, getSketches } from '@/lib/data';
import type { Sketch } from '@/types';
import { Loader2, PlusCircle, Brush } from 'lucide-react';
import Link from 'next/link';

export default function ProjectSketchesPage() {
  const [sketches, setSketches] = useState<Sketch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [newSketchName, setNewSketchName] = useState('');
  
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const projectId = params.id as string;

  useEffect(() => {
    if (user && projectId) {
      setIsLoading(true);
      const unsubscribe = getSketches(projectId, (newSketches) => {
        setSketches(newSketches);
        setIsLoading(false);
      });
      return () => unsubscribe();
    }
  }, [projectId, user]);

  const handleCreateSketch = async () => {
    if (!user || !newSketchName.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'El nombre del boceto no puede estar vacío.' });
      return;
    }
    try {
      const newSketchId = await addSketch(projectId, user.uid, newSketchName.trim());
      setNewSketchName('');
      setDialogOpen(false);
      toast({ title: '¡Boceto Creado!', description: 'Tu nuevo boceto ha sido creado.' });
      router.push(`/projects/${projectId}/sketch/${newSketchId}`);
    } catch (error) {
      console.error('Error creating sketch:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear el boceto.' });
    }
  };

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
            <Brush className="w-8 h-8 text-primary"/>
            Bocetos
          </h1>
          <p className="text-muted-foreground">
            Tu lienzo personal para ideas, diagramas y garabatos.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Boceto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Boceto</DialogTitle>
              <DialogDescription>
                Dale un nombre a tu nuevo boceto para empezar.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Label htmlFor="sketch-name">Nombre del Boceto</Label>
              <Input
                id="sketch-name"
                value={newSketchName}
                onChange={(e) => setNewSketchName(e.target.value)}
                placeholder="Ej. Wireframes de la UI, Diagrama de Flujo"
              />
            </div>
            <DialogFooter>
              <Button onClick={handleCreateSketch} disabled={!newSketchName.trim()}>
                Crear y Abrir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sketches.map((sketch) => (
          <Link key={sketch.id} href={`/projects/${projectId}/sketch/${sketch.id}`}>
            <Card className="h-full flex flex-col justify-between transition-shadow hover:shadow-lg cursor-pointer">
              <CardHeader>
                <CardTitle className="text-primary">{sketch.name}</CardTitle>
                <CardDescription>
                  {sketch.updatedAt ? `Última actualización: ${sketch.updatedAt.toLocaleDateString()}` : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex items-center justify-center bg-muted/20 aspect-video">
                 {sketch.content ? (
                    <img src={sketch.content} alt={sketch.name} className="object-contain max-h-full max-w-full"/>
                 ) : (
                    <div className="text-muted-foreground text-sm">Boceto vacío</div>
                 )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {sketches.length === 0 && !isLoading && (
        <div className="col-span-1 md:col-span-2 lg:col-span-4 mt-8 text-center">
          <p className="text-muted-foreground">Aún no tienes bocetos.</p>
          <Button variant="link" onClick={() => setDialogOpen(true)}>
            Crea tu primer boceto
          </Button>
        </div>
      )}
    </div>
  );
}
