
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useAuth } from '@/hooks/use-auth';
import { getKanbanBoard, updateKanbanBoard } from '@/lib/data';
import type { KanbanBoard, KanbanColumn, KanbanTask } from '@/types';
import { Loader2, Plus, X, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

function KanbanTaskCard({ task, index, onUpdate, onDelete }: { task: KanbanTask, index: number, onUpdate: (content: string) => void, onDelete: () => void }) {
    const [content, setContent] = useState(task.content);
    const [isEditing, setIsEditing] = useState(false);

    const handleBlur = () => {
        if (content.trim() && content !== task.content) {
            onUpdate(content);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleBlur();
        }
        if (e.key === 'Escape') {
            setContent(task.content);
            setIsEditing(false);
        }
    };
    
    return (
        <Draggable draggableId={task.id} index={index}>
            {(provided, snapshot) => (
                <Card
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={`mb-2 bg-card/80 hover:bg-card/95 ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                >
                    <CardContent className="p-2 flex items-start group">
                        <div {...provided.dragHandleProps} className="pr-2 cursor-grab text-muted-foreground/50 hover:text-muted-foreground">
                            <GripVertical className="h-5 w-5" />
                        </div>
                        {isEditing ? (
                             <Textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                onBlur={handleBlur}
                                onKeyDown={handleKeyDown}
                                autoFocus
                                className="w-full text-sm p-1 h-auto"
                                rows={3}
                            />
                        ) : (
                            <p onClick={() => setIsEditing(true)} className="flex-grow text-sm py-1 min-h-[2.5rem]">
                                {task.content}
                            </p>
                        )}
                       <Button variant="ghost" size="icon" className="h-6 w-6 ml-2 opacity-0 group-hover:opacity-100" onClick={onDelete}>
                            <X className="h-4 w-4" />
                       </Button>
                    </CardContent>
                </Card>
            )}
        </Draggable>
    );
}

function KanbanColumnComponent({ column, tasks, onUpdateColumn, onDeleteColumn, onAddTask, onUpdateTask, onDeleteTask }: { 
    column: KanbanColumn, 
    tasks: KanbanTask[],
    onUpdateColumn: (title: string) => void,
    onDeleteColumn: () => void,
    onAddTask: () => void,
    onUpdateTask: (taskId: string, content: string) => void,
    onDeleteTask: (taskId: string, index: number) => void
}) {
    const [title, setTitle] = useState(column.title);
    const [isEditingTitle, setIsEditingTitle] = useState(false);

    const handleTitleBlur = () => {
        if (title.trim() && title !== column.title) {
            onUpdateColumn(title);
        }
        setIsEditingTitle(false);
    };

    const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleTitleBlur();
        if (e.key === 'Escape') {
            setTitle(column.title);
            setIsEditingTitle(false);
        }
    };
    
    return (
        <div className="flex flex-col w-72 bg-muted/50 rounded-lg p-2 shrink-0">
            <div className="flex justify-between items-center mb-2 p-1 group">
                {isEditingTitle ? (
                    <Input 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={handleTitleBlur}
                        onKeyDown={handleTitleKeyDown}
                        autoFocus
                        className="h-8 font-semibold"
                    />
                ) : (
                    <h2 onClick={() => setIsEditingTitle(true)} className="font-semibold text-lg cursor-pointer px-1">{column.title}</h2>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={onDeleteColumn}>
                    <X className="h-4 w-4" />
                </Button>
            </div>
            <Droppable droppableId={column.id} type="task">
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-grow min-h-[100px] transition-colors rounded-md ${snapshot.isDraggingOver ? 'bg-primary/10' : ''}`}
                    >
                        {tasks.map((task, index) => (
                            <KanbanTaskCard 
                                key={task.id} 
                                task={task} 
                                index={index} 
                                onUpdate={(content) => onUpdateTask(task.id, content)}
                                onDelete={() => onDeleteTask(task.id, index)}
                            />
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
            <Button variant="ghost" onClick={onAddTask} className="mt-2 w-full justify-start">
                <Plus className="mr-2 h-4 w-4" /> Añadir una tarea
            </Button>
        </div>
    );
}

export default function ProjectBoardPage() {
    const [board, setBoard] = useState<KanbanBoard | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newColumnName, setNewColumnName] = useState('');

    const params = useParams();
    const projectId = params.id as string;
    const { user } = useAuth();
    const { toast } = useToast();

    useEffect(() => {
        if (user && projectId) {
            const unsubscribe = getKanbanBoard(projectId, (newBoard) => {
                if(newBoard) {
                    // Basic validation to prevent crashes
                    if (!newBoard.columns || !newBoard.tasks || !newBoard.columnOrder) {
                        setError("Los datos del tablero están corruptos. Por favor, contacta a soporte.");
                        setBoard(null);
                    } else {
                        setBoard(newBoard);
                        setError(null);
                    }
                } else {
                    // Board doesn't exist or is empty, which is a valid state
                    setBoard(null); 
                }
                setIsLoading(false);
            });
            return () => unsubscribe();
        }
    }, [projectId, user]);

    const handleUpdateBoard = async (newBoardState: KanbanBoard) => {
        try {
            await updateKanbanBoard(projectId, newBoardState);
        } catch (error) {
            console.error("Error updating board:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar el tablero.' });
        }
    };

    const onDragEnd = (result: DropResult) => {
        const { destination, source, draggableId, type } = result;
        if (!destination || !board) return;

        if (destination.droppableId === source.droppableId && destination.index === source.index) {
            return;
        }
        
        if (type === 'column') {
            const newColumnOrder = Array.from(board.columnOrder);
            newColumnOrder.splice(source.index, 1);
            newColumnOrder.splice(destination.index, 0, draggableId);

            const newBoard: KanbanBoard = { ...board, columnOrder: newColumnOrder };
            setBoard(newBoard);
            handleUpdateBoard(newBoard);
            return;
        }

        const startColumn = board.columns[source.droppableId];
        const finishColumn = board.columns[destination.droppableId];

        if (startColumn === finishColumn) {
            const newTaskIds = Array.from(startColumn.taskIds);
            newTaskIds.splice(source.index, 1);
            newTaskIds.splice(destination.index, 0, draggableId);

            const newColumn = { ...startColumn, taskIds: newTaskIds };
            const newBoard: KanbanBoard = {
                ...board,
                columns: { ...board.columns, [newColumn.id]: newColumn }
            };
            setBoard(newBoard);
            handleUpdateBoard(newBoard);
        } else {
            // Moving from one list to another
            const startTaskIds = Array.from(startColumn.taskIds);
            startTaskIds.splice(source.index, 1);
            const newStartColumn = { ...startColumn, taskIds: startTaskIds };

            const finishTaskIds = Array.from(finishColumn.taskIds);
            finishTaskIds.splice(destination.index, 0, draggableId);
            const newFinishColumn = { ...finishColumn, taskIds: finishTaskIds };
            
            const newBoard: KanbanBoard = {
                ...board,
                columns: {
                    ...board.columns,
                    [newStartColumn.id]: newStartColumn,
                    [newFinishColumn.id]: newFinishColumn,
                }
            };
            setBoard(newBoard);
            handleUpdateBoard(newBoard);
        }
    };

    const handleAddColumn = () => {
        if (!newColumnName.trim() || !board) return;
        const newColumnId = `col-${Date.now()}`;
        const newColumn: KanbanColumn = {
            id: newColumnId,
            title: newColumnName.trim(),
            taskIds: [],
        };
        const newBoard: KanbanBoard = {
            ...board,
            columns: {
                ...board.columns,
                [newColumnId]: newColumn,
            },
            columnOrder: [...board.columnOrder, newColumnId]
        };
        setBoard(newBoard);
        handleUpdateBoard(newBoard);
        setNewColumnName('');
    }

    const handleUpdateColumn = (columnId: string, title: string) => {
        if (!board) return;
        const newBoard: KanbanBoard = {
            ...board,
            columns: {
                ...board.columns,
                [columnId]: { ...board.columns[columnId], title }
            }
        };
        setBoard(newBoard);
        handleUpdateBoard(newBoard);
    };

    const handleDeleteColumn = (columnId: string) => {
        if (!board) return;
        const newBoard = { ...board };
        const columnTasks = newBoard.columns[columnId].taskIds;
        // Delete tasks in the column
        columnTasks.forEach(taskId => delete newBoard.tasks[taskId]);
        // Delete the column
        delete newBoard.columns[columnId];
        // Remove from order
        newBoard.columnOrder = newBoard.columnOrder.filter(id => id !== columnId);
        
        setBoard(newBoard);
        handleUpdateBoard(newBoard);
    };

    const handleAddTask = (columnId: string) => {
        if (!board) return;
        const newTaskId = `task-${Date.now()}`;
        const newTask: KanbanTask = { id: newTaskId, content: 'Nueva Tarea', order: 0 };
        
        const newBoard: KanbanBoard = {
            ...board,
            tasks: { ...board.tasks, [newTaskId]: newTask },
            columns: {
                ...board.columns,
                [columnId]: {
                    ...board.columns[columnId],
                    taskIds: [...board.columns[columnId].taskIds, newTaskId]
                }
            }
        };
        setBoard(newBoard);
        handleUpdateBoard(newBoard);
    };

    const handleUpdateTask = (taskId: string, content: string) => {
        if (!board) return;
         const newBoard: KanbanBoard = {
            ...board,
            tasks: {
                ...board.tasks,
                [taskId]: { ...board.tasks[taskId], content }
            }
        };
        setBoard(newBoard);
        handleUpdateBoard(newBoard);
    }
    
    const handleDeleteTask = (columnId: string, taskId: string, index: number) => {
        if (!board) return;
        const newBoard = { ...board };
        // Remove from tasks object
        delete newBoard.tasks[taskId];
        // Remove from column taskIds
        const newColumn = { ...newBoard.columns[columnId] };
        newColumn.taskIds.splice(index, 1);
        newBoard.columns[columnId] = newColumn;
        
        setBoard(newBoard);
        handleUpdateBoard(newBoard);
    };

    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-full w-full items-center justify-center text-destructive">
                {error}
            </div>
        )
    }

    if (!board) {
         return (
            <div className="flex h-full w-full items-center justify-center">
                <p>El tablero Kanban para este proyecto aún no se ha creado o está vacío.</p>
            </div>
        );
    }

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="all-columns" direction="horizontal" type="column">
                {(provided) => (
                    <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="flex gap-4 items-start overflow-x-auto pb-4"
                    >
                        {board.columnOrder.map((columnId, index) => {
                            const column = board.columns[columnId];
                            if (!column) return null; // Defensive check
                            const tasks = column.taskIds.map(taskId => board.tasks[taskId]).filter(Boolean); // Filter out undefined tasks
                            
                            return (
                                <Draggable key={column.id} draggableId={column.id} index={index}>
                                    {(provided) => (
                                         <div 
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                         >
                                            <KanbanColumnComponent
                                                column={column}
                                                tasks={tasks}
                                                onUpdateColumn={(title) => handleUpdateColumn(column.id, title)}
                                                onDeleteColumn={() => handleDeleteColumn(column.id)}
                                                onAddTask={() => handleAddTask(column.id)}
                                                onUpdateTask={handleUpdateTask}
                                                onDeleteTask={(taskId, index) => handleDeleteTask(column.id, taskId, index)}
                                            />
                                         </div>
                                    )}
                                </Draggable>
                            );
                        })}
                        {provided.placeholder}
                         <div className="w-72 shrink-0 bg-muted/30 rounded-lg p-2">
                             <div className="flex gap-2">
                                <Input 
                                    placeholder="Añadir nueva columna"
                                    value={newColumnName}
                                    onChange={(e) => setNewColumnName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
                                />
                                <Button onClick={handleAddColumn}>Añadir</Button>
                             </div>
                        </div>
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    );
}
