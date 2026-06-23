
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, ArrowLeft, ChevronLeft, ChevronRight, FileImage, Type, Plus, Trash2, Save, Palette, Layers, ChevronsUpDown, RectangleHorizontal, Circle, Triangle, ArrowUp, ArrowDown, Square, MinusSquare, Clapperboard, MonitorPlay, X, Film } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { handleGeneratePresentation } from '@/app/actions';
import { getPresentationById, updatePresentation } from '@/lib/data';
import type { Presentation, Slide, SlideElement, StyleProperties, ElementType, ShapeType, AnimationType, AnimationProperties } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';


const renderStyle = (element: SlideElement, isPresenting: boolean): React.CSSProperties => {
    const textGradientStyle = element.style.textGradient ? {
        background: element.style.textGradient,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        color: 'transparent',
    } : {
        color: element.style.textColor || 'inherit',
    };

    const outlineStyle = element.type === 'shape' && element.style.isOutline ? {
        border: `3px solid ${element.style.outlineColor || '#000000'}`,
        backgroundColor: 'transparent',
    } : {};
    
    const animationStyle: React.CSSProperties = isPresenting && element.animation && element.animation.type !== 'none' ? {
        animationName: element.animation.type,
        animationDuration: `${element.animation.duration || 500}ms`,
        animationDelay: `${element.animation.delay || 0}ms`,
        animationFillMode: 'both',
        animationTimingFunction: 'ease-out',
        opacity: 0, // Start with opacity 0 to let animation handle it
    } : {};

    return {
        position: 'absolute',
        left: `${element.x}%`,
        top: `${element.y}%`,
        width: `${element.width}%`,
        height: element.height === 'auto' ? 'auto' : `${element.height}%`,
        transform: `rotate(${element.rotation}deg)`,
        opacity: element.style.opacity ?? 1,
        background: element.style.backgroundGradient || element.style.backgroundColor || 'transparent',
        fontSize: element.style.fontSize ? `${element.style.fontSize}px` : 'inherit',
        ...textGradientStyle,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1%',
        boxSizing: 'border-box',
        ...outlineStyle,
        lineHeight: 1.2,
        wordBreak: 'break-word',
        overflow: 'hidden', // Hide overflow for background images
        ...animationStyle,
    };
};

const SlideElementComponent = ({ element, isPresenting = false }: { element: SlideElement, isPresenting?: boolean }) => {
    const style = renderStyle(element, isPresenting);
    const hasBackgroundImage = element.style.backgroundUrl && element.type === 'shape' && !element.style.isOutline;

    switch (element.type) {
        case 'text':
            return <div style={style} className="whitespace-pre-wrap">{element.content}</div>;
        case 'image':
            return (
                <div style={style}>
                    <Image src={element.url!} alt={element.content || 'Slide image'} layout="fill" objectFit="cover" />
                </div>
            );
        case 'shape':
             if (element.shape === 'circle') {
                style.borderRadius = '50%';
            }
             if (element.shape === 'triangle') {
                style.backgroundColor = 'transparent';
                style.width = '0';
                style.height = '0';
                style.borderLeft = `${element.width/2}% solid transparent`;
                style.borderRight = `${element.width/2}% solid transparent`;
                style.borderBottom = `${element.height}% solid ${element.style.backgroundColor || '#ccc'}`;
            }
            return (
              <div style={style}>
                 {hasBackgroundImage && (
                    <Image src={element.style.backgroundUrl!} alt="Shape background" layout="fill" objectFit="cover"/>
                 )}
              </div>
            );
        default:
            return null;
    }
}


export default function PresentationEditorPage() {
    const [presentation, setPresentation] = useState<Presentation | null>(null);
    const [improvement, setImprovement] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [activeSlideIndex, setActiveSlideIndex] = useState(0);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [isPresenting, setIsPresenting] = useState(false);

    const params = useParams();
    const presentationId = params.id as string;
    const { user } = useAuth();
    const { toast } = useToast();
    
    useEffect(() => {
        if (user && presentationId) {
            getPresentationById(presentationId).then(data => {
                if (data) {
                    setPresentation(data);
                     if (data.slides && data.slides.length > 0) {
                        setActiveSlideIndex(0);
                    }
                }
                setIsFetching(false);
            });
        }
    }, [user, presentationId]);

    const handleGenerate = async () => {
        if (!improvement.trim() || !presentation) {
            toast({ variant: 'destructive', title: 'Error', description: 'La sugerencia de mejora no puede estar vacía.' });
            return;
        }
        setIsLoading(true);

        const result = await handleGeneratePresentation({
            prompt: presentation.prompt,
            improvement: improvement,
            currentSlides: presentation.slides,
            projectId: presentation.projectId,
        });
        
        if (result.success && result.data) {
            const newSlides = result.data.slides;
            await updatePresentation(presentationId, { slides: newSlides });
            setPresentation(prev => prev ? {...prev, slides: newSlides} : null);
            setImprovement('');
            setActiveSlideIndex(0);
            setSelectedElementId(null);
            toast({ title: '¡Presentación Actualizada!', description: 'La IA ha mejorado tus diapositivas.' });
        } else {
            toast({ variant: 'destructive', title: 'Error de Generación', description: result.error });
        }
        setIsLoading(false);
    };
    
    const updateSlide = useCallback((slideId: string, updatedSlideData: Partial<Slide> | ((s: Slide) => Slide)) => {
        setPresentation(prev => {
            if (!prev) return null;
            const newSlides = prev.slides.map(s => {
                if (s.id === slideId) {
                    if (typeof updatedSlideData === 'function') {
                        return updatedSlideData(s);
                    }
                    return { ...s, ...updatedSlideData };
                }
                return s;
            });
            return { ...prev, slides: newSlides };
        });
    }, []);

    const updateElement = useCallback((elementId: string, updatedElementData: Partial<SlideElement> | ((el: SlideElement) => SlideElement)) => {
        const activeSlide = presentation?.slides[activeSlideIndex];
        if (!activeSlide) return;

        const newElements = activeSlide.elements.map(el => {
            if (el.id === elementId) {
                if (typeof updatedElementData === 'function') {
                    return updatedElementData(el);
                }
                return { ...el, ...updatedElementData };
            }
            return el;
        });

        updateSlide(activeSlide.id, { elements: newElements });
    }, [presentation, activeSlideIndex, updateSlide]);


     const handleSave = async () => {
        if (!presentation) return;
        setIsSaving(true);
        try {
            await updatePresentation(presentationId, { slides: presentation.slides });
            toast({ title: '¡Guardado!', description: 'Tus cambios manuales han sido guardados.'});
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron guardar los cambios.'});
        } finally {
            setIsSaving(false);
        }
    };
    
     const addSlide = () => {
        const newSlide: Slide = {
            id: `slide-${Date.now()}`,
            elements: [
                {
                    id: `element-${Date.now()}`,
                    type: 'text',
                    content: 'Nueva Diapositiva',
                    x: 10, y: 40, width: 80, height: 'auto', rotation: 0,
                    style: { fontSize: 48, textColor: '#FFFFFF' }
                }
            ],
            background: { color: '#1a202c' },
            speakerNotes: ''
        };
        const newSlides = [...(presentation?.slides || []), newSlide];
        setPresentation(prev => ({...(prev as Presentation), slides: newSlides}));
        setActiveSlideIndex(newSlides.length - 1);
        setSelectedElementId(null);
    };

    const deleteSlide = async () => {
        if (!presentation || presentation.slides.length <= 1) {
            toast({ variant: 'destructive', title: 'Acción no permitida', description: 'No se puede eliminar la última diapositiva.' });
            return;
        }
        const newSlides = presentation.slides.filter((_, index) => index !== activeSlideIndex);
        setPresentation(prev => ({...(prev as Presentation), slides: newSlides}));
        setActiveSlideIndex(s => Math.max(0, s - 1));
        setSelectedElementId(null);
    };

    const addElement = (type: ElementType, shape?: ShapeType) => {
        const activeSlide = presentation?.slides[activeSlideIndex];
        if (!activeSlide) return;

        const newElement: SlideElement = {
            id: `element-${Date.now()}`,
            type: type,
            shape: shape,
            x: 25, y: 25, width: 50, height: type === 'text' ? 'auto' : 20, rotation: 0,
            style: { backgroundColor: type === 'text' ? 'transparent' : '#cccccc', fontSize: 16, textColor: '#000000' },
            content: type === 'text' ? 'Nuevo Texto' : '',
            url: type === 'image' ? 'https://placehold.co/400x300' : undefined,
        };
        const newElements = [...activeSlide.elements, newElement];
        updateSlide(activeSlide.id, { elements: newElements });
        setSelectedElementId(newElement.id);
    }

    const deleteElement = () => {
        if (!selectedElementId) return;
        const activeSlide = presentation?.slides[activeSlideIndex];
        if (!activeSlide) return;
        
        const newElements = activeSlide.elements.filter(el => el.id !== selectedElementId);
        updateSlide(activeSlide.id, { elements: newElements });
        setSelectedElementId(null);
    }

    const moveElement = (direction: 'up' | 'down') => {
        if (!selectedElementId) return;
        const activeSlide = presentation?.slides[activeSlideIndex];
        if (!activeSlide) return;

        const index = activeSlide.elements.findIndex(e => e.id === selectedElementId);
        if (index === -1) return;

        const newElements = [...activeSlide.elements];
        const [element] = newElements.splice(index, 1);

        if (direction === 'up' && index < newElements.length) {
            newElements.splice(index + 1, 0, element);
        } else if (direction === 'down' && index > 0) {
            newElements.splice(index - 1, 0, element);
        } else {
             newElements.splice(direction === 'up' ? newElements.length : 0, 0, element);
        }
        
        updateSlide(activeSlide.id, { elements: newElements });
    }

    if (isFetching) {
        return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    const currentSlide = presentation?.slides[activeSlideIndex];
    const selectedElement = currentSlide?.elements.find(e => e.id === selectedElementId);
    
    const backgroundStyle = {
        background: currentSlide?.background?.gradient || currentSlide?.background?.color || 'hsl(var(--muted))',
    }

    return (
        <>
        <div className="flex flex-col gap-6">
             <div>
                <Button asChild variant="ghost" className="mb-2 -ml-4">
                    <Link href={`/projects/${presentation?.projectId}/presentations`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver a Todas las Presentaciones
                    </Link>
                </Button>
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-bold tracking-tight">{presentation?.name || 'Editor de Presentaciones'}</h1>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 flex flex-col gap-4">
                     <Card className="w-full aspect-video relative shadow-lg overflow-hidden" onClick={() => setSelectedElementId(null)}>
                         <div 
                            className="w-full h-full bg-cover bg-center"
                            style={backgroundStyle}
                        >
                            {currentSlide?.background?.imageUrl && (
                                <Image
                                    src={currentSlide.background.imageUrl}
                                    alt="Background"
                                    layout="fill"
                                    objectFit="cover"
                                    className="z-0"
                                />
                            )}
                             <div className="w-full h-full relative">
                                {currentSlide?.elements.map(el => (
                                     <div key={el.id} onClick={(e) => { e.stopPropagation(); setSelectedElementId(el.id)}}>
                                        <SlideElementComponent element={el} />
                                         {selectedElementId === el.id && (
                                            <div 
                                                style={{
                                                    position: 'absolute', 
                                                    left: `${el.x}%`, 
                                                    top: `${el.y}%`, 
                                                    width: `${el.width}%`, 
                                                    height: el.height === 'auto' ? 'auto' : `${el.height}%`,
                                                    transform: `rotate(${el.rotation}deg)`,
                                                }} 
                                                className="border-2 border-dashed border-primary z-50 pointer-events-none" 
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>
                    <div className="flex justify-between items-center gap-4">
                        <div className="flex justify-center items-center gap-4">
                            <Button variant="outline" onClick={() => setActiveSlideIndex(s => Math.max(0, s - 1))} disabled={activeSlideIndex === 0}><ChevronLeft className="mr-2 h-4 w-4" /> Anterior</Button>
                            <span className="text-sm text-muted-foreground">Diapositiva {presentation ? activeSlideIndex + 1 : 0} de {presentation?.slides.length || 0}</span>
                            <Button variant="outline" onClick={() => setActiveSlideIndex(s => Math.min((presentation?.slides.length || 1) - 1, s + 1))} disabled={!presentation || activeSlideIndex >= presentation.slides.length - 1}>Siguiente <ChevronRight className="ml-2 h-4 w-4" /></Button>
                        </div>
                         <Button onClick={() => setIsPresenting(true)} disabled={!presentation || presentation.slides.length === 0} >
                           <MonitorPlay className="mr-2 h-4 w-4" />
                           Presentar
                        </Button>
                    </div>
                </div>

                <div className="lg:col-span-1 flex flex-col gap-6">
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                               <ChevronsUpDown className="w-5 h-5"/>
                                Control de Diapositiva
                           </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-2">
                             <Button variant="outline" onClick={addSlide}><Plus className="mr-2 h-4 w-4"/> Añadir</Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                     <Button variant="destructive" disabled={!presentation || presentation.slides.length <= 1}>
                                        <Trash2 className="mr-2 h-4 w-4"/> Eliminar
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>¿Estás seguro?</AlertDialogTitle><AlertDialogDescription>
                                        Esta acción no se puede deshacer. Esto eliminará permanentemente la diapositiva actual.
                                    </AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={deleteSlide}>Eliminar</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardContent>
                    </Card>

                    <ElementInspector
                        element={selectedElement}
                        onUpdateElement={updateElement}
                        onDeleteElement={deleteElement}
                        onAddElement={addElement}
                        onMoveElement={moveElement}
                    />

                    <SlideStyleEditor 
                        slide={currentSlide}
                        onUpdateSlide={updateSlide}
                    />
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <Card className="lg:col-span-2">
                     <CardHeader>
                        <CardTitle>Mejorar con IA</CardTitle>
                        <CardDescription>
                            Pide a la IA que modifique o mejore la presentación actual.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                        <Textarea
                            placeholder="Ej: Haz la presentación más concisa y añade una diapositiva sobre el futuro del mercado."
                            value={improvement}
                            onChange={(e) => setImprovement(e.target.value)}
                            className="min-h-[100px]"
                            disabled={isLoading}
                        />
                        <div className="flex gap-2 justify-end">
                             <Button onClick={handleSave} variant="secondary" disabled={isSaving || isLoading}>
                                 {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                                 Guardar Cambios
                             </Button>
                             <Button onClick={handleGenerate} disabled={isLoading || !improvement.trim()}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4" />}
                                Mejorar Presentación
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                
                 <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Notas del Orador</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <Textarea
                            placeholder="Notas para esta diapositiva..."
                            value={currentSlide?.speakerNotes || ''}
                            onChange={(e) => currentSlide && updateSlide(currentSlide.id, { speakerNotes: e.target.value })}
                            className="h-full min-h-[150px] text-base"
                            disabled={isLoading || !currentSlide}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>

        {isPresenting && presentation && (
            <PresentationMode
                slides={presentation.slides}
                initialSlideIndex={activeSlideIndex}
                onExit={() => setIsPresenting(false)}
            />
        )}
        </>
    );
}

function PresentationMode({ slides, initialSlideIndex, onExit }: { slides: Slide[], initialSlideIndex: number, onExit: () => void }) {
    const [currentIndex, setCurrentIndex] = useState(initialSlideIndex);
    const [animationKey, setAnimationKey] = useState(Date.now());

    const handleNext = useCallback(() => {
        setCurrentIndex(prev => {
            const nextIndex = Math.min(slides.length - 1, prev + 1);
            if (nextIndex !== prev) setAnimationKey(Date.now());
            return nextIndex;
        });
    }, [slides.length]);
    
    const handlePrev = useCallback(() => {
        setCurrentIndex(prev => {
            const nextIndex = Math.max(0, prev - 1);
            if (nextIndex !== prev) setAnimationKey(Date.now());
            return nextIndex;
        });
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === ' ') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'Escape') onExit();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleNext, handlePrev, onExit]);

    const slide = slides[currentIndex];
    if (!slide) return null;
    
    const backgroundStyle = {
        background: slide.background?.gradient || slide.background?.color || 'hsl(var(--background))',
    };

    return (
        <div className="fixed inset-0 bg-background z-50 flex flex-col">
            <div className="flex-grow relative" key={animationKey}>
                 <div className="w-full h-full bg-cover bg-center" style={backgroundStyle}>
                    {slide.background?.imageUrl && (
                        <Image src={slide.background.imageUrl} alt="Background" layout="fill" objectFit="cover" className="z-0" />
                    )}
                    <div className="w-full h-full relative">
                        {slide.elements.map(el => <SlideElementComponent key={el.id} element={el} isPresenting />)}
                    </div>
                </div>
            </div>
            <div className="flex-shrink-0 bg-background/80 backdrop-blur-sm p-2 flex justify-between items-center">
                <p className="text-sm text-muted-foreground">{slide.speakerNotes || "Sin notas del orador."}</p>
                <div className="flex items-center gap-2">
                    <span className="text-sm">{currentIndex + 1} / {slides.length}</span>
                    <Button variant="ghost" size="icon" onClick={handlePrev}><ChevronLeft/></Button>
                    <Button variant="ghost" size="icon" onClick={handleNext}><ChevronRight/></Button>
                    <Button variant="outline" size="sm" onClick={onExit}><X className="mr-2 h-4 w-4"/> Salir</Button>
                </div>
            </div>
        </div>
    );
}


type BackgroundBuilderProps = {
    title: string;
    imageUrl?: string;
    onImageUrlChange: (value: string) => void;
    useGradient: boolean;
    onUseGradientChange: (value: boolean) => void;
    gradientString?: string;
    onGradientChange: (value: string) => void;
    solidColor?: string;
    onSolidColorChange: (value: string) => void;
}

function BackgroundBuilder({ title, imageUrl, onImageUrlChange, useGradient, onUseGradientChange, gradientString, onGradientChange, solidColor, onSolidColorChange }: BackgroundBuilderProps) {
    const safeGradientString = gradientString || 'linear-gradient(to right, #ffffff, #000000)';
    const gradientColors = safeGradientString.match(/#(?:[0-9a-fA-F]{3,8})|rgb[a]?\([^)]+\)/g) || ['#ffffff', '#000000'];
    const gradientDirection = (safeGradientString.match(/to (right|left|bottom|top|top right|top left|bottom right|bottom left)/) || ['to right'])[0];
    
    return (
        <div className="space-y-4">
             <h3 className="font-semibold">{title}</h3>
             <div>
                <Label>URL de Imagen de Fondo</Label>
                <Input value={imageUrl || ''} onChange={(e) => onImageUrlChange(e.target.value)} placeholder="https://..."/>
            </div>
             <Separator/>
            <div className="flex items-center justify-between">
                <Label>Usar Gradiente</Label>
                <Switch checked={useGradient} onCheckedChange={onUseGradientChange}/>
            </div>
            {useGradient ? (
                <div className="space-y-2">
                    <Label>Constructor de Gradiente</Label>
                    <div className="flex gap-2">
                        <Input type="color" value={gradientColors[0]} onChange={e => onGradientChange(`linear-gradient(${gradientDirection}, ${e.target.value}, ${gradientColors[1]})`)} className="p-1 h-8"/>
                        <Input type="color" value={gradientColors[1]} onChange={e => onGradientChange(`linear-gradient(${gradientDirection}, ${gradientColors[0]}, ${e.target.value})`)} className="p-1 h-8"/>
                    </div>
                    <Select value={gradientDirection} onValueChange={dir => onGradientChange(`linear-gradient(${dir}, ${gradientColors[0]}, ${gradientColors[1]})`)}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="to right">Izquierda a Derecha</SelectItem>
                            <SelectItem value="to left">Derecha a Izquierda</SelectItem>
                            <SelectItem value="to bottom">Arriba a Abajo</SelectItem>
                            <SelectItem value="to top">Abajo a Arriba</SelectItem>
                            <SelectItem value="to bottom right">Diagonal Descendente</SelectItem>
                            <SelectItem value="to top left">Diagonal Ascendente</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            ) : (
                <div>
                    <Label>Color Sólido</Label>
                    <Input id="bg-color" type="color" value={solidColor || '#FFFFFF'} onChange={(e) => onSolidColorChange(e.target.value)} className="p-1 h-8"/>
                </div>
            )}
        </div>
    )
}

function SlideStyleEditor({ slide, onUpdateSlide }: { slide?: Slide | null, onUpdateSlide: (id: string, data: Partial<Slide> | ((s: Slide) => Slide)) => void}) {
    if (!slide) return null;
    
    const updateBackground = (prop: 'color' | 'gradient' | 'imageUrl', value: any) => {
        if (!slide) return;
        onUpdateSlide(slide.id, (s) => ({ ...s, background: { ...s.background, [prop]: value } }));
    };

    return (
        <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Palette className="w-5 h-5"/> Estilo de la Diapositiva</CardTitle></CardHeader>
            <CardContent>
                <BackgroundBuilder 
                    title="Fondo de la Diapositiva"
                    imageUrl={slide.background?.imageUrl}
                    onImageUrlChange={(val) => updateBackground('imageUrl', val)}
                    useGradient={!!slide.background?.gradient}
                    onUseGradientChange={(checked) => updateBackground('gradient', checked ? 'linear-gradient(to right, #ffffff, #000000)' : undefined)}
                    gradientString={slide.background?.gradient}
                    onGradientChange={(val) => updateBackground('gradient', val)}
                    solidColor={slide.background?.color}
                    onSolidColorChange={(val) => updateBackground('color', val)}
                />
            </CardContent>
        </Card>
    )
}

function ElementInspector({ element, onUpdateElement, onDeleteElement, onAddElement, onMoveElement }: { 
    element?: SlideElement | null, 
    onUpdateElement: (id: string, data: Partial<SlideElement> | ((el: SlideElement) => SlideElement)) => void, 
    onDeleteElement: () => void, 
    onAddElement: (type: ElementType, shape?: ShapeType) => void, 
    onMoveElement: (direction: 'up' | 'down') => void 
}) {
    
    const updateProperty = (prop: keyof SlideElement, value: any) => {
        if (!element) return;
        onUpdateElement(element.id, { [prop]: value });
    };

    const updateStyle = (prop: keyof StyleProperties, value: any) => {
        if (!element) return;
        onUpdateElement(element.id, (el) => ({ ...el, style: { ...el.style, [prop]: value } }));
    };
    
    const updateAnimation = (prop: keyof AnimationProperties, value: any) => {
        if (!element) return;
        onUpdateElement(element.id, (el) => ({ ...el, animation: { ...el.animation, [prop]: value } as AnimationProperties }));
    }

    if (!element) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Palette className="w-5 h-5"/> Inspector</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-muted-foreground">
                    <p>Selecciona un elemento para editar sus propiedades.</p>
                     <Popover>
                        <PopoverTrigger asChild>
                           <Button variant="outline" className="mt-4"><Plus className="mr-2 h-4 w-4"/> Añadir Elemento</Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 grid gap-1">
                            <Button variant="ghost" className="justify-start" onClick={() => onAddElement('text')}><Type className="mr-2 h-4 w-4"/> Texto</Button>
                            <Button variant="ghost" className="justify-start" onClick={() => onAddElement('image')}><FileImage className="mr-2 h-4 w-4"/> Imagen</Button>
                            <Button variant="ghost" className="justify-start" onClick={() => onAddElement('shape', 'rectangle')}><RectangleHorizontal className="mr-2 h-4 w-4"/> Rectángulo</Button>
                            <Button variant="ghost" className="justify-start" onClick={() => onAddElement('shape', 'circle')}><Circle className="mr-2 h-4 w-4"/> Círculo</Button>
                        </PopoverContent>
                    </Popover>
                </CardContent>
            </Card>
        )
    }

    const handleBackgroundChange = (prop: 'solidColor' | 'gradient' | 'imageUrl', value: any) => {
        switch (prop) {
            case 'solidColor': updateStyle('backgroundColor', value); break;
            case 'gradient': updateStyle('backgroundGradient', value); break;
            case 'imageUrl': updateStyle('backgroundUrl', value); break;
        }
    }
    
    const handleTextColorChange = (prop: 'solidColor' | 'gradient', value: any) => {
        switch(prop) {
            case 'solidColor': updateStyle('textColor', value); break;
            case 'gradient': updateStyle('textGradient', value); break;
        }
    }


    return (
        <Card>
            <CardHeader>
                 <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2 capitalize"><Palette className="w-5 h-5"/> {element.type}</span>
                     <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="w-4 h-4"/></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>¿Eliminar elemento?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={onDeleteElement}>Eliminar</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                 </CardTitle>
            </CardHeader>
             <CardContent className="space-y-4">
                {element.type === 'text' && (
                    <div>
                        <Label htmlFor="element-content">Contenido</Label>
                        <Textarea id="element-content" value={element.content} onChange={(e) => updateProperty('content', e.target.value)} />
                    </div>
                )}
                 {element.type === 'image' && (
                    <div>
                        <Label htmlFor="element-url">URL de Imagen</Label>
                        <Input id="element-url" value={element.url} onChange={(e) => updateProperty('url', e.target.value)} />
                    </div>
                )}
                
                <Separator/>
                <h3 className="font-semibold">Transformar</h3>
                <div className="grid grid-cols-2 gap-2">
                    <div><Label>X (%)</Label><Input type="number" value={element.x} onChange={e => updateProperty('x', +e.target.value)} /></div>
                    <div><Label>Y (%)</Label><Input type="number" value={element.y} onChange={e => updateProperty('y', +e.target.value)} /></div>
                    <div><Label>Ancho (%)</Label><Input type="number" value={element.width} onChange={e => updateProperty('width', +e.target.value)} /></div>
                    <div>
                        <Label>Alto (%)</Label>
                        <div className="flex gap-1 items-center">
                            <Input type={element.height === 'auto' ? "text" : "number"} value={element.height} onChange={e => updateProperty('height', e.target.value === 'auto' ? 'auto' : +e.target.value)} disabled={element.type !== 'text'} />
                            {element.type === 'text' && <Button size="icon" variant="ghost" onClick={() => updateProperty('height', element.height === 'auto' ? 20 : 'auto')}><ChevronsUpDown className="w-4 h-4"/></Button>}
                        </div>
                    </div>
                </div>
                 <div><Label>Rotación (°)</Label><Input type="number" value={element.rotation} onChange={e => updateProperty('rotation', +e.target.value)} /></div>

                <Separator/>
                <h3 className="font-semibold">Estilo</h3>
                
                 {element.type === 'shape' && (
                     <div className="space-y-2">
                         <div className="flex items-center justify-between">
                            <Label htmlFor="is-outline" className="flex items-center gap-2">
                                <MinusSquare className="w-4 h-4"/> Solo Contorno
                            </Label>
                            <Switch id="is-outline" checked={!!element.style.isOutline} onCheckedChange={v => updateStyle('isOutline', v)} />
                         </div>
                         {element.style.isOutline && (
                            <div>
                                <Label>Color del Contorno</Label>
                                <Input type="color" value={element.style.outlineColor || '#000000'} onChange={e => updateStyle('outlineColor', e.target.value)} className="p-1 h-8"/>
                            </div>
                         )}
                     </div>
                 )}
                 
                {element.type === 'shape' && !element.style.isOutline && (
                     <BackgroundBuilder
                        title="Relleno de Figura"
                        imageUrl={element.style.backgroundUrl}
                        onImageUrlChange={(val) => handleBackgroundChange('imageUrl', val)}
                        useGradient={!!element.style.backgroundGradient}
                        onUseGradientChange={(checked) => handleBackgroundChange('gradient', checked ? 'linear-gradient(to right, #cccccc, #333333)' : undefined)}
                        gradientString={element.style.backgroundGradient}
                        onGradientChange={(val) => handleBackgroundChange('gradient', val)}
                        solidColor={element.style.backgroundColor}
                        onSolidColorChange={(val) => handleBackgroundChange('solidColor', val)}
                     />
                 )}
                 

                {element.type === 'text' && (
                    <div className="space-y-4">
                        <BackgroundBuilder
                            title="Color de Texto"
                            imageUrl={undefined} // Not applicable for text
                            onImageUrlChange={() => {}}
                            useGradient={!!element.style.textGradient}
                            onUseGradientChange={(checked) => handleTextColorChange('gradient', checked ? 'linear-gradient(to right, #000000, #FFFFFF)' : undefined)}
                            gradientString={element.style.textGradient}
                            onGradientChange={(val) => handleTextColorChange('gradient', val)}
                            solidColor={element.style.textColor}
                            onSolidColorChange={(val) => handleTextColorChange('solidColor', val)}
                         />
                         <div><Label>Tamaño Fuente (px)</Label><Input type="number" value={element.style.fontSize || 16} onChange={e => updateStyle('fontSize', +e.target.value)} /></div>
                    </div>
                )}
                

                 <div>
                    <Label>Opacidad ({element.style.opacity ?? 1})</Label>
                    <Slider value={[element.style.opacity ?? 1]} onValueChange={v => updateStyle('opacity', v[0])} min={0} max={1} step={0.1}/>
                 </div>
                 
                 <Separator/>
                 <h3 className="font-semibold flex items-center gap-2"><Film className="w-4 h-4"/> Animación</h3>
                 <Select value={element.animation?.type || 'none'} onValueChange={v => updateAnimation('type', v)}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Sin Animación</SelectItem>
                        <SelectItem value="fadeIn">Aparecer (Fade In)</SelectItem>
                        <SelectItem value="slideInUp">Deslizar desde Abajo</SelectItem>
                        <SelectItem value="slideInDown">Deslizar desde Arriba</SelectItem>
                        <SelectItem value="slideInLeft">Deslizar desde Izquierda</SelectItem>
                        <SelectItem value="slideInRight">Deslizar desde Derecha</SelectItem>
                        <SelectItem value="zoomIn">Acercar (Zoom In)</SelectItem>
                    </SelectContent>
                 </Select>
                  <div className="grid grid-cols-2 gap-2">
                     <div><Label>Retardo (ms)</Label><Input type="number" value={element.animation?.delay || 0} onChange={e => updateAnimation('delay', +e.target.value)} /></div>
                     <div><Label>Duración (ms)</Label><Input type="number" value={element.animation?.duration || 500} onChange={e => updateAnimation('duration', +e.target.value)} /></div>
                 </div>


                 <Separator/>
                <h3 className="font-semibold">Capas</h3>
                 <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => onMoveElement('down')}><ArrowDown className="mr-2 h-4 w-4"/> Enviar Atrás</Button>
                    <Button variant="outline" onClick={() => onMoveElement('up')}><ArrowUp className="mr-2 h-4 w-4"/> Traer Adelante</Button>
                 </div>
             </CardContent>
        </Card>
    );
}
