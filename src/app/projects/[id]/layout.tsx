
'use client';

import { useState, useEffect } from 'react';
import { useParams, notFound } from 'next/navigation';
import { getProjectById } from '@/lib/data';
import { ProjectTabs } from '@/components/ProjectTabs';
import { ArrowLeft, Share2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Project } from '@/types';
import { useAuth } from '@/hooks/use-auth';

function ShareCodeDisplay({ code }: { code: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card className="p-2 cursor-pointer bg-card/50 border-primary/20 hover:border-primary/40 transition-colors">
            <CardContent className="p-1 flex items-center gap-3">
              <Share2 className="w-5 h-5 text-primary" />
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground -mb-1 font-medium">Código para Compartir</span>
                <span className="font-mono text-lg tracking-widest text-primary font-bold">{code}</span>
              </div>
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent>
          <p>Comparte este código para invitar a otros a este proyecto.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const projectId = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);

  useEffect(() => {
    if (user && projectId) {
      setLoadingProject(true);
      getProjectById(projectId).then(data => {
        setProject(data || null);
        setLoadingProject(false);
      }).catch(() => {
        setLoadingProject(false);
      });
    } else if (!authLoading && !user) {
        setLoadingProject(false);
    }
  }, [user, projectId, authLoading]);

  if (authLoading || loadingProject) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project && !loadingProject) {
    notFound();
  }

  if (!project) return null;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <Button asChild variant="ghost" size="sm" className="w-fit -ml-3 text-muted-foreground hover:text-primary">
              <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver a Proyectos
              </Link>
          </Button>
          <h1 className="text-4xl font-black tracking-tighter text-primary uppercase italic drop-shadow-sm">{project.name}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">{project.description}</p>
        </div>
        {project.shareCode && <ShareCodeDisplay code={project.shareCode} />}
      </div>
      <ProjectTabs projectId={project.id} />
      <div className="mt-6 animate-fadeIn">{children}</div>
    </div>
  );
}
