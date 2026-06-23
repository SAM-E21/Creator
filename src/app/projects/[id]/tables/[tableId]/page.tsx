'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { getTableById, updateTable } from '@/lib/data';
import type { ProjectTable } from '@/types';
import { Loader2, ArrowLeft, Plus, Trash2, Rows, Columns } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from '@/lib/utils';

const objectToArray = (data: { [key: number]: string[] }): string[][] => {
    if (!data || Object.keys(data).length === 0) return [[]];
    const keys = Object.keys(data).map(Number).sort((a, b) => a - b);
    return keys.map(key => data[key]);
};

const arrayToObject = (data: string[][]): { [key: number]: string[] } => {
    const obj: { [key: number]: string[] } = {};
    data.forEach((row, index) => { obj[index] = row; });
    return obj;
};

export default function TablePage() {
  const [table, setTable] = useState<ProjectTable | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [data, setData] = useState<string[][]>([]);
  const [columnWidths, setColumnWidths] = useState<number[]>([]);
  const [resizingCol, setResizingCol] = useState<number | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  const params = useParams();
  const projectId = params.id as string;
  const tableId = params.tableId as string;
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user && projectId && tableId) {
      getTableById(projectId, tableId).then(tableData => {
        if (tableData) {
          setTable(tableData);
          const arr = objectToArray(tableData.data || {});
          setData(arr);
          setColumnWidths(tableData.columnWidths || Array(arr[0]?.length || 0).fill(150));
        }
        setIsLoading(false);
      });
    }
  }, [user, projectId, tableId]);
  
  const handleSave = useCallback(async (currentData: string[][], currentWidths: number[]) => {
    if (!table || isSaving) return;
    setIsSaving(true);
    try {
        await updateTable(projectId, tableId, { 
            data: arrayToObject(currentData), 
            columnWidths: currentWidths 
        });
    } catch (e) {
        toast({ variant: "destructive", title: "Error al guardar" });
    } finally {
        setIsSaving(false);
    }
  }, [table, isSaving, projectId, tableId, toast]);

  useEffect(() => {
    if (isLoading) return; 
    const handler = setTimeout(() => handleSave(data, columnWidths), 2000);
    return () => clearTimeout(handler);
  }, [data, columnWidths, isLoading, handleSave]);

  const handleDataChange = (r: number, c: number, v: string) => {
    const newData = [...data];
    newData[r] = [...newData[r]];
    newData[r][c] = v;
    setData(newData);
  };
  
  const addRow = () => setData([...data, Array(data[0]?.length || 1).fill('')]);
  const addCol = () => {
    setData(data.map(r => [...r, '']));
    setColumnWidths([...columnWidths, 150]);
  };
  const removeRow = (ri: number) => setData(data.filter((_, i) => i !== ri));
  const removeCol = (ci: number) => {
    setData(data.map(r => r.filter((_, i) => i !== ci)));
    setColumnWidths(columnWidths.filter((_, i) => i !== ci));
  };

  const onMouseDown = (e: React.MouseEvent, index: number) => {
    setResizingCol(index);
    e.preventDefault();
  };

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (resizingCol === null) return;
    const th = tableRef.current?.querySelectorAll('th')[resizingCol];
    if (th) {
        const rect = th.getBoundingClientRect();
        const newWidth = e.clientX - rect.left;
        if (newWidth > 50) {
            setColumnWidths(prev => {
                const next = [...prev];
                next[resizingCol] = newWidth;
                return next;
            });
        }
    }
  }, [resizingCol]);

  const onMouseUp = useCallback(() => {
    setResizingCol(null);
  }, []);

  useEffect(() => {
    if (resizingCol !== null) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [resizingCol, onMouseMove, onMouseUp]);

  if (isLoading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex flex-col gap-6">
        <Button asChild variant="ghost" className="mb-2 -ml-4 w-fit"><Link href={`/projects/${projectId}/tables`}><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Link></Button>
        <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold">{table?.name}</h1>
            <p className="text-muted-foreground">{table?.description}</p>
        </div>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Editor de Tabla</CardTitle>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={addRow}><Rows className="mr-2 h-4 w-4"/> Fila</Button>
                    <Button variant="outline" size="sm" onClick={addCol}><Columns className="mr-2 h-4 w-4"/> Columna</Button>
                </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
                <Table ref={tableRef} className="border table-fixed">
                    <TableHeader>
                        <TableRow>
                            {data[0]?.map((h, ci) => (
                                <TableHead 
                                    key={ci} 
                                    style={{ width: `${columnWidths[ci]}px` }} 
                                    className="relative group p-0 min-w-[50px] border-r"
                                >
                                    <div className="flex items-center p-2 pr-4">
                                        <Input 
                                            value={h} 
                                            onChange={e => handleDataChange(0, ci, e.target.value)} 
                                            className="font-bold border-none bg-transparent h-8 focus-visible:ring-0 px-1"
                                        />
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 absolute right-2 top-1/2 -translate-y-1/2" 
                                            onClick={(e) => { e.stopPropagation(); removeCol(ci); }}
                                        >
                                            <Trash2 className="h-3 w-3 text-destructive"/>
                                        </Button>
                                    </div>
                                    <div 
                                        onMouseDown={(e) => onMouseDown(e, ci)} 
                                        className={cn(
                                            "absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/50 transition-colors z-10",
                                            resizingCol === ci ? "bg-primary w-0.5" : "bg-border"
                                        )} 
                                    />
                                </TableHead>
                            ))}
                            <TableHead className="w-10"/>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.slice(1).map((row, ri) => (
                            <TableRow key={ri}>
                                {row.map((cell, ci) => (
                                    <TableCell key={ci} className="p-0 border-r">
                                        <Input 
                                            value={cell} 
                                            onChange={e => handleDataChange(ri + 1, ci, e.target.value)} 
                                            className="border-none focus-visible:ring-1 h-10 rounded-none px-2"
                                        />
                                    </TableCell>
                                ))}
                                <TableCell className="text-right p-2">
                                    <Button variant="ghost" size="icon" onClick={() => removeRow(ri + 1)} className="h-8 w-8"><Trash2 className="h-4 w-4 text-destructive/70"/></Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}