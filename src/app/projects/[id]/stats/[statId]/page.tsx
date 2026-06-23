
'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { getStatById, updateStat } from '@/lib/data';
import type { ProjectStat, StatDataPoint } from '@/types';
import { Loader2, ArrowLeft, Save, Plus, Trash2, BarChart, LineChart, PieChart as PieChartIcon, AreaChart as AreaChartIcon, Radar, ScatterChart as ScatterChartIcon, Filter, Binary, Orbit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ResponsiveContainer, BarChart as ReBarChart, Bar, LineChart as ReLineChart, Line, PieChart as RePieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar as ReRadar, ScatterChart, Scatter, ZAxis, FunnelChart, Funnel as ReFunnel, LabelList, Treemap as ReTreemap, RadialBarChart, RadialBar } from 'recharts';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function StatPage() {
  const [stat, setStat] = useState<ProjectStat | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [data, setData] = useState<StatDataPoint[]>([]);

  const params = useParams();
  const projectId = params.id as string;
  const statId = params.statId as string;
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user && projectId && statId) {
      setIsLoading(true);
      getStatById(projectId, statId).then(statData => {
        if (statData) {
          setStat(statData);
          setData(statData.data || []);
        }
        setIsLoading(false);
      }).catch(err => {
        console.error(err);
        toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la estadística." });
        setIsLoading(false);
      });
    }
  }, [user, projectId, statId, toast]);
  
  const calculateTotal = (currentData: StatDataPoint[]) => {
      return currentData.reduce((sum, point) => sum + point.value, 0);
  }

  const handleDataChange = (index: number, field: keyof StatDataPoint, value: string | number) => {
    const newData = [...data];
    const target = { ...newData[index] };

    if (field === 'value') {
        const numValue = Number(value);
        if (isNaN(numValue)) return;

        if (stat?.type === 'pie') {
            const otherValuesTotal = calculateTotal(newData) - target.value;
            if (otherValuesTotal + numValue > 100) {
                toast({
                    variant: 'destructive',
                    title: 'Error de Validación',
                    description: 'La suma de los valores de un gráfico de tarta no puede superar 100.',
                });
                return;
            }
        }
        target.value = numValue;

    } else {
        (target[field as 'label' | 'color'] as any) = String(value);
    }
    
    newData[index] = target;
    setData(newData);
  };

  const addDataRow = () => {
    if (stat?.type === 'pie' && calculateTotal(data) >= 100) {
        toast({
            variant: 'destructive',
            title: 'Error de Validación',
            description: 'No se pueden añadir más valores. El total para el gráfico de tarta ya es 100 o más.',
        });
        return;
    }
    setData([...data, { label: `Dato ${data.length + 1}`, value: 0, color: '#8884d8' }]);
  };

  const removeDataRow = (index: number) => {
    const newData = data.filter((_, i) => i !== index);
    setData(newData);
  };

  const handleSaveChanges = async () => {
    if (!stat) return;

    if (stat.type === 'pie' && calculateTotal(data) > 100) {
        toast({
            variant: 'destructive',
            title: 'Error al Guardar',
            description: 'No se puede guardar. La suma de los valores del gráfico de tarta excede 100.',
        });
        return;
    }

    setIsSaving(true);
    try {
        await updateStat(projectId, statId, { data });
        toast({ title: "¡Guardado!", description: "Los datos de la estadística han sido actualizados." });
    } catch (error) {
        console.error(error);
        toast({ variant: "destructive", title: "Error", description: "No se pudieron guardar los cambios." });
    } finally {
        setIsSaving(false);
    }
  };
  
  const primaryColor = 'hsl(var(--primary))';

  const renderChart = () => {
    if (!stat) return <div className="text-center text-muted-foreground">No hay datos para mostrar</div>;
    const chartData = data.map(d => ({ name: d.label, value: d.value, color: d.color, fill: d.color }));

    switch (stat.type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ReBarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value">
                 {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || primaryColor} />
                  ))}
              </Bar>
            </ReBarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ReLineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke={chartData[0]?.color || primaryColor} activeDot={{ r: 8 }} />
            </ReLineChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RePieChart>
              <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={150} label>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || primaryColor} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `${value}%`}/>
              <Legend />
            </RePieChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="value" stroke={chartData[0]?.color || primaryColor} fill={chartData[0]?.color || primaryColor} fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="name" />
                <PolarRadiusAxis />
                <Tooltip />
                <Legend />
                <ReRadar name={stat.name} dataKey="value" stroke={chartData[0]?.color || primaryColor} fill={chartData[0]?.color || primaryColor} fillOpacity={0.6} />
            </RadarChart>
          </ResponsiveContainer>
        );
       case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart>
              <CartesianGrid />
              <XAxis type="category" dataKey="name" name="label" />
              <YAxis type="number" dataKey="value" name="value" />
              <ZAxis type="number" range={[100, 101]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Legend />
              <Scatter name={stat.name} data={chartData} fill={primaryColor}>
                 {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || primaryColor} />
                  ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        );
      case 'funnel':
        return (
            <ResponsiveContainer width="100%" height={400}>
                <FunnelChart>
                    <Tooltip />
                    <Legend />
                    <ReFunnel dataKey="value" data={chartData} isAnimationActive>
                         {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color || primaryColor} />
                        ))}
                        <LabelList position="right" fill="#fff" stroke="none" dataKey="name" />
                    </ReFunnel>
                </FunnelChart>
            </ResponsiveContainer>
        );
       case 'treemap':
        return (
            <ResponsiveContainer width="100%" height={400}>
                <ReTreemap
                    data={chartData}
                    dataKey="value"
                    ratio={4 / 3}
                    stroke="#fff"
                    fill={primaryColor}
                >
                    <Tooltip />
                    <Legend />
                </ReTreemap>
            </ResponsiveContainer>
        );
      case 'radialBar':
        return (
            <ResponsiveContainer width="100%" height={400}>
                <RadialBarChart 
                    innerRadius="20%" 
                    outerRadius="80%" 
                    data={chartData} 
                    startAngle={180} 
                    endAngle={0}
                >
                    <RadialBar
                        minAngle={15}
                        label={{ position: 'insideStart', fill: '#fff' }}
                        background
                        dataKey='value'
                    />
                    <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" />
                    <Tooltip />
                </RadialBarChart>
            </ResponsiveContainer>
        );
      default:
        return <div className="text-center text-muted-foreground">Tipo de gráfico no soportado</div>;
    }
  };
  
  const ChartIcon = ({type}: {type: ProjectStat['type']}) => {
    switch (type) {
        case 'bar': return <BarChart className="w-8 h-8 text-primary"/>;
        case 'line': return <LineChart className="w-8 h-8 text-primary"/>;
        case 'pie': return <PieChartIcon className="w-8 h-8 text-primary"/>;
        case 'area': return <AreaChartIcon className="w-8 h-8 text-primary"/>;
        case 'radar': return <Radar className="w-8 h-8 text-primary"/>;
        case 'scatter': return <ScatterChartIcon className="w-8 h-8 text-primary"/>;
        case 'funnel': return <Filter className="w-8 h-8 text-primary"/>;
        case 'treemap': return <Binary className="w-8 h-8 text-primary"/>;
        case 'radialBar': return <Orbit className="w-8 h-8 text-primary"/>;
        default: return null;
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
    <div className="flex flex-col gap-6">
        <div>
          <Button asChild variant="ghost" className="mb-2 -ml-4">
            <Link href={`/projects/${projectId}/stats`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a todas las estadísticas
            </Link>
          </Button>
          <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                   {stat?.type && <ChartIcon type={stat.type} />}
                    {stat?.name || 'Estadística'}
                </h1>
                <p className="text-muted-foreground">
                    {stat?.description || 'Visualiza y edita los datos de tu estadística.'}
                </p>
            </div>
        </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="lg:col-span-1">
            <Card>
                <CardHeader>
                    <CardTitle>Visualización del Gráfico</CardTitle>
                </CardHeader>
                <CardContent>
                    {renderChart()}
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Editor de Datos</CardTitle>
              <CardDescription>Modifica las etiquetas y valores aquí.</CardDescription>
            </CardHeader>
            <CardContent className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Etiqueta</TableHead>
                    <TableHead>Valor{stat?.type === 'pie' && ' (%)'}</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="pr-1">
                        <Input
                          type="text"
                          value={row.label}
                          onChange={(e) => handleDataChange(index, 'label', e.target.value)}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell className="px-1">
                        <Input
                          type="number"
                          value={row.value}
                          onChange={(e) => handleDataChange(index, 'value', e.target.value)}
                          className="h-8"
                        />
                      </TableCell>
                       <TableCell className="px-1">
                        <Input
                          type="color"
                          value={row.color}
                          onChange={(e) => handleDataChange(index, 'color', e.target.value)}
                          className="h-8 w-12 p-1"
                        />
                      </TableCell>
                       <TableCell className="pl-1">
                        <Button variant="ghost" size="icon" onClick={() => removeDataRow(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <div className="p-6 pt-2 flex flex-col gap-2">
                 <Button variant="outline" onClick={addDataRow} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Añadir Fila
                </Button>
                <Button onClick={handleSaveChanges} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Guardar Cambios
                </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
