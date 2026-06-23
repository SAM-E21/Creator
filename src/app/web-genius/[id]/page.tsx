'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, ArrowLeft, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { handleGenerateWebPage } from '@/app/actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getWebGeniusPageById, updateWebGeniusPage } from '@/lib/data';
import type { WebGeniusPage } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type WebPageCode = {
    html: string;
    css: string;
    javascript: string;
};

export default function PelixFlowEditorPage() {
    const [page, setPage] = useState<WebGeniusPage | null>(null);
    const [prompt, setPrompt] = useState('');
    const [improvement, setImprovement] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [editableCode, setEditableCode] = useState<WebPageCode | null>(null);
    const [generationError, setGenerationError] = useState<string | null>(null);

    const params = useParams();
    const pageId = params.id as string;
    const { user } = useAuth();
    const { toast } = useToast();

    useEffect(() => {
        if (user && pageId) {
            getWebGeniusPageById(pageId).then(pageData => {
                if (pageData) {
                    setPage(pageData);
                    setPrompt(pageData.prompt);
                    setEditableCode({
                        html: pageData.html,
                        css: pageData.css,
                        javascript: pageData.javascript,
                    });
                }
                setIsFetching(false);
            });
        }
    }, [user, pageId]);

    const handleGenerate = async () => {
        if (!prompt.trim() && !improvement.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'El prompt o la mejora no pueden estar vacíos.' });
            return;
        }
        setIsLoading(true);
        setGenerationError(null);

        const currentCode = editableCode || undefined;
        const generationPrompt = improvement ? page?.prompt || '' : prompt;
        const generationImprovement = improvement || undefined;

        try {
            const result = await handleGenerateWebPage(generationPrompt, generationImprovement, currentCode);
            
            if (result.success) {
                const code = {
                    html: result.html || '',
                    css: result.css || '',
                    javascript: result.javascript || ''
                };
                setEditableCode(code);
                
                const updatedPageData = { 
                    ...code, 
                    prompt: generationPrompt, 
                };
                updateWebGeniusPage(pageId, updatedPageData);
                setPage(prev => prev ? {...prev, ...updatedPageData} : null);
                setImprovement('');

                toast({ title: '¡Página Actualizada!', description: 'Tu página web ha sido actualizada por la IA.' });
            } else {
                setGenerationError(result.error || 'Ocurrió un error desconocido al generar la página.');
                toast({ variant: 'destructive', title: 'Error de Generación', description: result.error });
            }
        } catch (err: any) {
            setGenerationError(err.message || 'Error crítico en la generación.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const getIframeContent = () => {
        if (!editableCode) return '<div style="display:flex;justify-content:center;align-items:center;height:100%;color:grey;">Cargando vista previa...</div>';
        return `
            <!DOCTYPE html>
            <html>
                <head>
                    <style>${editableCode.css}</style>
                </head>
                <body>
                    ${editableCode.html}
                    <script>${editableCode.javascript}</script>
                </body>
            </html>
        `;
    };

    const handleCodeChange = (type: keyof WebPageCode, value: string) => {
        if (!editableCode) return;
        setEditableCode({ ...editableCode, [type]: value });
    };

    const handleSave = async () => {
        if (!editableCode) return;
        setIsLoading(true);
        try {
            await updateWebGeniusPage(pageId, editableCode);
            toast({ title: '¡Guardado!', description: 'Tus cambios manuales han sido guardados.'});
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron guardar los cambios.'});
        }
        setIsLoading(false);
    }
    
    if (isFetching) {
        return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="flex flex-col gap-8">
             <div className="flex items-center justify-between">
                <Button asChild variant="ghost" className="mb-2 -ml-4">
                    <Link href="/web-genius">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver a Todas las Páginas
                    </Link>
                </Button>
            </div>
            <div className="flex flex-col gap-1 mb-4">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Sparkles className="w-8 h-8 text-primary"/>
                    PelixFlow
                </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                 <Card>
                    <CardHeader>
                        <CardTitle>Describe tu Página Web</CardTitle>
                        <CardDescription>
                            Usa el primer campo para describir la página desde cero. Usa el segundo para pedir mejoras sobre la versión actual.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <div>
                            <Label htmlFor="initial-prompt">Prompt Inicial</Label>
                            <Textarea
                                id="initial-prompt"
                                placeholder="Ej: Una landing page para una app de fitness, con un tema oscuro..."
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                className="min-h-[100px]"
                                disabled={isLoading}
                            />
                        </div>
                         <div>
                            <Label htmlFor="improvement-prompt">Sugerencia de Mejora</Label>
                            <Textarea
                                id="improvement-prompt"
                                placeholder="Ej: Cambia el color de fondo a azul. Añade una sección de contacto con un formulario."
                                value={improvement}
                                onChange={(e) => setImprovement(e.target.value)}
                                className="min-h-[100px]"
                                disabled={isLoading}
                            />
                        </div>

                    </CardContent>
                    <div className="p-6 pt-0 flex gap-2">
                        <Button onClick={handleGenerate} disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4" />}
                            {improvement ? 'Mejorar Página' : 'Generar Página'}
                        </Button>
                        <Button onClick={handleSave} variant="secondary" disabled={isLoading}>Guardar Cambios</Button>
                    </div>
                </Card>
                <div className="flex flex-col gap-4">
                    {generationError && (
                        <Alert variant="destructive" className="bg-destructive/10 border-destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error de Generación</AlertTitle>
                            <AlertDescription className="text-xs font-mono whitespace-pre-wrap">
                                {generationError}
                            </AlertDescription>
                        </Alert>
                    )}
                    <Card className="flex-grow">
                        <Tabs defaultValue="html" className="h-full flex flex-col">
                            <div className="p-4 border-b">
                                <TabsList>
                                    <TabsTrigger value="html">HTML</TabsTrigger>
                                    <TabsTrigger value="css">CSS</TabsTrigger>
                                    <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                                </TabsList>
                            </div>
                            <TabsContent value="html" className="flex-grow p-0">
                                <Textarea value={editableCode?.html || ''} onChange={(e) => handleCodeChange('html', e.target.value)} className="h-[300px] w-full resize-none border-0 rounded-none font-mono text-xs" />
                            </TabsContent>
                            <TabsContent value="css" className="flex-grow p-0">
                                <Textarea value={editableCode?.css || ''} onChange={(e) => handleCodeChange('css', e.target.value)} className="h-[300px] w-full resize-none border-0 rounded-none font-mono text-xs" />
                            </TabsContent>
                            <TabsContent value="javascript" className="flex-grow p-0">
                                <Textarea value={editableCode?.javascript || ''} onChange={(e) => handleCodeChange('javascript', e.target.value)} className="h-[300px] w-full resize-none border-0 rounded-none font-mono text-xs" />
                            </TabsContent>
                        </Tabs>
                    </Card>
                </div>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Vista Previa en Vivo</CardTitle>
                </CardHeader>
                <CardContent className="h-[600px] p-0">
                    <iframe
                        srcDoc={getIframeContent()}
                        title="Vista previa de la página generada"
                        className="w-full h-full border-0 rounded-b-md bg-white"
                        sandbox="allow-scripts allow-forms"
                    />
                </CardContent>
            </Card>
            
            {isLoading && (
                 <div className="fixed inset-0 bg-background/80 flex justify-center items-center z-50">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-4 text-muted-foreground">Actualizando tu página en PelixFlow... esto puede tardar un momento.</p>
                 </div>
            )}

        </div>
    );
}
