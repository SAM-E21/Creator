'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Lightbulb, Plus, X, ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { addBrainstormIdea, getBrainstormIdeas, deleteBrainstormIdea, getBrainstormSessionById } from '@/lib/data';
import type { BrainstormIdea, BrainstormSession } from '@/types';


const colors = [
  'bg-yellow-200/50 border-yellow-400',
  'bg-blue-200/50 border-blue-400',
  'bg-green-200/50 border-green-400',
  'bg-pink-200/50 border-pink-400',
  'bg-purple-200/50 border-purple-400',
];

export default function BrainstormingPage() {
  const [ideas, setIdeas] = useState<BrainstormIdea[]>([]);
  const [newIdea, setNewIdea] = useState('');
  const [session, setSession] = useState<BrainstormSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const params = useParams();
  const sessionId = params.id as string;
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user && sessionId) {
      getBrainstormSessionById(sessionId).then(sessionData => {
        setSession(sessionData || null);
      });

      const unsubscribe = getBrainstormIdeas(sessionId, (newIdeas) => {
        setIdeas(newIdeas);
        setIsLoading(false);
      });
      return () => unsubscribe();
    }
  }, [sessionId, user]);


  const addIdea = async () => {
    if (newIdea.trim() === '' || !user) return;
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    try {
        await addBrainstormIdea(sessionId, { text: newIdea.trim(), color: randomColor });
        setNewIdea('');
    } catch(e) {
        toast({ variant: 'destructive', title: "Error", description: "No se pudo añadir la idea." });
    }
  };

  const removeIdea = async (id: string) => {
    try {
        await deleteBrainstormIdea(sessionId, id);
    } catch(e) {
        toast({ variant: 'destructive', title: "Error", description: "No se pudo eliminar la idea." });
    }
  };

  if (isLoading) {
    return (
        <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
         <div>
            <Button asChild variant="ghost" className="mb-2 -ml-4">
                <Link href="/brainstorming">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver a Todas las Sesiones
                </Link>
            </Button>
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Lightbulb className="w-8 h-8 text-primary"/>
                    {session?.topic || 'Espacio de Lluvia de Ideas'}
                </h1>
                <p className="text-muted-foreground">
                    Un área dedicada para generar y organizar ideas rápidamente.
                </p>
            </div>
        </div>
        <div className="flex gap-2">
            <Input
            type="text"
            placeholder="¿Cuál es tu próxima gran idea?"
            value={newIdea}
            onChange={(e) => setNewIdea(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addIdea()}
            />
            <Button onClick={addIdea}>
                <Plus className="mr-2 h-4 w-4" />
                Añadir Idea
            </Button>
        </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {ideas.map((idea) => (
          <Card key={idea.id} className={cn('group relative transition-transform hover:scale-105', idea.color)}>
            <CardContent className="p-4">
              <p className="text-foreground">{idea.text}</p>
            </CardContent>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100"
              onClick={() => removeIdea(idea.id!)}
            >
              <X className="h-4 w-4" />
            </Button>
          </Card>
        ))}
      </div>
       {ideas.length === 0 && (
          <div className="col-span-1 md:col-span-2 lg:col-span-4 mt-8 text-center">
            <p className="text-muted-foreground">Tu espacio de lluvia de ideas está vacío. ¡Añade tu primera idea!</p>
          </div>
        )}
    </div>
  );
}
