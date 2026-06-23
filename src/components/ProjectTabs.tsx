
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { CheckSquare, GanttChartSquare, ClipboardList, Brush, BookOpen, MessageSquare, TrendingUp, Columns, Blocks, Sparkles, Presentation, Table } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const { userProfile } = useAuth();
  const baseProjectUrl = `/projects/${projectId}`;
  
  const isPro = userProfile?.plan === 'Pro';

  const allTabs = [
    { name: 'Lista de Tareas', href: baseProjectUrl, icon: CheckSquare, available: true },
    { name: 'Línea de Tiempo', href: `${baseProjectUrl}/timeline`, icon: GanttChartSquare, available: isPro },
    { name: 'Estadísticas', href: `${baseProjectUrl}/stats`, icon: TrendingUp, available: isPro },
    { name: 'Tablas', href: `${baseProjectUrl}/tables`, icon: Table, available: true },
    { name: 'Tablero', href: `${baseProjectUrl}/board`, icon: Columns, available: true },
    { name: 'Codium', href: `${baseProjectUrl}/codium`, icon: Blocks, available: true },
    { name: 'PelixFlow', href: `${baseProjectUrl}/web-genius`, icon: Sparkles, available: true },
    { name: 'Presentaciones', href: `${baseProjectUrl}/presentations`, icon: Presentation, available: true },
    { name: 'Notas', href: `${baseProjectUrl}/notes`, icon: ClipboardList, available: true },
    { name: 'Bitácora', href: `${baseProjectUrl}/logbook`, icon: BookOpen, available: true },
    { name: 'Boceto', href: `${baseProjectUrl}/sketch`, icon: Brush, available: true },
    { name: 'Chat', href: `${baseProjectUrl}/chat`, icon: MessageSquare, available: true },
  ];
  
  const tabs = allTabs.filter(tab => tab.available);

  return (
    <div className="border-b">
      <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
        {tabs.map((tab) => (
          <Link
            key={tab.name}
            href={tab.href}
            className={cn(
              'group inline-flex items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-1 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary',
              (pathname === tab.href || (tab.href !== baseProjectUrl && pathname.startsWith(tab.href))) ? 'border-primary text-primary' : ''
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.name}
          </Link>
        ))}
      </nav>
    </div>
  );
}
