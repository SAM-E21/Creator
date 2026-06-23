
'use client';

import { useState, useEffect } from 'react';
import { useParams, notFound } from 'next/navigation';
import { getProjectById } from '@/lib/data';
import { ChecklistClient } from '@/components/projects/ChecklistClient';
import type { Project } from '@/types';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export default function ProjectChecklistPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && projectId) {
        setLoading(true);
        getProjectById(projectId).then(data => {
            setProject(data || null);
            setLoading(false);
        }).catch(() => {
            setLoading(false);
        });
    } else if (!authLoading && !user) {
        setLoading(false);
    }
  }, [user, projectId, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (!project && !loading) {
    notFound();
  }

  if (!project) return null;
  
  return <ChecklistClient project={project} />;
}
