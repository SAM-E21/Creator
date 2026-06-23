'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getProjects } from '@/lib/data';
import { ProjectsDashboardClient } from '@/components/projects/ProjectsDashboardClient';
import type { Project } from '@/types';
import { Loader2 } from 'lucide-react';

export default function ProjectsDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    if (user) {
      setLoadingProjects(true);
      const unsubscribe = getProjects(
        user.uid, 
        (newProjects) => {
          setProjects(newProjects);
          setLoadingProjects(false);
        },
        (error) => {
          console.error("Error cargando proyectos:", error);
          setLoadingProjects(false);
        }
      );
      return () => unsubscribe();
    } else if (!authLoading) {
        setLoadingProjects(false);
    }
  }, [user, authLoading]);

  if (authLoading || loadingProjects) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return <ProjectsDashboardClient projects={projects} />;
}
