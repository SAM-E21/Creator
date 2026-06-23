
'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReactFlow, {
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  NodeChange,
  EdgeChange,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useAuth } from '@/hooks/use-auth';
import { getCodiumProgramById, updateCodiumProgram } from '@/lib/data';
import type { CodiumProgram } from '@/types';
import { Loader2, ArrowLeft, PlusCircle, Save, Waypoints, Repeat, Pilcrow, Play, Trash2, Heading1, CaseSensitive, Container, Image, MousePointerClick, SquareCode, MessageSquare, FunctionSquare, Binary, Variable, IterationCcw, Tent, Divide, Minus, Plus as PlusIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { handleExecuteCodium } from '@/app/actions';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const initialNodes: Node[] = [
    { id: '1', position: { x: 850, y: 5 }, data: { label: 'Inicio' }, type: 'input', deletable: false },
    { id: 'container-main', type: 'containerNode', position: { x: 50, y: 100 }, data: { label: 'Calculadora' } },
    { id: 'display', type: 'paragraphNode', position: { x: 75, y: 180 }, data: { label: 'Display', code: "id: 'display'" } },
    { id: 'container-keys', type: 'containerNode', position: { x: 75, y: 250 }, data: { label: 'Teclado' } },
    { id: 'js-logic', type: 'jsNode', position: { x: 550, y: 150 }, data: { label: 'Lógica de la Calculadora', code: `
let currentInput = '';
let operator = '';
let firstOperand = null;

const display = document.getElementById('display');
display.textContent = '0';

function handleNumber(num) {
    if (currentInput.length < 10) {
        currentInput += num;
        display.textContent = currentInput;
    }
}

function handleOperator(op) {
    if (currentInput === '') return;
    if (firstOperand === null) {
        firstOperand = parseFloat(currentInput);
        currentInput = '';
        operator = op;
    } else {
        handleEquals();
        operator = op;
    }
}

function handleEquals() {
    if (firstOperand === null || currentInput === '') return;
    const secondOperand = parseFloat(currentInput);
    let result = 0;
    switch (operator) {
        case '+': result = firstOperand + secondOperand; break;
        case '-': result = firstOperand - secondOperand; break;
        case '*': result = firstOperand * secondOperand; break;
        case '/': result = firstOperand / secondOperand; break;
    }
    display.textContent = result;
    firstOperand = result;
    currentInput = '';
}

function handleClear() {
    currentInput = '';
    operator = '';
    firstOperand = null;
    display.textContent = '0';
}
    `.trim() } },

    // Number Buttons
    ...Array.from({ length: 10 }).map((_, i) => ({
        id: `btn-${i}`,
        type: 'buttonNode' as const,
        position: { x: 100 + (i % 3) * 70, y: 450 + Math.floor(i / 3) * 50 },
        data: { label: `${i}`, code: `handleNumber(${i})` },
    })),
    
    // Operator Buttons
    { id: 'btn-add', type: 'buttonNode', position: { x: 310, y: 300 }, data: { label: '+', code: `handleOperator('+')` } },
    { id: 'btn-sub', type: 'buttonNode', position: { x: 310, y: 350 }, data: { label: '-', code: `handleOperator('-')` } },
    { id: 'btn-mul', type: 'buttonNode', position: { x: 310, y: 400 }, data: { label: '*', code: `handleOperator('*')` } },
    { id: 'btn-div', type: 'buttonNode', position: { x: 310, y: 450 }, data: { label: '/', code: `handleOperator('/')` } },
    
    // Control Buttons
    { id: 'btn-clear', type: 'buttonNode', position: { x: 100, y: 600 }, data: { label: 'C', code: 'handleClear()' } },
    { id: 'btn-equals', type: 'buttonNode', position: { x: 170, y: 600 }, data: { label: '=', code: 'handleEquals()' } },
];

initialNodes.find(n => n.id === 'btn-0')!.position = { x: 100, y: 600 - 50 }; // Adjust '0' position
initialNodes.find(n => n.id === 'btn-clear')!.position = { x: 240, y: 600 - 50 };
initialNodes.find(n => n.id === 'btn-equals')!.position = { x: 240, y: 600 };


const initialEdges: Edge[] = [
    { id: 'e-main', source: '1', target: 'container-main' },
    { id: 'e-logic', source: '1', target: 'js-logic' },
    { id: 'e-display', source: 'container-main', target: 'display' },
    { id: 'e-keys', source: 'container-main', target: 'container-keys' },

    // Connect all buttons to the keys container
    ...Array.from({ length: 10 }).map((_, i) => ({ id: `e-btn-${i}`, source: 'container-keys', target: `btn-${i}` })),
    { id: 'e-btn-add', source: 'container-keys', target: 'btn-add' },
    { id: 'e-btn-sub', source: 'container-keys', target: 'btn-sub' },
    { id: 'e-btn-mul', source: 'container-keys', target: 'btn-mul' },
    { id: 'e-btn-div', source: 'container-keys', target: 'btn-div' },
    { id: 'e-btn-clear', source: 'container-keys', target: 'btn-clear' },
    { id: 'e-btn-equals', source: 'container-keys', target: 'btn-equals' },
];


const nodeConfig = {
    titleNode: { label: 'Título', icon: Heading1, code: 'Mi Página Web', isCodeEditable: true },
    paragraphNode: { label: 'Párrafo', icon: Pilcrow, code: 'Este es un párrafo de texto.', isCodeEditable: true },
    buttonNode: { label: 'Botón', icon: MousePointerClick, code: 'alert("Botón presionado");', isCodeEditable: true },
    inputNode: { label: 'Campo de Entrada', icon: CaseSensitive, code: 'Escribe aquí...', isCodeEditable: true },
    imageNode: { label: 'Imagen', icon: Image, code: 'https://placehold.co/600x400', isCodeEditable: true },
    containerNode: { label: 'Contenedor', icon: Container, isCodeEditable: false },
    jsNode: { label: 'Script JS', icon: SquareCode, code: 'console.log("Hola Mundo");', isCodeEditable: true },
    conditionalNode: { label: 'Condicional (JS)', icon: Waypoints, code: 'if (true) {\n  \n}', isCodeEditable: true },
    loopNode: { label: 'Bucle (JS)', icon: Repeat, code: 'for (let i = 0; i < 5; i++) {\n  \n}', isCodeEditable: true },
    commentNode: { label: 'Comentario', icon: MessageSquare, code: 'Esto es un comentario.', isCodeEditable: true },
    variableNode: { label: 'Variable', icon: Variable, code: 'let miVar = "valor";', isCodeEditable: true },
    functionNode: { label: 'Función', icon: FunctionSquare, code: 'function miFuncion() {\n  \n}', isCodeEditable: true },
    operatorNode: { label: 'Operador', icon: Binary, code: 'a + b', isCodeEditable: true },
    tryCatchNode: { label: 'Try/Catch', icon: Tent, code: 'try {\n  \n} catch (e) {\n  \n}', isCodeEditable: true },
    returnNode: { label: 'Return', icon: IterationCcw, code: 'return valor;', isCodeEditable: true },
};


const CustomNode = ({ data, type }: { data: any, type: string }) => {
    const config = (nodeConfig as any)[type];
    if (!config) return null;
    const Icon = config.icon;
    const isCodeEditable = config.isCodeEditable !== false;

    const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (data.onCodeChange) {
            data.onCodeChange(data.id, e.target.value);
        }
    };
    
    const handleDoubleClick = () => {
        if (data.onDoubleClick && isCodeEditable) {
            data.onDoubleClick(data.id);
        }
    };

    return (
        <Card className="p-2 border-primary/50 w-56 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-2 mb-2">
                {Icon && <Icon className="w-5 h-5 text-primary" />}
                <div className="text-sm font-bold">{data.label}</div>
            </div>
            {isCodeEditable ? (
                data.isEditing ? (
                    <Textarea
                        value={data.code}
                        onChange={handleCodeChange}
                        onBlur={() => data.onEditEnd(data.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { (e.target as HTMLElement).blur() }}}
                        autoFocus
                        className="nodrag text-xs font-mono"
                        rows={data.code?.split('\n').length || 1}
                    />
                ) : (
                    <pre onDoubleClick={handleDoubleClick} className="text-xs p-2 bg-muted/50 rounded overflow-x-auto cursor-pointer"><code className="nodrag font-mono whitespace-pre-wrap">{data.code || '...'}</code></pre>
                )
            ) : <div className="text-xs p-2 text-muted-foreground">Este bloque no es editable.</div>}
            <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 !bg-primary" />
             {type === 'conditionalNode' ? (
                <>
                    <Handle type="source" position={Position.Bottom} id="yes" style={{ left: '25%' }} className="w-2.5 h-2.5 !bg-green-500">
                        <div className="absolute -bottom-5 text-xs text-green-500">Sí</div>
                    </Handle>
                    <Handle type="source" position={Position.Bottom} id="no" style={{ left: '75%' }} className="w-2.5 h-2.5 !bg-red-500">
                         <div className="absolute -bottom-5 text-xs text-red-500">No</div>
                    </Handle>
                </>
            ) : (
                <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 !bg-primary" />
            )}
        </Card>
    );
};

const nodeTypes = Object.keys(nodeConfig).reduce((acc, key) => {
    acc[key] = (props: any) => <CustomNode {...props} type={key} />;
    return acc;
}, {} as any);


function CodiumEditor() {
  const [program, setProgram] = useState<CodiumProgram | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionOutput, setExecutionOutput] = useState('');
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [lastSavedContent, setLastSavedContent] = useState('');

  const reactFlowInstance = useReactFlow();
  const commandPalettePosition = useRef({ x: 0, y: 0 });
  
  const params = useParams();
  const programId = params.id as string;
  const { user } = useAuth();
  const { toast } = useToast();
  
  const handleCodeChange = useCallback((nodeId: string, code: string) => {
      setNodes(nds => nds.map(n => {
          if (n.id === nodeId) {
              return {...n, data: {...n.data, code }};
          }
          return n;
      }))
  }, [setNodes]);

  const handleEditEnd = useCallback((nodeId: string) => {
        setNodes((nds) =>
            nds.map((n) => {
                if (n.id === nodeId) {
                    return { ...n, data: { ...n.data, isEditing: false } };
                }
                return n;
            })
        );
    }, [setNodes]);

    const handleNodeDoubleClick = useCallback((nodeId: string) => {
        setNodes((nds) =>
            nds.map((n) => ({
                ...n,
                data: { ...n.data, isEditing: n.id === nodeId },
            }))
        );
    }, [setNodes]);

   const addNodeFunctions = (nodesToAdd: Node[]): Node[] => {
    return nodesToAdd.map((node) => ({
      ...node,
      data: {
        ...node.data,
        onCodeChange: handleCodeChange,
        onDoubleClick: handleNodeDoubleClick,
        onEditEnd: handleEditEnd,
      }
    }));
  };

  const onNodesChange: OnNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );
  
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );
  
  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  useEffect(() => {
    if (user && programId) {
      getCodiumProgramById(programId).then(data => {
        if (data) {
          setProgram(data);
          let nodesToSet = initialNodes;
          let edgesToSet = initialEdges;
          
          if (data.content && data.content !== "null") {
            try {
                const parsedContent = JSON.parse(data.content);
                if (parsedContent.nodes && parsedContent.nodes.length > 0) {
                    setLastSavedContent(data.content);
                    nodesToSet = parsedContent.nodes;
                    edgesToSet = parsedContent.edges || [];
                }
            } catch(e) {
                console.error("Error parsing program content", e);
            }
          }
          
          setNodes(addNodeFunctions(nodesToSet));
          setEdges(edgesToSet);
          if (!data.content) {
            setLastSavedContent(JSON.stringify({ nodes: initialNodes, edges: initialEdges }));
          }

        }
        setIsLoading(false);
      });
    }
  }, [user, programId]);


  const handleSave = async () => {
    if (!programId) return;
    try {
      const contentToSave = {
        nodes: nodes.map(({ data, ...restNode }) => {
            const { onCodeChange, onDoubleClick, onEditEnd, ...restData } = data;
            return { data: restData, ...restNode };
        }),
        edges,
      };
      const content = JSON.stringify(contentToSave);
      await updateCodiumProgram(programId, { content });
      setLastSavedContent(content);
      toast({ title: '¡Éxito!', description: 'Tu programa ha sido guardado.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el programa.' });
    }
  };

  const handleExecute = async () => {
      setIsExecuting(true);
      setExecutionOutput('');
      const programContent = JSON.stringify({ nodes, edges });
      const result = await handleExecuteCodium(programContent);
      if (result.success) {
          const fullHtml = `
            <!DOCTYPE html>
            <html>
                <head>
                    <style>${result.css}</style>
                </head>
                <body>
                    ${result.html}
                    <script>${result.javascript}</script>
                </body>
            </html>
          `;
          setExecutionOutput(fullHtml);
          toast({ title: 'Ejecución Completada' });
      } else {
          setExecutionOutput(`<h1>Error</h1><p>${result.error}</p>`);
          toast({ variant: 'destructive', title: 'Error de Ejecución', description: result.error });
      }
      setIsExecuting(false);
  };

  const addNode = (type: string) => {
    const config = (nodeConfig as any)[`${type}`];
    if (!config) return;
    
    const position = reactFlowInstance.screenToFlowPosition(commandPalettePosition.current);
    const newNodeId = `${type}_${Date.now()}`;

    const newNode: Node = {
      id: newNodeId,
      type: `${type}`,
      position,
      data: { label: config.label, code: config.code },
    };
    setNodes(nds => addNodeFunctions([...nds, newNode]));
  };
  
  useEffect(() => {
    if (isLoading) return; 
    
    const handler = setTimeout(() => {
        const contentToSave = {
          nodes: nodes.map(({ data, ...restNode }) => {
            const { onCodeChange, onDoubleClick, onEditEnd, ...restData } = data;
            return { data: restData, ...restNode };
          }),
          edges
        };
        const content = JSON.stringify(contentToSave);
        if (content !== lastSavedContent) {
             updateCodiumProgram(programId, { content });
             setLastSavedContent(content);
        }
    }, 2000); 

    return () => {
      clearTimeout(handler);
    };
  }, [nodes, edges, programId, isLoading, lastSavedContent]);

  const onPaneContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    const pane = (event.target as Element).closest('.react-flow__pane');
    if (!pane) return;
    commandPalettePosition.current = { x: event.clientX, y: event.clientY };
    setCommandPaletteOpen(true);
  };

  const onNodesDelete = useCallback((deletedNodes: Node[]) => {
    const deletableNodes = deletedNodes.filter(n => n.deletable !== false);
    if (deletableNodes.length > 0) {
        setEdges(eds => eds.filter(edge => !deletableNodes.some(node => edge.source === node.id || edge.target === node.id)));
    }
  }, [setEdges]);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <Button asChild variant="ghost" className="mb-2 -ml-4">
            <Link href="/codium">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Todos los Programas
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{program?.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
             <Popover>
                <PopoverTrigger asChild>
                   <Button variant="outline">
                        <PlusCircle className="mr-2 h-4 w-4"/>
                        Añadir Bloque
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-64" align="end">
                     <Command>
                        <CommandInput placeholder="Buscar bloque..." />
                        <CommandList>
                            <CommandEmpty>No se encontraron bloques.</CommandEmpty>
                            <ScrollArea className="h-72">
                                <CommandGroup heading="Interfaz">
                                    {Object.entries(nodeConfig).filter(([k]) => ['titleNode', 'paragraphNode', 'buttonNode', 'inputNode', 'imageNode', 'containerNode'].includes(k)).map(([key, {label, icon: Icon}]) => (
                                        <CommandItem key={key} onSelect={() => addNode(key)} className="flex items-center gap-2">
                                            <Icon className="w-4 h-4" />
                                            <span>{label}</span>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                                <Separator />
                                <CommandGroup heading="Lógica">
                                    {Object.entries(nodeConfig).filter(([k]) => !['titleNode', 'paragraphNode', 'buttonNode', 'inputNode', 'imageNode', 'containerNode'].includes(k)).map(([key, {label, icon: Icon}]) => (
                                        <CommandItem key={key} onSelect={() => addNode(key)} className="flex items-center gap-2">
                                            <Icon className="w-4 h-4" />
                                            <span>{label}</span>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </ScrollArea>
                        </CommandList>
                    </Command>
                </PopoverContent>
             </Popover>
            <Button onClick={handleSave}> <Save className="mr-2 h-4 w-4"/>Guardar</Button>
             <Button onClick={handleExecute} disabled={isExecuting} variant="secondary">
                {isExecuting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Play className="mr-2 h-4 w-4" />}
                Ejecutar
            </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-grow">
        <div className="lg:col-span-2 w-full h-full min-h-[400px] rounded-lg border bg-card relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onPaneClick={() => handleEditEnd('')}
            onPaneContextMenu={onPaneContextMenu}
            onNodesDelete={onNodesDelete}
            nodeTypes={nodeTypes}
            fitView
            deleteKeyCode={['Backspace', 'Delete']}
          >
            <Controls />
            <Background />
          </ReactFlow>
           <Popover open={isCommandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
                <PopoverTrigger asChild>
                    <div />
                </PopoverTrigger>
                <PopoverContent 
                    className="p-0 w-64 absolute"
                    style={{ 
                        left: commandPalettePosition.current.x,
                        top: commandPalettePosition.current.y 
                    }}
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <Command>
                        <CommandInput placeholder="Añadir bloque..." />
                        <CommandList>
                            <CommandEmpty>No se encontraron bloques.</CommandEmpty>
                             <ScrollArea className="h-72">
                                {Object.entries(nodeConfig).map(([key, {label, icon: Icon}]) => (
                                    <CommandItem key={key} onSelect={() => {
                                        addNode(key);
                                        setCommandPaletteOpen(false);
                                    }} className="flex items-center gap-2">
                                        <Icon className="w-4 h-4" />
                                        <span>{label}</span>
                                    </CommandItem>
                                ))}
                            </ScrollArea>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
        <div className="lg:col-span-1">
            <Card className="h-full">
                <CardHeader>
                    <CardTitle>Vista Previa de la App</CardTitle>
                </CardHeader>
                <CardContent className="h-[calc(100%-72px)] p-0">
                    {isExecuting ? (
                         <div className="flex justify-center items-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : (
                        <iframe
                            srcDoc={executionOutput || '<div style="display:flex;justify-content:center;align-items:center;height:100%;color:grey;">Haz clic en "Ejecutar" para ver el resultado...</div>'}
                            title="Salida de la Aplicación"
                            className="w-full h-full border-0 rounded-b-md bg-white"
                            sandbox="allow-scripts"
                        />
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}


export default function CodiumProgramPage() {
    return (
        <ReactFlowProvider>
            <CodiumEditor />
        </ReactFlowProvider>
    );
}
