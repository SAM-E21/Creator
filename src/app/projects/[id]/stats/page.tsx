
'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from '@/hooks/use-toast';
import { addStat, getStats, deleteStat } from '@/lib/data';
import type { ProjectStat } from '@/types';
import { Loader2, PlusCircle, BarChart, LineChart, PieChart, Trash2, TrendingUp, AreaChart, Radar, ScatterChart, Filter, Binary, Orbit, Lock, ExternalLink } from 'lucide-react';
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

type NewStatData = Omit<ProjectStat, 'id' | 'projectId' | 'data' | 'createdAt' | 'updatedAt'>;

const chartTypes: { value: ProjectStat['type']; label: string; icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
    { value: 'bar', label: 'Gráfico de Barras', icon: BarChart },
    { value: 'line', label: 'Gráfico de Líneas', icon: LineChart },
    { value: 'pie', label: 'Gráfico de Tarta', icon: PieChart },
    { value: 'area', label: 'Gráfico de Área', icon: AreaChart },
    { value: 'radar', label: 'Gráfico de Radar', icon: Radar },
    { value: 'scatter', label: 'Gráfico de Dispersión', icon: ScatterChart },
    { value: 'funnel', label: 'Gráfico de Embudo', icon: Filter },
    { value: 'treemap', label: 'Mapa de Árbol', icon: Binary },
    { value: 'radialBar', label: 'Gráfico Radial', icon: Orbit },
];


export default function ProjectStatsPage() {
  const [stats, setStats] = useState<ProjectStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [newStatData, setNewStatData] = useState<NewStatData>({ name: '', description: '', type: 'bar' });
  
  const { user, userProfile } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const projectId = params.id as string;
  
  const isPro = userProfile?.plan === 'Pro';

  useEffect(() => {
    if (user && projectId) {
      setIsLoading(true);
      const unsubscribe = getStats(projectId, (newStats) => {
        setStats(newStats);
        setIsLoading(false);
      });
      return () => unsubscribe();
    }
  }, [projectId, user]);

  const handleCreateStat = async () => {
    if (!user || !newStatData.name.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'El nombre del gráfico no puede estar vacío.' });
      return;
    }
    try {
      const newStatId = await addStat(projectId, { ...newStatData, data: [] });
      setNewStatData({ name: '', description: '', type: 'bar' });
      setDialogOpen(false);
      toast({ title: '¡Gráfico Creado!', description: 'Tu nuevo gráfico ha sido creado.' });
      router.push(`/projects/${projectId}/stats/${newStatId}`);
    } catch (error) {
      console.error('Error creando estadística:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear el gráfico.' });
    }
  };
  
  const handleDelete = async (statId: string) => {
    try {
        await deleteStat(projectId, statId);
        toast({ title: 'Gráfico Eliminado' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el gráfico.' });
    }
  }
  
  const ChartIcon = ({type}: {type: ProjectStat['type']}) => {
    const chart = chartTypes.find(t => t.value === type);
    if (!chart) return null;
    const Icon = chart.icon;
    return <Icon className="w-16 h-16 text-muted-foreground/30" />;
  }
  
  const PreviewIcon = ({type}: {type: ProjectStat['type']}) => {
    const chart = chartTypes.find(t => t.value === type);
    if (!chart) return <BarChart className="w-24 h-24 text-muted-foreground/50" />;
    const Icon = chart.icon;
    return <Icon className="w-24 h-24 text-muted-foreground/50" />;
  }

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isPro) {
    return (
        <Card className="text-center">
            <CardHeader>
                <div className="mx-auto bg-primary/10 text-primary rounded-full p-3 w-fit">
                    <Lock className="w-8 h-8" />
                </div>
                <CardTitle className="mt-4">Función Pro: Estadísticas y Gráficos</CardTitle>
                <CardDescription>
                    Visualiza los datos de tu proyecto con gráficos personalizados para un análisis más profundo.
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
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-primary"/>
            Estadísticas del Proyecto
          </h1>
          <p className="text-muted-foreground">
            Crea y visualiza gráficos para analizar los datos de tu proyecto.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Gráfico
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Gráfico</DialogTitle>
              <DialogDescription>
                Dale un nombre y elige un tipo para tu nueva visualización de datos.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="stat-name">Nombre del Gráfico</Label>
                    <Input
                        id="stat-name"
                        value={newStatData.name}
                        onChange={(e) => setNewStatData({...newStatData, name: e.target.value})}
                        placeholder="Ej. Ventas Mensuales"
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="stat-desc">Descripción (Opcional)</Label>
                    <Textarea
                        id="stat-desc"
                        value={newStatData.description}
                        onChange={(e) => setNewStatData({...newStatData, description: e.target.value})}
                        placeholder="Una breve descripción de lo que representa este gráfico."
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="stat-type">Tipo de Gráfico</Label>
                     <Select
                        value={newStatData.type}
                        onValueChange={(value: ProjectStat['type']) => setNewStatData({...newStatData, type: value})}
                     >
                        <SelectTrigger id="stat-type">
                            <SelectValue placeholder="Selecciona un tipo" />
                        </SelectTrigger>
                        <SelectContent>
                           {chartTypes.map(type => (
                             <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                           ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="mt-2 grid gap-2">
                    <Label>Vista Previa</Label>
                    <div className="rounded-lg border bg-muted p-4 flex justify-center items-center h-48">
                       <PreviewIcon type={newStatData.type} />
                    </div>
                </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateStat} disabled={!newStatData.name.trim()}>
                Crear y Abrir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.id} className="h-full flex flex-col justify-between transition-shadow hover:shadow-lg group">
            <Link href={`/projects/${projectId}/stats/${stat.id}`} className='flex flex-col h-full'>
              <CardHeader>
                <CardTitle className="text-primary">{stat.name}</CardTitle>
                 <CardDescription className="line-clamp-2">
                  {stat.description || `Gráfico de tipo '${stat.type}'`}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex items-center justify-center bg-muted/20 aspect-video">
                 <ChartIcon type={stat.type} />
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
                                Esta acción no se puede deshacer. Esto eliminará permanentemente este gráfico y todos sus datos.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(stat.id!)}>
                                Eliminar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
          </Card>
        ))}
      </div>

      {stats.length === 0 && !isLoading && (
        <div className="col-span-full mt-8 text-center">
          <p className="text-muted-foreground">Aún no tienes gráficos en este proyecto.</p>
          <Button variant="link" onClick={() => setDialogOpen(true)}>
            Crea tu primer gráfico
          </Button>
        </div>
      )}
    </div>
  );
}
