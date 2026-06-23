'use client';
import { useState, useEffect, useCallback } from 'react';
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
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useAuth } from '@/hooks/use-auth';
import { getMindMapById, updateMindMap } from '@/lib/data';
import type { MindMap } from '@/types';
import { Loader2, ArrowLeft, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

const initialNodes: Node[] = [
  { id: '1', position: { x: 250, y: 5 }, data: { label: 'Mi Mapa Mental' } },
];

export default function MindMapPage() {
  const [mindMap, setMindMap] = useState<MindMap | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  
  const params = useParams();
  const mindMapId = params.id as string;
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (user && mindMapId) {
      getMindMapById(mindMapId).then(data => {
        if (data) {
          setMindMap(data);
          if (data.content) {
            const { nodes: savedNodes, edges: savedEdges } = JSON.parse(data.content);
            setNodes(savedNodes || initialNodes);
            setEdges(savedEdges || []);
          } else {
            setNodes(initialNodes);
            setEdges([]);
          }
        }
        setIsLoading(false);
      });
    }
  }, [user, mindMapId]);
  
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

  const handleSave = async () => {
    if (!mindMapId) return;
    try {
      // Make sure we commit any pending edits before saving
      if (editingNodeId) {
        handleLabelChangeCommit();
      }
      const content = JSON.stringify({ nodes, edges });
      await updateMindMap(mindMapId, { content });
      toast({ title: '¡Éxito!', description: 'Tu mapa mental ha sido guardado.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el mapa mental.' });
    }
  };

  const addNode = () => {
    const newNodeId = (nodes.length + 1).toString();
    const newNode: Node = {
      id: newNodeId,
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { label: 'Nueva Idea' },
    };
    setNodes(nds => [...nds, newNode]);
  };

  const handleNodeDoubleClick = (event: React.MouseEvent, node: Node) => {
    setEditingNodeId(node.id);
    setEditingLabel(node.data.label);
  };

  const handleLabelChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEditingLabel(event.target.value);
  };
  
  const handleLabelChangeCommit = () => {
    if (!editingNodeId) return;

    setNodes(nds =>
      nds.map(node => {
        if (node.id === editingNodeId) {
          return { ...node, data: { ...node.data, label: editingLabel } };
        }
        return node;
      })
    );
    setEditingNodeId(null);
    setEditingLabel('');
  };

  useEffect(() => {
    // A simple way to auto-save is to trigger save whenever nodes or edges change.
    // We debounce this to avoid excessive writes.
    if (isLoading) return; // Don't save during initial load
    
    const handler = setTimeout(() => {
        const content = JSON.stringify({ nodes, edges });
        if (mindMap && mindMap.content !== content) {
             updateMindMap(mindMapId, { content });
        }
    }, 1000); // Debounce time in ms

    return () => {
      clearTimeout(handler);
    };
  }, [nodes, edges, mindMapId, isLoading, mindMap]);


  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-150px)]">
      <div className="flex justify-between items-center">
        <div>
          <Button asChild variant="ghost" className="mb-2 -ml-4">
            <Link href="/mind-maps">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Todos los Mapas Mentales
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{mindMap?.name}</h1>
        </div>
        <div className="flex gap-2">
            <Button onClick={addNode}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Añadir Nodo
            </Button>
            <Button onClick={handleSave}>Guardar Mapa Mental</Button>
        </div>
      </div>
      <div className="flex-grow w-full h-full rounded-lg border bg-card">
        <ReactFlow
          nodes={nodes.map(node => ({
            ...node,
            data: {
              ...node.data,
              isEditing: node.id === editingNodeId,
              label: node.id === editingNodeId ? (
                <Input
                    value={editingLabel}
                    onChange={handleLabelChange}
                    onBlur={handleLabelChangeCommit}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleLabelChangeCommit();
                        if (e.key === 'Escape') setEditingNodeId(null);
                    }}
                    autoFocus
                    className="w-40"
                />
              ) : node.data.label
            }
          }))}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDoubleClick={handleNodeDoubleClick}
          fitView
        >
          <Controls />
          <Background />
        </ReactFlow>
      </div>
    </div>
  );
}
