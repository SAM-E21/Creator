
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { getLogEntry, setLogEntry } from '@/lib/data';
import { format, parseISO } from 'date-fns';
import { Loader2, Save } from 'lucide-react';

export default function ProjectLogbookPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [entry, setEntry] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const params = useParams();
  const projectId = params.id as string;

  useEffect(() => {
    if (date && user) {
      setIsLoading(true);
      const dateString = format(date, 'yyyy-MM-dd');
      getLogEntry(projectId, dateString)
        .then(logEntry => {
          setEntry(logEntry?.content || '');
        })
        .catch(error => {
          console.error("Error fetching log entry:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'No se pudo obtener la entrada de la bitácora.' });
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [date, projectId, user, toast]);

  const handleSave = async () => {
    if (!date || !user) {
        toast({ variant: 'destructive', title: 'Error', description: 'Debes iniciar sesión y seleccionar una fecha.' });
        return;
    }
    setIsSaving(true);
    try {
        const dateString = format(date, 'yyyy-MM-dd');
        await setLogEntry(projectId, { date: dateString, content: entry });
        toast({
            title: 'Bitácora Guardada',
            description: `Tu entrada para ${format(date, 'PPP')} ha sido guardada.`,
        });
    } catch (error) {
        console.error("Error saving log:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la entrada de la bitácora.' });
    } finally {
        setIsSaving(false);
    }
  };
  
  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-1">
        <Card>
            <CardHeader>
                <CardTitle>Selecciona una Fecha</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    className="w-full"
                    disabled={(d) => d > new Date()}
                />
            </CardContent>
        </Card>
      </div>
      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>
              Entrada de la Bitácora para {date ? format(date, 'PPP') : '...'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <div className="flex justify-center items-center min-h-[400px]">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : (
                <Textarea
                    placeholder="Escribe aquí tus notas para el día seleccionado..."
                    className="min-h-[400px] text-base"
                    value={entry}
                    onChange={(e) => setEntry(e.target.value)}
                />
            )}
          </CardContent>
        </Card>
        <div className="flex justify-end mt-4">
            <Button onClick={handleSave} disabled={isSaving || isLoading}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar Entrada
            </Button>
      </div>
      </div>
    </div>
  );
}
