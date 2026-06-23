
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
import { addWebGeniusPage, getWebGeniusPages, deleteWebGeniusPage, getProjects } from '@/lib/data';
import type { WebGeniusPage, Project } from '@/types';
import { Loader2, PlusCircle, Sparkles, Trash2, Code } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function WebGeniusListPage() {
  const [pages, setPages] = useState<WebGeniusPage[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      const unsubscribePages = getWebGeniusPages(user.uid, (newPages) => {
        setPages(newPages);
        setIsLoading(false);
      });
      const unsubscribeProjects = getProjects(user.uid, (newProjects) => {
        setProjects(newProjects);
      });
      return () => {
        unsubscribePages();
        unsubscribeProjects();
      };
    }
  }, [user]);

  const handleCreatePage = async () => {
    if (!user || !newPageName.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'El nombre de la página no puede estar vacío.' });
      return;
    }
    try {
      const newPageData = {
          name: newPageName.trim(),
          prompt: `Una página en blanco llamada ${newPageName.trim()}`,
          html: `<h1>${newPageName.trim()}</h1>`,
          css: 'body { font-family: sans-serif; }',
          javascript: '',
          projectId: selectedProjectId,
      }
      const newPageId = await addWebGeniusPage(user.uid, newPageData);
      setNewPageName('');
      setSelectedProjectId(undefined);
      setDialogOpen(false);
      toast({ title: '¡Página Creada!', description: 'Tu nueva página ha sido creada.' });
      router.push(`/web-genius/${newPageId}`);
    } catch (error) {
      console.error('Error creating page:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear la página.' });
    }
  };
  
  const handleDelete = async (pageId: string) => {
    try {
        await deleteWebGeniusPage(pageId);
        toast({ title: 'Página Eliminada' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la página.' });
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
            <Sparkles className="w-8 h-8 text-primary"/>
            PelixFlow
          </h1>
          <p className="text-muted-foreground">
            Crea y mejora páginas web completas a partir de descripciones con IA.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nueva Página PelixFlow
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nueva Página en PelixFlow</DialogTitle>
              <DialogDescription>
                Dale un nombre a tu nueva página y, opcionalmente, asígnala a un proyecto.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="page-name">Nombre de la Página</Label>
                <Input
                  id="page-name"
                  value={newPageName}
                  onChange={(e) => setNewPageName(e.target.value)}
                  placeholder="Ej. Landing Page, Portafolio"
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
              <Button onClick={handleCreatePage} disabled={!newPageName.trim()}>
                Crear y Abrir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {pages.map((page) => (
          <Card key={page.id} className="h-full flex flex-col justify-between transition-shadow hover:shadow-lg group">
            <Link href={`/web-genius/${page.id}`} className="flex flex-col flex-grow">
              <CardHeader>
                <CardTitle className="text-primary">{page.name}</CardTitle>
                 <CardDescription>
                  Última act.: {page.updatedAt ? `${page.updatedAt.toLocaleDateString()}` : 'N/A'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex items-center justify-center bg-muted/20 aspect-video">
                 <Code className="w-16 h-16 text-muted-foreground/30" />
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
                                Esta acción no se puede deshacer. Esto eliminará permanentemente esta página web de PelixFlow.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(page.id!)}>
                                Eliminar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
          </Card>
        ))}
      </div>

      {pages.length === 0 && !isLoading && (
        <div className="col-span-full mt-8 text-center">
          <p className="text-muted-foreground">Aún no has creado ninguna página en PelixFlow.</p>
          <Button variant="link" onClick={() => setDialogOpen(true)}>
            Crea tu primera página con PelixFlow
          </Button>
        </div>
      )}
    </div>
  );
}
