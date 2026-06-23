
'use client';
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FileText, Share2, DollarSign, LayoutGrid, BrainCircuit, Blocks, Sparkles, CheckSquare, Table } from 'lucide-react';
import { Button } from "@/components/ui/button";
import Link from 'next/link';

export default function DocumentationPage() {
  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
       <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="w-8 h-8 text-primary"/>
              Documentación del Sistema Creactor
          </h1>
          <p className="text-muted-foreground">Guía técnica y funcional sobre las herramientas de la plataforma.</p>
      </div>
      
      <Accordion type="single" collapsible className="w-full">
         <AccordionItem value="planes">
            <AccordionTrigger className="text-xl font-semibold flex items-center gap-3">
                <DollarSign className="w-6 h-6 text-primary/80"/>
                Sistemas de Planes y Límites
            </AccordionTrigger>
            <AccordionContent className="pt-2 pl-12 text-muted-foreground">
                <div className="space-y-3">
                    <div className="p-3 border rounded-lg bg-card">
                        <p className="font-bold text-foreground">Plan Gratuito ($0/mes)</p>
                        <ul className="text-sm list-disc pl-5">
                            <li>Límite de 7 proyectos activos.</li>
                            <li>Gestión básica de tareas y tablas.</li>
                            <li>Sin acceso a funciones de IA avanzada.</li>
                        </ul>
                    </div>
                    <div className="p-3 border-2 border-primary/50 rounded-lg bg-primary/5">
                        <p className="font-bold text-foreground">Plan Pro ($2/mes)</p>
                        <ul className="text-sm list-disc pl-5">
                            <li>Límite ampliado a 20 proyectos activos.</li>
                            <li>IA AlterMIA, Línea de Tiempo y Estadísticas.</li>
                            <li>Generación de presentaciones e IA en tareas.</li>
                        </ul>
                    </div>
                    <Button asChild variant="link" className="px-0"><Link href="/pricing">Ver precios y actualizar</Link></Button>
                </div>
            </AccordionContent>
        </AccordionItem>

        <AccordionItem value="tablas">
            <AccordionTrigger className="text-xl font-semibold flex items-center gap-3">
                <Table className="w-6 h-6 text-primary/80"/>
                Herramienta de Tablas Avanzada
            </AccordionTrigger>
            <AccordionContent className="pt-2 pl-12 text-muted-foreground">
                <p>Las tablas en Creactor permiten organizar datos estructurados con funciones avanzadas:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li><strong>Redimensionamiento:</strong> Arrastra el borde derecho de cualquier columna para ajustar su ancho, igual que en Excel.</li>
                    <li><strong>Plantillas:</strong> DAFO, Presupuesto, Cronograma y más.</li>
                    <li><strong>Persistencia:</strong> Los cambios se guardan automáticamente cada 2 segundos.</li>
                </ul>
            </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
