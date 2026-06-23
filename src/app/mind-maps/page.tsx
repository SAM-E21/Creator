
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
import { addMindMap, getMindMaps, deleteMindMap } from '@/lib/data';
import type { MindMap } from '@/types';
import { Loader2, PlusCircle, BrainCircuit, Trash2 } from 'lucide-react';
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
} from "@/components/ui/alert-dialog"

export default function MindMapsPage() {
  const [mindMaps, setMindMaps] = useState<MindMap[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [newMindMapName, setNewMindMapName] = useState('');
  
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      const unsubscribe = getMindMaps(user.uid, (newMindMaps) => {
        setMindMaps(newMindMaps);
        setIsLoading(false);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const handleCreateMindMap = async () => {
    if (!user || !newMindMapName.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'El nombre del mapa mental no puede estar vacío.' });
      return;
    }
    try {
      const newMindMapId = await addMindMap(user.uid, newMindMapName.trim());
      setNewMindMapName('');
      setDialogOpen(false);
      toast({ title: '¡Mapa Mental Creado!', description: 'Tu nuevo mapa mental ha sido creado.' });
      router.push(`/mind-maps/${newMindMapId}`);
    } catch (error) {
      console.error('Error creating mind map:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear el mapa mental.' });
    }
  };

  const handleDelete = async (mindMapId: string) => {
    try {
        await deleteMindMap(mindMapId);
        toast({ title: 'Mapa Mental Eliminado' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el mapa mental.' });
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
            <BrainCircuit className="w-8 h-8 text-primary"/>
            Mapas Mentales
          </h1>
          <p className="text-muted-foreground">
            Conecta tus ideas visualmente y explora nuevas conexiones.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Mapa Mental
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Mapa Mental</DialogTitle>
              <DialogDescription>
                Dale un nombre a tu nuevo mapa mental para empezar.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Label htmlFor="mindmap-name">Nombre del Mapa Mental</Label>
              <Input
                id="mindmap-name"
                value={newMindMapName}
                onChange={(e) => setNewMindMapName(e.target.value)}
                placeholder="Ej. Estrategia de Marketing Q3"
              />
            </div>
            <DialogFooter>
              <Button onClick={handleCreateMindMap} disabled={!newMindMapName.trim()}>
                Crear y Abrir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {mindMaps.map((mindMap) => (
          <Card key={mindMap.id} className="h-full flex flex-col justify-between transition-shadow hover:shadow-lg group">
            <Link href={`/mind-maps/${mindMap.id}`} className="flex flex-col flex-grow">
              <CardHeader>
                <CardTitle className="text-primary">{mindMap.name}</CardTitle>
                 <CardDescription>
                  {mindMap.updatedAt ? `Última actualización: ${mindMap.updatedAt.toLocaleDateString()}` : 'Aún no actualizado'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex items-center justify-center bg-muted/20 aspect-video">
                 <BrainCircuit className="w-16 h-16 text-muted-foreground/30" />
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
                                Esta acción no se puede deshacer. Esto eliminará permanentemente este mapa mental.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(mindMap.id!)}>
                                Eliminar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
          </Card>
        ))}
      </div>

      {mindMaps.length === 0 && !isLoading && (
        <div className="col-span-1 md:col-span-2 lg:col-span-4 mt-8 text-center">
          <p className="text-muted-foreground">Aún no tienes mapas mentales.</p>
          <Button variant="link" onClick={() => setDialogOpen(true)}>
            Crea tu primer mapa mental
          </Button>
        </div>
      )}
    </div>
  );
}
