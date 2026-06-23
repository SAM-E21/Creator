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
import { addTable, getTables, deleteTable } from '@/lib/data';
import type { ProjectTable, TableType } from '@/types';
import { Loader2, PlusCircle, Table as TableIcon, Trash2, Rows, Columns, ArrowRightLeft, Star, ThumbsUp, ListChecks, DollarSign, Target, ClipboardList, Clock, AlertTriangle } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type NewTableData = Omit<ProjectTable, 'id' | 'projectId' | 'createdAt' | 'updatedAt' | 'data'>;

const arrayToObject = (data: string[][]): { [key: number]: string[] } => {
    const obj: { [key: number]: string[] } = {};
    data.forEach((row, index) => {
        obj[index] = row;
    });
    return obj;
};

const tableTemplates: Record<TableType, { label: string, icon: React.FC<any>, description: string, data: string[][] }> = {
    'comparison': {
        label: "Tabla Comparativa",
        icon: ArrowRightLeft,
        description: "Compara características entre varios elementos.",
        data: [
            ["Característica", "Opción A", "Opción B"],
            ["Precio", "$100", "$150"],
            ["Calidad", "Media", "Alta"],
            ["Soporte", "24/7", "Lunes-Viernes"],
        ]
    },
    'contingency': {
        label: "Tabla de Contingencia",
        icon: AlertTriangle,
        description: "Planifica acciones para riesgos o escenarios.",
        data: [
            ["Riesgo", "Probabilidad", "Impacto", "Plan de Acción"],
            ["Fallo Servidor", "Baja", "Crítico", "Activar Mirror"],
            ["Retraso Pago", "Media", "Medio", "Llamar cliente"],
        ]
    },
    'schedule': {
        label: "Horario / Cronograma",
        icon: Clock,
        description: "Organiza tareas o eventos en el tiempo.",
        data: [
            ["Hora", "Lunes", "Martes", "Miércoles"],
            ["09:00", "Reunión", "Desarrollo", "Testing"],
            ["11:00", "Email", "Desarrollo", "Review"],
        ]
    },
    'pros-cons': {
        label: "Pros y Contras",
        icon: ThumbsUp,
        description: "Evalúa ventajas y desventajas.",
        data: [
            ["Argumento", "Puntaje", "Tipo"],
            ["Rapidez", "+5", "Pro"],
            ["Costo Alto", "-3", "Contra"],
        ]
    },
    'budget': {
        label: "Presupuesto",
        icon: DollarSign,
        description: "Gestión de costos y gastos.",
        data: [
            ["Item", "Cant.", "Precio Unit.", "Total"],
            ["Hosting", "1", "$20", "$20"],
            ["Licencias", "3", "$50", "$150"],
        ]
    },
    'swot': {
        label: "Matriz DAFO",
        icon: Target,
        description: "Análisis estratégico de la situación.",
        data: [
            ["Interno", "Externo"],
            ["Fortaleza: Equipo", "Oportunidad: Mercado"],
            ["Debilidad: UX", "Amenaza: Competencia"],
        ]
    },
    'action-plan': {
        label: "Plan de Acción",
        icon: ClipboardList,
        description: "Pasos específicos para objetivos.",
        data: [
            ["Acción", "Dificultad", "Estado", "Deadline"],
            ["Investigar", "Baja", "Done", "20/12"],
            ["Diseñar", "Media", "Todo", "30/12"],
        ]
    },
    'custom': {
        label: "Personalizada",
        icon: Star,
        description: "Tabla en blanco totalmente libre.",
        data: [
            ["Columna 1", "Columna 2"],
            ["", ""],
        ]
    },
};

export default function ProjectTablesPage() {
  const [tables, setTables] = useState<ProjectTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [newTableData, setNewTableData] = useState<NewTableData>({ name: '', description: '', type: 'comparison' });
  
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const projectId = params.id as string;

  useEffect(() => {
    if (user && projectId) {
      setIsLoading(true);
      const unsubscribeTables = getTables(projectId, (newTables) => {
        setTables(newTables);
        setIsLoading(false);
      }, (err) => {
        console.error(err);
        setIsLoading(false);
      });
      return () => unsubscribeTables();
    }
  }, [user, projectId]);

  const handleCreateTable = async () => {
    if (!user || !newTableData.name.trim()) return;
    
    try {
      const template = tableTemplates[newTableData.type];
      const tableDataWithTemplate = {
          ...newTableData,
          data: arrayToObject(template.data),
          columnWidths: Array(template.data[0].length).fill(180),
      };

      const newTableId = await addTable(projectId, tableDataWithTemplate);
      setNewTableData({ name: '', description: '', type: 'comparison' });
      setDialogOpen(false);
      toast({ title: '¡Tabla Creada!' });
      router.push(`/projects/${projectId}/tables/${newTableId}`);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al crear tabla' });
    }
  };
  
  const handleDelete = async (tableId: string) => {
    try {
        await deleteTable(projectId, tableId);
        toast({ title: 'Tabla Eliminada' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error al eliminar' });
    }
  }

  const TableTypeIcon = ({type}: {type: ProjectTable['type']}) => {
    const table = tableTemplates[type];
    if (!table) return <TableIcon className="w-12 h-12 text-muted-foreground/30" />;
    const Icon = table.icon;
    return <Icon className="w-12 h-12 text-muted-foreground/30" />;
  }

  if (isLoading) return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
             <h1 className="text-3xl font-bold tracking-tight">Tablas</h1>
             <p className="text-muted-foreground">Organiza tus datos con plantillas profesionales.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nueva Tabla
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Crear Nueva Tabla</DialogTitle>
                <DialogDescription>Elige un tipo de tabla para comenzar.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                      <Label htmlFor="table-name">Nombre</Label>
                      <Input
                          id="table-name"
                          value={newTableData.name}
                          onChange={(e) => setNewTableData({...newTableData, name: e.target.value})}
                          placeholder="Ej. Análisis de Costos"
                      />
                  </div>
                  <div className="grid gap-2">
                      <Label htmlFor="table-type">Tipo de Plantilla</Label>
                       <Select
                          value={newTableData.type}
                          onValueChange={(value: TableType) => setNewTableData({...newTableData, type: value})}
                       >
                          <SelectTrigger>
                              <SelectValue placeholder="Selecciona un tipo" />
                          </SelectTrigger>
                          <SelectContent>
                             {Object.entries(tableTemplates).map(([key, {label}]) => (
                               <SelectItem key={key} value={key}>{label}</SelectItem>
                             ))}
                          </SelectContent>
                      </Select>
                  </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateTable} disabled={!newTableData.name.trim()}>
                  Crear Tabla
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {tables.map((table) => (
          <Card key={table.id} className="h-full flex flex-col justify-between transition-shadow hover:shadow-lg group">
            <Link href={`/projects/${projectId}/tables/${table.id}`} className="flex flex-col flex-grow">
              <CardHeader>
                <CardTitle className="text-primary truncate">{table.name}</CardTitle>
                 <CardDescription className="line-clamp-2">
                  {tableTemplates[table.type]?.label || "Tabla"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex items-center justify-center bg-muted/20 aspect-video">
                 <TableTypeIcon type={table.type} />
              </CardContent>
            </Link>
             <div className="p-2 border-t opacity-0 group-hover:opacity-100 transition-opacity">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full text-destructive hover:bg-destructive/10">
                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Borrar tabla?</AlertDialogTitle>
                            <AlertDialogDescription>Esta acción es permanente.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>No</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(table.id!)}>Sí, borrar</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
          </Card>
        ))}
      </div>

      {tables.length === 0 && (
        <div className="col-span-full mt-12 text-center">
          <TableIcon className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Aún no hay tablas en este proyecto.</p>
          <Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}>
            Crea tu primera tabla
          </Button>
        </div>
      )}
    </div>
  );
}