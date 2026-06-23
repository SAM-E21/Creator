import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Brush, ArrowRight } from 'lucide-react';

export default function SketchPage() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Brush className="h-8 w-8" />
          </div>
          <CardTitle>Herramienta de Bocetos y Diagramas</CardTitle>
          <CardDescription className="pt-2">
            La herramienta de bocetos es parte de cada proyecto. Puedes crear y gestionar tus bocetos desde el panel del proyecto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Ve a tus proyectos para empezar a dibujar.
          </p>
          <Button asChild>
            <Link href="/">
              Ir a Proyectos <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
