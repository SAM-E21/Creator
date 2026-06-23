
export type AnimationType = 'none' | 'fadeIn' | 'slideInUp' | 'slideInDown' | 'slideInLeft' | 'slideInRight' | 'zoomIn';

export interface AnimationProperties {
    type: AnimationType;
    delay?: number; // in ms
    duration?: number; // in ms
}


export interface StyleProperties {
    backgroundColor?: string;
    backgroundGradient?: string;
    backgroundUrl?: string; // For shapes to have an image fill
    textColor?: string;
    textGradient?: string;
    opacity?: number;
    fontSize?: number; // in pixels
    isOutline?: boolean; // For shapes
    outlineColor?: string; // For shapes
}

export type ElementType = 'text' | 'image' | 'shape';
export type ShapeType = 'rectangle' | 'circle' | 'triangle';

export interface SlideElement {
    id: string;
    type: ElementType;
    x: number; // percentage
    y: number; // percentage
    width: number; // percentage
    height: number | 'auto'; // percentage or 'auto' for text
    rotation: number; // degrees
    style: StyleProperties;
    animation?: AnimationProperties;
    // Type-specific properties
    content?: string; // for text
    url?: string; // for image
    shape?: ShapeType; // for shape
}

export interface Slide {
    id: string;
    elements: SlideElement[];
    background: {
        color?: string;
        gradient?: string;
        imageUrl?: string;
    };
    speakerNotes: string;
}


export interface Presentation {
    id?: string;
    userId: string;
    projectId?: string;
    name: string;
    prompt: string;
    slides: Slide[];
    createdAt: Date;
    updatedAt: Date;
}


export interface Project {
  id: string;
  ownerId: string;
  members: string[]; // Array of user UIDs
  shareCode?: string; // Unique code for sharing
  name: string;
  description: string;
  progress: number;
  startDate: string;
  phases: string[];
  goals: string[];
}

export interface Task {
  id?: string; // Optional because it's not present on creation
  userId: string;
  projectId: string;
  content: string;
  completed: boolean;
  subtasks: Task[];
  createdAt?: Date;
}

export interface TimelineEvent {
    id?: string;
    title: string;
    description: string;
    date: string; // Should be YYYY-MM-DD for input type="date"
    type: 'task' | 'milestone';
}

export interface LogEntry {
    id?: string;
    date: string; // format: 'YYYY-MM-DD'
    content: string;
}

export interface Sketch {
    id?: string;
    name: string;
    projectId: string;
    userId: string;
    content?: string; // a dataURL of the canvas content
    createdAt: Date;
    updatedAt: Date;
}

export interface BrainstormSession {
  id?: string;
  userId: string;
  topic: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BrainstormIdea {
    id?: string;
    text: string;
    color: string;
}


export interface MindMap {
    id?: string;
    userId: string;
    name: string;
    content?: string; // JSON representation of the mind map nodes and edges
    createdAt: Date;
    updatedAt: Date;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  position?: string;
  plan?: 'Gratuito' | 'Pro';
}

export interface ChatChannel {
  id?: string;
  name: string;
  createdAt: Date;
}

export interface ChatMessage {
  id?: string;
  text: string;
  createdAt: any; 
  userId: string;
  userName: string;
}

export interface StatDataPoint {
  label: string;
  value: number;
  color: string;
}

export interface ProjectStat {
  id?: string;
  projectId: string;
  name: string;
  description: string;
  type: 'bar' | 'line' | 'pie' | 'area' | 'radar' | 'scatter' | 'funnel' | 'treemap' | 'radialBar';
  data: StatDataPoint[];
  createdAt: Date;
  updatedAt: Date;
}

export interface KanbanTask {
    id: string;
    content: string;
    order: number;
}

export interface KanbanColumn {
    id: string;
    title: string;
    taskIds: string[];
}

export interface KanbanBoard {
    columns: {
        [key: string]: KanbanColumn;
    };
    tasks: {
        [key: string]: KanbanTask;
    };
    columnOrder: string[];
}

export interface CodiumProgram {
    id?: string;
    userId: string;
    projectId?: string;
    name: string;
    content?: string; // JSON representation of the blocks and edges
    createdAt: Date;
    updatedAt: Date;
}

// Representación de la salida del flujo de ejecución de Codium
export interface CodiumExecutionOutput {
    html: string;
    css: string;
    javascript: string;
}

export interface WebGeniusPage {
    id?: string;
    userId: string;
    projectId?: string;
    name: string;
    prompt: string;
    html: string;
    css: string;
    javascript: string;
    createdAt: Date;
    updatedAt: Date;
}

export type TableType = 'comparison' | 'contingency' | 'schedule' | 'pros-cons' | 'feature-list' | 'budget' | 'swot' | 'action-plan' | 'custom';

export interface ProjectTable {
  id?: string;
  projectId: string;
  name: string;
  description: string;
  type: TableType;
  data: { [key: number]: string[] }; // Firestore-compatible data structure
  columnWidths?: number[]; // Array of column widths
  createdAt: Date;
  updatedAt: Date;
}
