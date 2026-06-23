
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  BrainCircuit,
  Lightbulb,
  Shapes,
  LogIn,
  LogOut,
  UserPlus,
  User as UserIcon,
  Blocks,
  FileText,
  Sparkles,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/use-auth';
import { Button } from './ui/button';

const navItems = [
  { href: '/', label: 'Proyectos', icon: LayoutGrid },
  { href: '/codium', label: 'Codium', icon: Blocks },
  { href: '/web-genius', label: 'PelixFlow', icon: Sparkles },
  { href: '/mind-maps', label: 'Mapas Mentales', icon: BrainCircuit },
  { href: '/brainstorming', label: 'Lluvia de Ideas', icon: Lightbulb },
  { href: '/pricing', label: 'Precios', icon: DollarSign },
  { href: '/documentation', label: 'Documentación', icon: FileText },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <aside className="sticky top-0 hidden h-screen w-16 flex-col border-r bg-background md:flex">
      <TooltipProvider>
        <nav className="flex flex-col items-center gap-4 px-2 py-4">
          <Link
            href="/"
            className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
          >
            <Shapes className="h-5 w-5 transition-all group-hover:scale-110" />
            <span className="sr-only">Creactor</span>
          </Link>
          {navItems.map((item) => (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-all hover:text-foreground',
                    ((pathname === item.href) || (pathname.startsWith(item.href) && item.href !== '/')) && 'bg-accent text-accent-foreground glow-primary scale-110'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="sr-only">{item.label}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ))}
        </nav>
        <nav className="mt-auto flex flex-col items-center gap-4 px-2 py-4">
          {user ? (
            <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/profile"
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-all hover:text-foreground',
                    pathname === '/profile' && 'bg-accent text-accent-foreground'
                  )}
                >
                  <UserIcon className="h-5 w-5" />
                  <span className="sr-only">Perfil</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Perfil</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={signOut} className="h-10 w-10">
                  <LogOut className="h-5 w-5" />
                   <span className="sr-only">Cerrar Sesión</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Cerrar Sesión</TooltipContent>
            </Tooltip>
            </>
          ) : (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/login"
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-all hover:text-foreground',
                      pathname === '/login' && 'bg-accent text-accent-foreground'
                    )}
                  >
                    <LogIn className="h-5 w-5" />
                    <span className="sr-only">Iniciar Sesión</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Iniciar Sesión</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/signup"
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-all hover:text-foreground',
                      pathname === '/signup' && 'bg-accent text-accent-foreground'
                    )}
                  >
                    <UserPlus className="h-5 w-5" />
                    <span className="sr-only">Registrarse</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Registrarse</TooltipContent>
              </Tooltip>
            </>
          )}
        </nav>
      </TooltipProvider>
    </aside>
  );
}
