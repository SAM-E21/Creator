
'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getWebGeniusPagesByProjectId } from '@/lib/data';
import type { WebGeniusPage } from '@/types';
import { Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function ProjectWebGeniusPage() {
  const [pages, setPages] = useState<WebGeniusPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { user } = useAuth();
  const params = useParams();
  const projectId = params.id as string;

  useEffect(() => {
    if (user && projectId) {
      setIsLoading(true);
      const unsubscribe = getWebGeniusPagesByProjectId(projectId, (newPages) => {
        setPages(newPages);
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
        {pages.map((page) => (
          <Link key={page.id} href={`/web-genius/${page.id}`}>
            <Card className="h-full flex flex-col justify-between transition-shadow hover:shadow-lg cursor-pointer">
              <CardHeader>
                <CardTitle className="text-primary">{page.name}</CardTitle>
                <CardDescription>
                  {page.updatedAt ? `Última actualización: ${page.updatedAt.toLocaleDateString()}` : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex items-center justify-center bg-muted/20 aspect-video">
                 <Sparkles className="w-16 h-16 text-muted-foreground/30" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {pages.length === 0 && !isLoading && (
        <div className="col-span-full mt-8 text-center">
          <p className="text-muted-foreground">Este proyecto aún no tiene páginas de Web Genius.</p>
          <Button variant="link" asChild>
            <Link href="/web-genius">
                Ir a Web Genius para crear una
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
