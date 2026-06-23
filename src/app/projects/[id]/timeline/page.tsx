
'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { CheckCircle, Clock, GanttChartSquare, Plus, Loader2, Pencil, Trash2, Lock, ExternalLink } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { addTimelineEvent, getTimelineEvents, updateTimelineEvent, deleteTimelineEvent } from '@/lib/data';
import type { TimelineEvent } from '@/types';
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
import Link from 'next/link';

type EventFormData = Omit<TimelineEvent, 'id'>;

export default function ProjectTimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const defaultEventState: EventFormData = { title: '', description: '', date: '', type: 'task' };
  const [eventData, setEventData] = useState<EventFormData>(defaultEventState);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const params = useParams();
  const projectId = params.id as string;
  
  const isPro = userProfile?.plan === 'Pro';

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      const unsubscribe = getTimelineEvents(projectId, (newEvents) => {
        setEvents(newEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        setIsLoading(false);
      });
      return () => unsubscribe();
    }
  }, [projectId, user]);

  const openAddDialog = () => {
    setEditingEventId(null);
    setEventData(defaultEventState);
    setDialogOpen(true);
  }

  const openEditDialog = (event: TimelineEvent) => {
    setEditingEventId(event.id!);
    setEventData({
        title: event.title,
        description: event.description,
        date: event.date,
        type: event.type,
    });
    setDialogOpen(true);
  }

  const handleSaveEvent = async () => {
    if (!user || !eventData.title || !eventData.date) {
        toast({ variant: 'destructive', title: 'Error', description: 'El título y la fecha son obligatorios.' });
        return;
    }
    setIsSaving(true);
    try {
        if (editingEventId) {
            await updateTimelineEvent(projectId, editingEventId, eventData);
            toast({ title: 'Evento Actualizado', description: 'El evento ha sido actualizado.' });
        } else {
            await addTimelineEvent(projectId, eventData);
            toast({ title: 'Evento Añadido', description: 'El nuevo evento ha sido añadido a la línea de tiempo.' });
        }
        setDialogOpen(false);
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el evento.' });
    } finally {
        setIsSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
        await deleteTimelineEvent(projectId, eventId);
        toast({ title: 'Evento Eliminado', description: 'El evento ha sido eliminado de la línea de tiempo.' });
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el evento.' });
    }
  }

  if (!isPro && !isLoading) {
    return (
        <Card className="text-center">
            <CardHeader>
                <div className="mx-auto bg-primary/10 text-primary rounded-full p-3 w-fit">
                    <Lock className="w-8 h-8" />
                </div>
                <CardTitle className="mt-4">Función Pro: Línea de Tiempo</CardTitle>
                <CardDescription>
                    La línea de tiempo es una herramienta avanzada para visualizar los hitos y eventos clave de tu proyecto.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground mb-4">Actualiza al plan Pro para desbloquear esta y otras funciones de IA.</p>
                <Button asChild>
                    <Link href="/pricing">
                        Ver Planes <ExternalLink className="ml-2 h-4 w-4"/>
                    </Link>
                </Button>
            </CardContent>
        </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <GanttChartSquare className="w-6 h-6" />
            Línea de Tiempo del Proyecto
          </CardTitle>
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Añadir Evento
          </Button>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                 <div className="flex justify-center items-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 </div>
            ) : (
                <div className="relative border-l-2 border-primary/20 pl-6">
                    {events.map((event) => (
                    <div key={event.id} className="mb-8 flex items-start group">
                        <div className="absolute -left-3.5 mt-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        {event.type === 'milestone' ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 pl-4">
                            <p className="text-sm font-semibold text-primary">{new Date(event.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}</p>
                            <h3 className="font-bold text-lg">{event.title}</h3>
                            <p className="text-muted-foreground">{event.description}</p>
                        </div>
                        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(event)}>
                                <Pencil className="h-4 w-4" />
                            </Button>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta acción no se puede deshacer. Esto eliminará permanentemente este evento de la línea de tiempo.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteEvent(event.id!)}>Eliminar</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                    ))}
                    {events.length === 0 && (
                        <div className="text-center text-muted-foreground py-8">
                            <p>Aún no hay eventos en la línea de tiempo.</p>
                            <p>Añade tu primer evento para construir la línea de tiempo del proyecto.</p>
                        </div>
                    )}
                </div>
            )}
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
            <DialogHeader>
            <DialogTitle>{editingEventId ? 'Editar Evento' : 'Añadir Nuevo Evento a la Línea de Tiempo'}</DialogTitle>
            <DialogDescription>Completa los detalles para el evento de la línea de tiempo.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
            <div className="grid gap-2">
                <Label htmlFor="title">Título</Label>
                <Input id="title" value={eventData.title} onChange={e => setEventData({...eventData, title: e.target.value})} placeholder="Ej. Sprint de Desarrollo 1"/>
            </div>
                <div className="grid gap-2">
                <Label htmlFor="date">Fecha</Label>
                <Input id="date" type="date" value={eventData.date} onChange={e => setEventData({...eventData, date: e.target.value})}/>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea id="description" value={eventData.description} onChange={e => setEventData({...eventData, description: e.target.value})} placeholder="Una breve descripción del evento."/>
            </div>
                <div className="grid gap-2">
                <Label>Tipo</Label>
                <div className="flex gap-4">
                    <Button variant={eventData.type === 'task' ? 'secondary' : 'outline'} onClick={() => setEventData({...eventData, type: 'task'})}>Tarea</Button>
                    <Button variant={eventData.type === 'milestone' ? 'secondary' : 'outline'} onClick={() => setEventData({...eventData, type: 'milestone'})}>Hito</Button>
                </div>
            </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <Button onClick={handleSaveEvent} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Guardar Evento
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
