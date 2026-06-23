
'use client';
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Check, Loader2, CreditCard } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { handleChangePlan } from "@/app/actions";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const basePlans = [
    {
        planId: "Gratuito" as const,
        name: "Gratuito",
        price: "$0",
        description: "Para individuos y proyectos pequeños.",
        features: ["Creación y edición de proyectos", "Mapas mentales básicos", "Tablero Kanban", "Colaboración básica", "Límite: 7 proyectos"],
        cta: "Elegir Gratuito",
    },
    {
        planId: "Pro" as const,
        name: "Pro",
        price: "$2",
        pricePeriod: "/ mes",
        description: "Para profesionales y equipos avanzados.",
        features: ["Todas las funciones Gratuito", "IA AlterMIA Integrada", "Línea de tiempo avanzada", "Estadísticas y Gráficos", "Límite: 20 proyectos"],
        cta: "Elegir Pro",
        isMostPopular: true,
    },
];

export default function PricingPage() {
    const { user, userProfile } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [isPaymentOpen, setPaymentOpen] = useState(false);

    const handlePlanChange = async (planId: "Gratuito" | "Pro") => {
        if (!user || !userProfile || userProfile.plan === planId) return;
        setIsLoading(planId);
        const res = await handleChangePlan(user.uid, planId);
        setIsLoading(null);
        setPaymentOpen(false);
        if (res.success) toast({ title: '¡Plan Actualizado!', description: `Ahora estás en el plan ${planId}.` });
        else toast({ variant: 'destructive', title: 'Error', description: res.error });
    };

    return (
        <div className="flex flex-col gap-8 max-w-4xl mx-auto">
            <div className="text-center">
                <h1 className="text-4xl font-bold">Planes y Precios</h1>
                <p className="text-muted-foreground mt-2">Escala tus proyectos con herramientas de IA.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
                {basePlans.map((plan) => (
                    <Card key={plan.name} className={cn("flex flex-col", plan.isMostPopular && userProfile?.plan !== 'Pro' && "border-primary border-2")}>
                        <CardHeader>
                            <CardTitle className="text-2xl">{plan.name}</CardTitle>
                            <CardDescription>{plan.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow gap-4 flex flex-col">
                            <div className="text-4xl font-bold">{plan.price}<span className="text-base font-normal text-muted-foreground">{plan.pricePeriod}</span></div>
                            <ul className="space-y-2">
                                {plan.features.map(f => <li key={f} className="flex gap-2 text-sm"><Check className="text-green-500 w-4 h-4"/>{f}</li>)}
                            </ul>
                        </CardContent>
                        <CardFooter>
                            {userProfile?.plan === plan.planId ? (
                                <Button className="w-full" variant="secondary" disabled>Tu Plan Actual</Button>
                            ) : plan.planId === 'Pro' ? (
                                <Dialog open={isPaymentOpen} onOpenChange={setPaymentOpen}>
                                    <DialogTrigger asChild><Button className="w-full">Elegir Pro</Button></DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader><DialogTitle>Pago Seguro</DialogTitle><DialogDescription>Simulación de pago de $2 USD.</DialogDescription></DialogHeader>
                                        <div className="grid gap-2 py-4">
                                            <Label>Número de Tarjeta</Label><Input placeholder="4242 4242 4242 4242"/>
                                            <div className="grid grid-cols-2 gap-2"><Input placeholder="MM/YY"/><Input placeholder="CVC"/></div>
                                        </div>
                                        <Button onClick={() => handlePlanChange('Pro')} disabled={isLoading === 'Pro'}>
                                            {isLoading === 'Pro' && <Loader2 className="mr-2 animate-spin w-4 h-4"/>} <CreditCard className="mr-2 h-4 w-4"/> Pagar $2
                                        </Button>
                                    </DialogContent>
                                </Dialog>
                            ) : (
                                <Button variant="outline" className="w-full" onClick={() => handlePlanChange('Gratuito')} disabled={isLoading === 'Gratuito'}>
                                    {isLoading === 'Gratuito' && <Loader2 className="mr-2 animate-spin w-4 h-4"/>} Bajar a Gratuito
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
