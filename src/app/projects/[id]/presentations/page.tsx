
'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import { addPresentation, getPresentationsByProjectId, deletePresentation } from '@/lib/data';
import type { Presentation } from '@/types';
import { Loader2, PlusCircle, Presentation as PresentationIcon, Trash2 } from 'lucide-react';
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
import { handleGeneratePresentation } from '@/app/actions';
import { Textarea } from '@/components/ui/textarea';

export default function ProjectPresentationsPage() {
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newPresentationName, setNewPresentationName] = useState('');
  const [newPresentationFocus, setNewPresentationFocus] = useState('');
  
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const projectId = params.id as string;

  useEffect(() => {
    if (user && projectId) {
      setIsLoading(true);
      const unsubscribePresentations = getPresentationsByProjectId(projectId, (newPresentations) => {
        setPresentations(newPresentations);
        setIsLoading(false);
      });
      return () => {
        unsubscribePresentations();
      };
    }
  }, [user, projectId]);

  const handleCreatePresentation = async () => {
    if (!user || !newPresentationName.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'El nombre de la presentación es obligatorio.' });
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // The prompt is now the focus, and we pass the projectId for context
      const result = await handleGeneratePresentation({ prompt: newPresentationFocus, projectId });
      if (!result.success || !result.data) {
        throw new Error(result.error || 'No se pudo generar la presentación.');
      }

      const newPresentationData = {
          name: newPresentationName.trim(),
          prompt: newPresentationFocus.trim(),
          slides: result.data.slides,
          projectId: projectId,
      };

      const newPresentationId = await addPresentation(user.uid, newPresentationData);
      
      setNewPresentationName('');
      setNewPresentationFocus('');
      setDialogOpen(false);
      
      toast({ title: '¡Presentación Creada!', description: 'Tu nueva presentación ha sido generada por IA usando el contexto de este proyecto.' });
      router.push(`/presentations/${newPresentationId}`);
    } catch (error) {
      console.error('Error creating presentation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
      toast({ variant: 'destructive', title: 'Error al Crear', description: errorMessage });
    } finally {
        setIsGenerating(false);
    }
  };
  
  const handleDelete = async (presentationId: string) => {
    try {
        await deletePresentation(presentationId);
        toast({ title: 'Presentación Eliminada' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la presentación.' });
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
            <div/>
            <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Nueva Presentación
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Crear Nueva Presentación con IA</DialogTitle>
                  <DialogDescription>
                    La IA usará el contexto de este proyecto para generar las diapositivas. Dale un nombre y un enfoque opcional.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="page-name">Nombre de la Presentación</Label>
                    <Input
                      id="page-name"
                      value={newPresentationName}
                      onChange={(e) => setNewPresentationName(e.target.value)}
                      placeholder="Ej. Resumen del Proyecto Q2"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="page-prompt">Enfoque de la Presentación (Opcional)</Label>
                    <Textarea
                      id="page-prompt"
                      value={newPresentationFocus}
                      onChange={(e) => setNewPresentationFocus(e.target.value)}
                      placeholder="Ej. Enfócate en los logros técnicos y próximos pasos..."
                      className="min-h-[100px]"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCreatePresentation} disabled={!newPresentationName.trim() || isGenerating}>
                    {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Generar y Abrir
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
        </div>


      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {presentations.map((p) => (
          <Card key={p.id} className="h-full flex flex-col justify-between transition-shadow hover:shadow-lg group">
            <Link href={`/presentations/${p.id}`} className="flex flex-col flex-grow">
              <CardHeader>
                <CardTitle className="text-primary">{p.name}</CardTitle>
                 <CardDescription>
                  Última act.: {p.updatedAt ? `${p.updatedAt.toLocaleDateString()}` : 'N/A'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex items-center justify-center bg-muted/20 aspect-video">
                 <PresentationIcon className="w-16 h-16 text-muted-foreground/30" />
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
                                Esta acción no se puede deshacer. Esto eliminará permanentemente esta presentación y todas sus diapositivas.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(p.id!)}>
                                Eliminar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
          </Card>
        ))}
      </div>

      {presentations.length === 0 && !isLoading && (
        <div className="col-span-full mt-8 text-center">
          <p className="text-muted-foreground">Este proyecto aún no tiene presentaciones.</p>
          <Button variant="link" onClick={() => setDialogOpen(true)}>
            Crea tu primera presentación
          </Button>
        </div>
      )}
    </div>
  );
}
