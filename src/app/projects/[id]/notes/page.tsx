
'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { getProjectNotes, saveProjectNotes } from '@/lib/data';


export default function ProjectNotesPage() {
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const params = useParams();
  const projectId = params.id as string;

  useEffect(() => {
      if (user) {
          setIsLoading(true);
          getProjectNotes(projectId).then(content => {
              setNotes(content);
          }).catch(err => {
              console.error(err);
              toast({ variant: 'destructive', title: "Error", description: "No se pudieron cargar las notas."});
          }).finally(() => {
              setIsLoading(false);
          });
      }
  }, [projectId, user, toast]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
        await saveProjectNotes(projectId, notes);
        toast({
            title: '¡Notas Guardadas!',
            description: 'Tus notas del proyecto han sido guardadas exitosamente.',
        });
    } catch (error) {
        toast({ variant: 'destructive', title: "Error", description: "No se pudieron guardar las notas." });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Notas y Registros del Proyecto</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Textarea
                placeholder="Empieza a escribir las notas, ideas y registros de tu proyecto aquí..."
                className="min-h-[400px] text-base"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
            />
          )}
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar Notas
        </Button>
      </div>
    </div>
  );
}
