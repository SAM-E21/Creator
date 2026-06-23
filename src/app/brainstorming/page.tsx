
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
import { addBrainstormSession, getBrainstormSessions, deleteBrainstormSession } from '@/lib/data';
import type { BrainstormSession } from '@/types';
import { Loader2, PlusCircle, Lightbulb, Trash2 } from 'lucide-react';
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

export default function BrainstormingListPage() {
  const [sessions, setSessions] = useState<BrainstormSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      const unsubscribe = getBrainstormSessions(user.uid, (newSessions) => {
        setSessions(newSessions);
        setIsLoading(false);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const handleCreateSession = async () => {
    if (!user || !newSessionName.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'El tema de la sesión no puede estar vacío.' });
      return;
    }
    try {
      const newSessionId = await addBrainstormSession(user.uid, newSessionName.trim());
      setNewSessionName('');
      setDialogOpen(false);
      toast({ title: '¡Sesión Creada!', description: 'Tu nueva sesión de brainstorming ha sido creada.' });
      router.push(`/brainstorming/${newSessionId}`);
    } catch (error) {
      console.error('Error creating session:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear la sesión.' });
    }
  };
  
  const handleDelete = async (sessionId: string) => {
    try {
        await deleteBrainstormSession(sessionId);
        toast({ title: 'Sesión Eliminada' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la sesión.' });
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
            <Lightbulb className="w-8 h-8 text-primary"/>
            Sesiones de Lluvia de Ideas
          </h1>
          <p className="text-muted-foreground">
            Un área dedicada para generar y organizar ideas rápidamente.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nueva Sesión
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nueva Sesión de Lluvia de Ideas</DialogTitle>
              <DialogDescription>
                Dale un tema a tu nueva sesión para empezar.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Label htmlFor="session-name">Tema de la Sesión</Label>
              <Input
                id="session-name"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                placeholder="Ej. Funcionalidades de la App, Ideas para Podcast"
              />
            </div>
            <DialogFooter>
              <Button onClick={handleCreateSession} disabled={!newSessionName.trim()}>
                Crear y Abrir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sessions.map((session) => (
          <Card key={session.id} className="h-full flex flex-col justify-between transition-shadow hover:shadow-lg group">
            <Link href={`/brainstorming/${session.id}`} className='flex flex-col h-full'>
              <CardHeader>
                <CardTitle className="text-primary">{session.topic}</CardTitle>
                 <CardDescription>
                  {session.updatedAt ? `Última actualización: ${session.updatedAt.toLocaleDateString()}` : 'Aún no actualizada'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex items-center justify-center bg-muted/20 aspect-video">
                 <Lightbulb className="w-16 h-16 text-muted-foreground/30" />
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
                                Esta acción no se puede deshacer. Esto eliminará permanentemente esta sesión de lluvia de ideas y todas sus ideas.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(session.id!)}>
                                Eliminar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
          </Card>
        ))}
      </div>

      {sessions.length === 0 && !isLoading && (
        <div className="col-span-1 md:col-span-2 lg:col-span-4 mt-8 text-center">
          <p className="text-muted-foreground">Aún no tienes sesiones de lluvia de ideas.</p>
          <Button variant="link" onClick={() => setDialogOpen(true)}>
            Crea tu primera sesión
          </Button>
        </div>
      )}
    </div>
  );
}
