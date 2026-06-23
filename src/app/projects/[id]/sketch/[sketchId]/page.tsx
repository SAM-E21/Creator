
'use client';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trash2, Undo, Redo, Eraser, Pen, RectangleHorizontal, Type, Circle, ArrowRight, Minus, Save, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import type { Sketch } from '@/types';
import { getSketchById, updateSketch } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';

type Tool = 'pen' | 'eraser' | 'line' | 'rectangle' | 'circle' | 'arrow' | 'text';
type TextState = {
  x: number;
  y: number;
  value: string;
  isEditing: true;
} | null;

export default function SketchCanvasPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#FFFFFF');
  const [lineWidth, setLineWidth] = useState(5);
  const [tool, setTool] = useState<Tool>('pen');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [textState, setTextState] = useState<TextState>(null);
  const [sketch, setSketch] = useState<Sketch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const snapshotRef = useRef<ImageData | null>(null);
  
  const params = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const projectId = params.id as string;
  const sketchId = params.sketchId as string;


  const colors = ['#FFFFFF', '#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899', '#111827'];
  const CANVAS_BG_COLOR = '#182131';

  const getContext = useCallback(() => {
      const canvas = canvasRef.current;
      return canvas ? canvas.getContext('2d', { willReadFrequently: true }) : null;
  }, []);

  const saveState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Don't save state if canvas has no size yet
    if (canvas.width === 0 || canvas.height === 0) return;
    const dataUrl = canvas.toDataURL();
    setHistory(prevHistory => {
        const newHistory = prevHistory.slice(0, historyIndex + 1);
        newHistory.push(dataUrl);
        setHistoryIndex(newHistory.length - 1);
        return newHistory;
    });
  }, [historyIndex]);
  
  const restoreState = useCallback((index: number) => {
    const canvas = canvasRef.current;
    const context = getContext();
    if (!canvas || !context || !history[index]) return;

    const image = new Image();
    image.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    };
    image.src = history[index];
  }, [getContext, history]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (canvas && container) {
        const { width, height } = container.getBoundingClientRect();
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
            restoreState(historyIndex);
        }
    }
  }, [restoreState, historyIndex]);

  useEffect(() => {
    window.addEventListener('resize', resizeCanvas);
    return () => {
        window.removeEventListener('resize', resizeCanvas);
    };
  }, [resizeCanvas]);

   useEffect(() => {
    if (user && projectId && sketchId) {
        setIsLoading(true);
        getSketchById(projectId, sketchId).then(sketchData => {
            setSketch(sketchData || null);
            setIsLoading(false);
        }).catch(() => {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar los datos del boceto.' });
            setIsLoading(false);
        });
    }
  }, [user, projectId, sketchId, toast]);

  // This effect runs ONLY when the sketch data is loaded
  useEffect(() => {
      if (isLoading || !sketch) return;

      const canvas = canvasRef.current;
      const context = getContext();
      const container = containerRef.current;

      if (!canvas || !context || !container) return;
      
      const { width, height } = container.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;
      
      if (sketch.content) {
          const image = new Image();
          image.onload = () => {
              context.drawImage(image, 0, 0);
              // Now that the image is loaded, save this as the initial state
              saveState();
          };
          image.src = sketch.content;
      } else {
          // If there's no content, create a blank canvas
          context.fillStyle = CANVAS_BG_COLOR;
          context.fillRect(0, 0, canvas.width, canvas.height);
          // And save this blank state as the initial state
          saveState();
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sketch, isLoading]); // depends on sketch and isLoading


  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      restoreState(newIndex);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      restoreState(newIndex);
    }
  };

  const setupContext = useCallback((context: CanvasRenderingContext2D) => {
    context.lineWidth = tool === 'eraser' ? lineWidth * 4 : lineWidth;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = tool === 'eraser' ? CANVAS_BG_COLOR : color;
    context.fillStyle = color;
    context.font = `${lineWidth * 5}px Inter, sans-serif`;
    context.textAlign = 'left';
    context.textBaseline = 'top';
  }, [tool, lineWidth, color]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): {x: number, y: number} => {
    const canvas = canvasRef.current;
    if (!canvas) return {x: 0, y: 0};
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const context = getContext();
    if (!context) return;
    const { x, y } = getMousePos(e);
    
    if (textState?.isEditing) {
        handleTextCommit();
    }
    
    if (tool === 'text') {
        setTextState({ x, y, value: '', isEditing: true});
        return;
    }

    setIsDrawing(true);
    setStartPoint({ x, y });
    
    if (tool === 'line' || tool === 'rectangle' || tool === 'circle' || tool === 'arrow') {
        snapshotRef.current = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
    }
    
    setupContext(context);
    context.beginPath();
    context.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || tool === 'text') return;
    const context = getContext();
    if (!context || !startPoint) return;
    const { x, y } = getMousePos(e);

    if (tool === 'pen' || tool === 'eraser') {
        context.lineTo(x, y);
        context.stroke();
    } else if (snapshotRef.current) {
        context.putImageData(snapshotRef.current, 0, 0);
        context.beginPath(); // Start new path for the shape
        setupContext(context); // Re-apply settings for shape
        if (tool === 'line') {
            context.moveTo(startPoint.x, startPoint.y);
            context.lineTo(x, y);
        } else if (tool === 'rectangle') {
            context.rect(startPoint.x, startPoint.y, x - startPoint.x, y - startPoint.y);
        } else if (tool === 'circle') {
            const radiusX = Math.abs(x - startPoint.x) / 2;
            const radiusY = Math.abs(y - startPoint.y) / 2;
            const centerX = Math.min(startPoint.x, x) + radiusX;
            const centerY = Math.min(startPoint.y, y) + radiusY;
            context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        } else if (tool === 'arrow') {
            drawArrow(context, startPoint.x, startPoint.y, x, y);
        }
        context.stroke();
    }
  };

    const drawArrow = (context: CanvasRenderingContext2D, fromx: number, fromy: number, tox: number, toy: number) => {
        const headlen = lineWidth * 3;
        const dx = tox - fromx;
        const dy = toy - fromy;
        const angle = Math.atan2(dy, dx);
        context.moveTo(fromx, fromy);
        context.lineTo(tox, toy);
        context.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
        context.moveTo(tox, toy);
        context.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
    }


  const stopDrawing = () => {
    if (!isDrawing || tool === 'text') return;
    const context = getContext();
    if (!context) return;
    
    if (tool === 'pen' || tool === 'eraser') {
        context.closePath();
    }
    
    setIsDrawing(false);
    saveState();
    setStartPoint(null);
    snapshotRef.current = null;
  };
  
  const handleTextCommit = useCallback(() => {
    if (!textState) return;
    const context = getContext();
    if (context && textState.value.trim() !== '') {
        setupContext(context);
        context.fillText(textState.value, textState.x, textState.y);
        saveState();
    }
    setTextState(null);
  }, [textState, getContext, setupContext, saveState]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!textState) return;
      setTextState({...textState, value: e.target.value});
  }

  const handleTextKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
          handleTextCommit();
      }
      if (e.key === 'Escape') {
          setTextState(null);
      }
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = getContext();
    if (canvas && context) {
      context.fillStyle = CANVAS_BG_COLOR;
      context.fillRect(0, 0, canvas.width, canvas.height);
      saveState();
    }
  };

  const handleSave = async () => {
    if (!canvasRef.current || isSaving) return;
    setIsSaving(true);
    const dataUrl = canvasRef.current.toDataURL('image/png');
    try {
        await updateSketch(projectId, sketchId, { content: dataUrl });
        toast({ title: '¡Boceto Guardado!', description: 'Tus cambios han sido guardados.' });
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el boceto.' });
    } finally {
        setIsSaving(false);
    }
  }
  
  const StrokeWidthIcon = ({ width }: { width: number }) => {
    const height = (width / 20) * 16 + 4; // Scale from 4px to 20px
    return (
        <div className="flex justify-center items-center w-6 h-6">
            <div className="bg-foreground rounded-full" style={{ width: `${height}px`, height: `${height}px`}} />
        </div>
    )
  }
  
  if (isLoading) {
    return (
        <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-200px)]">
      <Card className="w-full p-2 bg-card/50 shrink-0">
        <div className="flex justify-between items-center gap-1 md:gap-2 flex-wrap">
            <div className="flex items-center gap-1 md:gap-2">
                <Button variant={tool === 'pen' ? 'secondary' : 'outline'} size="icon" onClick={() => setTool('pen')} title="Lápiz"><Pen className="w-5 h-5"/></Button>
                <Button variant={tool === 'eraser' ? 'secondary' : 'outline'} size="icon" onClick={() => setTool('eraser')} title="Borrador"><Eraser className="w-5 h-5"/></Button>

                <Separator orientation="vertical" className="h-8 mx-1 md:mx-2" />
                
                <Button variant={tool === 'line' ? 'secondary' : 'outline'} size="icon" onClick={() => setTool('line')} title="Línea"><Minus className="w-5 h-5"/></Button>
                <Button variant={tool === 'rectangle' ? 'secondary' : 'outline'} size="icon" onClick={() => setTool('rectangle')} title="Rectángulo"><RectangleHorizontal className="w-5 h-5"/></Button>
                <Button variant={tool === 'circle' ? 'secondary' : 'outline'} size="icon" onClick={() => setTool('circle')} title="Círculo"><Circle className="w-5 h-5"/></Button>
                <Button variant={tool === 'arrow' ? 'secondary' : 'outline'} size="icon" onClick={() => setTool('arrow')} title="Flecha"><ArrowRight className="w-5 h-5"/></Button>
                <Button variant={tool === 'text' ? 'secondary' : 'outline'} size="icon" onClick={() => setTool('text')} title="Texto"><Type className="w-5 h-5"/></Button>

                <Separator orientation="vertical" className="h-8 mx-1 md:mx-2" />
                
                <Popover>
                    <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" title="Grosor del Trazo">
                        <StrokeWidthIcon width={lineWidth} />
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-2">
                    <div className="grid gap-2">
                        <Label>Grosor</Label>
                        <Slider
                            value={[lineWidth]}
                            onValueChange={(value) => setLineWidth(value[0])}
                            min={1}
                            max={20}
                            step={1}
                        />
                    </div>
                    </PopoverContent>
                </Popover>

                <Popover>
                    <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" title="Paleta de Colores">
                        <div className="w-6 h-6 rounded-full border border-primary-foreground/50" style={{ backgroundColor: color }} />
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2">
                    <div className="grid grid-cols-5 gap-2">
                        {colors.map(c => (
                        <Button
                            key={c}
                            aria-label={`color ${c}`}
                            className={cn("w-8 h-8 rounded-full border-2", color === c ? 'border-primary' : 'border-transparent')}
                            style={{ backgroundColor: c }}
                            onClick={() => setColor(c)}
                        />
                        ))}
                    </div>
                    </PopoverContent>
                </Popover>

                <Separator orientation="vertical" className="h-8 mx-1 md:mx-2" />

                <Button variant="outline" size="icon" onClick={handleUndo} disabled={historyIndex <= 0} title="Deshacer"><Undo className="w-5 h-5"/></Button>
                <Button variant="outline" size="icon" onClick={handleRedo} disabled={historyIndex >= history.length - 1} title="Rehacer"><Redo className="w-5 h-5"/></Button>
                
                <Separator orientation="vertical" className="h-8 mx-1 md:mx-2" />

                <Button variant="destructive" size="icon" onClick={clearCanvas} title="Limpiar Lienzo"><Trash2 className="w-5 h-5"/></Button>
            </div>
            <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold hidden md:block">{sketch?.name}</h2>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Save className="mr-2 h-4 w-4" />}
                    Guardar
                </Button>
            </div>
        </div>
      </Card>
      <Card ref={containerRef} className="relative w-full flex-grow overflow-hidden rounded-lg bg-[--canvas-bg]" style={{'--canvas-bg': CANVAS_BG_COLOR} as React.CSSProperties}>
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
        {textState?.isEditing && (
            <Input
                type="text"
                value={textState.value}
                onChange={handleTextChange}
                onKeyDown={handleTextKeyDown}
                onBlur={handleTextCommit}
                autoFocus
                style={{
                    position: 'absolute',
                    left: `${textState.x}px`,
                    top: `${textState.y}px`,
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    color: 'black',
                    border: '1px solid #3B82F6',
                    padding: '2px 4px',
                    fontSize: `${lineWidth * 5}px`,
                    fontFamily: 'Inter, sans-serif',
                    width: 'auto',
                    minWidth: '100px',
                    zIndex: 10,
                }}
            />
        )}
      </Card>
    </div>
  );
}
