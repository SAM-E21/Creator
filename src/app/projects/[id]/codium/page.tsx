
'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getCodiumProgramsByProjectId } from '@/lib/data';
import type { CodiumProgram } from '@/types';
import { Loader2, Blocks } from 'lucide-react';
import Link from 'next/link';

export default function ProjectCodiumPage() {
  const [programs, setPrograms] = useState<CodiumProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const projectId = params.id as string;

  useEffect(() => {
    if (user && projectId) {
      setIsLoading(true);
      const unsubscribe = getCodiumProgramsByProjectId(projectId, (newPrograms) => {
        setPrograms(newPrograms);
        setIsLoading(false);
      });
      return () => unsubscribe();
    }
  }, [projectId, user]);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {programs.map((program) => (
          <Link key={program.id} href={`/codium/${program.id}`}>
            <Card className="h-full flex flex-col justify-between transition-shadow hover:shadow-lg cursor-pointer">
              <CardHeader>
                <CardTitle className="text-primary">{program.name}</CardTitle>
                <CardDescription>
                  {program.updatedAt ? `Última actualización: ${program.updatedAt.toLocaleDateString()}` : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex items-center justify-center bg-muted/20 aspect-video">
                 <Blocks className="w-16 h-16 text-muted-foreground/30" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {programs.length === 0 && !isLoading && (
        <div className="col-span-full mt-8 text-center">
          <p className="text-muted-foreground">Este proyecto aún no tiene programas de Codium.</p>
          <Button variant="link" asChild>
            <Link href="/codium">
                Ir a Codium para crear uno
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
