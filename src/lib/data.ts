
'use client';

import type { 
  Project, 
  Task, 
  UserProfile, 
  ProjectTable, 
  KanbanBoard, 
  ChatChannel, 
  ChatMessage, 
  BrainstormSession, 
  BrainstormIdea, 
  MindMap, 
  CodiumProgram, 
  WebGeniusPage, 
  Presentation, 
  TimelineEvent, 
  ProjectStat, 
  LogEntry, 
  Sketch 
} from '@/types';
import { db } from './firebase';
import { 
  collection, 
  getDocs, 
  getDoc,
  doc,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Timestamp,
  setDoc,
  serverTimestamp,
  arrayUnion,
  limit,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

// --- HELPERS PARA ERRORES CONTEXTUALES ---
const emitPermissionError = (path: string, operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write', data?: any) => {
  const permError = new FirestorePermissionError({
    path,
    operation,
    requestResourceData: data
  } satisfies SecurityRuleContext);
  errorEmitter.emit('permission-error', permError);
};

// --- HELPERS PARA MAPEO ---
function toProject(docSnap: any): Project {
  const data = docSnap.data();
  return { 
    id: docSnap.id, 
    ...data, 
    startDate: data.startDate ? (data.startDate instanceof Timestamp ? data.startDate.toDate().toISOString() : data.startDate) : new Date().toISOString() 
  } as Project;
}

function toProjectTable(docSnap: any): ProjectTable {
    const data = docSnap.data();
    return { 
      id: docSnap.id, 
      ...data, 
      createdAt: (data.createdAt as Timestamp)?.toDate(), 
      updatedAt: (data.updatedAt as Timestamp)?.toDate() 
    } as ProjectTable;
}

function toTask(docSnap: any): Task {
  const data = docSnap.data();
  return { 
    id: docSnap.id, 
    ...data, 
    subtasks: data.subtasks || [], 
    createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : undefined 
  } as Task;
}

// --- USER PROFILE ---
export function createUserProfile(user: User) {
  const userRef = doc(db, 'users', user.uid);
  const data: UserProfile = { 
    uid: user.uid, 
    email: user.email || '', 
    displayName: user.displayName || user.email?.split('@')[0] || 'Usuario', 
    plan: 'Gratuito' 
  };
  
  setDoc(userRef, data, { merge: true })
    .catch(async () => emitPermissionError(userRef.path, 'write', data));
}

export function getUserProfile(userId: string, onUpdate: (profile: UserProfile | null) => void, onError?: (error: any) => void): () => void {
  const userRef = doc(db, 'users', userId);
  return onSnapshot(userRef, (docSnap) => {
    if (docSnap.exists()) onUpdate(docSnap.data() as UserProfile);
    else onUpdate(null);
  }, async (error: any) => {
    emitPermissionError(userRef.path, 'get');
    if (onError) onError(error);
  });
}

export function updateUserProfile(userId: string, data: Partial<UserProfile>) {
    const userRef = doc(db, 'users', userId);
    updateDoc(userRef, data)
      .catch(async () => emitPermissionError(userRef.path, 'update', data));
}

// --- PROJECTS ---
export function getProjects(userId: string, onUpdate: (projects: Project[]) => void, onError?: (error: any) => void): () => void {
  const projectsCol = collection(db, 'projects');
  const q = query(projectsCol, where("members", "array-contains", userId));
  return onSnapshot(q, (querySnapshot) => {
    onUpdate(querySnapshot.docs.map(toProject));
  }, async (error: any) => {
    emitPermissionError(projectsCol.path, 'list');
    if (onError) onError(error);
  });
}

export async function getProjectById(id: string): Promise<Project | undefined> {
  const docRef = doc(db, 'projects', id);
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return toProject(docSnap);
  } catch (e) {
    emitPermissionError(docRef.path, 'get');
  }
  return undefined;
}

export function addProject(projectData: Omit<Project, 'id' | 'ownerId' | 'members' | 'shareCode'> & { userId: string }) {
    const projectRef = doc(collection(db, 'projects'));
    const shareCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const data = { 
        ...projectData, 
        ownerId: projectData.userId, 
        members: [projectData.userId], 
        shareCode, 
        startDate: serverTimestamp(),
        progress: 0 
    };
    setDoc(projectRef, data)
      .catch(async () => emitPermissionError(projectRef.path, 'create', data));
}

export function deleteProject(projectId: string) {
    const projectRef = doc(db, 'projects', projectId);
    deleteDoc(projectRef)
      .catch(async () => emitPermissionError(projectRef.path, 'delete'));
}

export async function joinProjectWithCode(userId: string, code: string): Promise<{success: boolean, message: string}> {
    const projectsCol = collection(db, 'projects');
    const q = query(projectsCol, where('shareCode', '==', code.toUpperCase()), limit(1));
    try {
        const snap = await getDocs(q);
        if (snap.empty) return { success: false, message: 'Código no válido.' };
        const projectDoc = snap.docs[0];
        updateDoc(projectDoc.ref, { members: arrayUnion(userId) })
          .catch(async () => emitPermissionError(projectDoc.ref.path, 'update'));
        return { success: true, message: 'Te has unido al proyecto.' };
    } catch (e) {
        return { success: false, message: 'Error al unirse.' };
    }
}

// --- TABLES ---
export function getTables(projectId: string, onUpdate: (tables: ProjectTable[]) => void, onError?: (error: any) => void): () => void {
    const tablesCol = collection(db, `projects/${projectId}/tables`);
    return onSnapshot(query(tablesCol), (snap) => {
        onUpdate(snap.docs.map(toProjectTable));
    }, async (error: any) => {
        emitPermissionError(tablesCol.path, 'list');
        if (onError) onError(error);
    });
}

export function addTable(projectId: string, tableData: Omit<ProjectTable, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>) {
    const tableRef = doc(collection(db, `projects/${projectId}/tables`));
    const data = { ...tableData, projectId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    setDoc(tableRef, data)
      .catch(async () => emitPermissionError(tableRef.path, 'create', data));
}

export async function getTableById(projectId: string, tableId: string): Promise<ProjectTable | undefined> {
    const tableRef = doc(db, `projects/${projectId}/tables`, tableId);
    try {
        const docSnap = await getDoc(tableRef);
        return docSnap.exists() ? toProjectTable(docSnap) : undefined;
    } catch (e) {
        emitPermissionError(tableRef.path, 'get');
        return undefined;
    }
}

export function updateTable(projectId: string, tableId: string, data: Partial<Omit<ProjectTable, 'id' | 'projectId'>>) {
    const tableRef = doc(db, `projects/${projectId}/tables`, tableId);
    updateDoc(tableRef, { ...data, updatedAt: serverTimestamp() })
      .catch(async () => emitPermissionError(tableRef.path, 'update', data));
}

export function deleteTable(projectId: string, tableId: string) {
    const tableRef = doc(db, `projects/${projectId}/tables`, tableId);
    deleteDoc(tableRef)
      .catch(async () => emitPermissionError(tableRef.path, 'delete'));
}

// --- TASKS ---
export function getTasksByProjectId(projectId: string, onUpdate: (tasks: Task[]) => void, onError?: (error: any) => void): () => void {
    const tasksCol = collection(db, `projects/${projectId}/tasks`);
    return onSnapshot(query(tasksCol), (snap) => {
        onUpdate(snap.docs.map(toTask));
    }, async (error: any) => {
        emitPermissionError(tasksCol.path, 'list');
        if (onError) onError(error);
    });
}

export function addTask(projectId: string, taskData: Omit<Task, 'id'>) {
  const taskRef = doc(collection(db, `projects/${projectId}/tasks`));
  const data = { ...taskData, createdAt: serverTimestamp() };
  setDoc(taskRef, data)
    .catch(async () => emitPermissionError(taskRef.path, 'create', data));
}

export function updateTask(projectId: string, taskId: string, taskData: Partial<Task>) {
  const taskRef = doc(db, `projects/${projectId}/tasks`, taskId);
  updateDoc(taskRef, taskData)
    .catch(async () => emitPermissionError(taskRef.path, 'update', taskData));
}

export function deleteTask(projectId: string, taskId: string) {
    const taskRef = doc(db, `projects/${projectId}/tasks`, taskId);
    deleteDoc(taskRef)
      .catch(async () => emitPermissionError(taskRef.path, 'delete'));
}

// --- LOGBOOK ---
export async function getLogEntry(projectId: string, date: string): Promise<LogEntry | undefined> {
    const docRef = doc(db, 'projects', projectId, 'logbook', date);
    try {
        const snap = await getDoc(docRef);
        return snap.exists() ? { id: snap.id, ...snap.data() } as LogEntry : undefined;
    } catch (e) {
        emitPermissionError(docRef.path, 'get');
        return undefined;
    }
}

export function setLogEntry(projectId: string, entry: { date: string, content: string }) {
    const docRef = doc(db, 'projects', projectId, 'logbook', entry.date);
    setDoc(docRef, entry, { merge: true })
      .catch(async () => emitPermissionError(docRef.path, 'write', entry));
}

// --- CHAT ---
export function getChatChannels(projectId: string, onUpdate: (c: ChatChannel[]) => void): () => void {
    const colRef = collection(db, 'projects', projectId, 'channels');
    return onSnapshot(query(colRef), (snap) => {
        onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatChannel)));
    }, async (error: any) => {
        emitPermissionError(colRef.path, 'list');
    });
}

export function addChatChannel(projectId: string, name: string) {
    const colRef = collection(db, 'projects', projectId, 'channels');
    const data = { name, createdAt: serverTimestamp() };
    addDoc(colRef, data)
      .catch(async () => emitPermissionError(colRef.path, 'create', data));
}

export function updateChatChannel(projectId: string, channelId: string, data: Partial<ChatChannel>) {
    const docRef = doc(db, 'projects', projectId, 'channels', channelId);
    updateDoc(docRef, data)
      .catch(async () => emitPermissionError(docRef.path, 'update', data));
}

export function getChatMessages(projectId: string, channelId: string, onUpdate: (m: ChatMessage[]) => void): () => void {
    const colRef = collection(db, 'projects', projectId, 'channels', channelId, 'messages');
    return onSnapshot(query(colRef), (snap) => {
        onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate() } as ChatMessage)));
    }, async (error: any) => {
        emitPermissionError(colRef.path, 'list');
    });
}

export function addChatMessage(projectId: string, channelId: string, message: Omit<ChatMessage, 'id'>) {
    const colRef = collection(db, 'projects', projectId, 'channels', channelId, 'messages');
    const data = { ...message, createdAt: serverTimestamp() };
    addDoc(colRef, data)
      .catch(async () => emitPermissionError(colRef.path, 'create', data));
}

// --- ALTER MIA ---
export function getAlterMIAChatHistory(projectId: string, onUpdate: (h: any[]) => void): () => void {
    const docRef = doc(db, 'projects', projectId, 'altermia', 'history');
    return onSnapshot(docRef, (snap) => {
        onUpdate(snap.exists() ? snap.data().messages || [] : []);
    }, async (error: any) => {
        emitPermissionError(docRef.path, 'get');
    });
}

export function saveAlterMIAChatHistory(projectId: string, history: any[]) {
    const docRef = doc(db, 'projects', projectId, 'altermia', 'history');
    setDoc(docRef, { messages: history }, { merge: true })
      .catch(async () => emitPermissionError(docRef.path, 'write', { messages: history }));
}

// --- BRAINSTORMING ---
export function getBrainstormSessions(userId: string, onUpdate: (s: BrainstormSession[]) => void): () => void {
    const colRef = collection(db, 'brainstormSessions');
    return onSnapshot(query(colRef, where('userId', '==', userId)), (snap) => {
        onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data(), updatedAt: (d.data().updatedAt as Timestamp)?.toDate() } as BrainstormSession)));
    }, async (error: any) => {
        emitPermissionError(colRef.path, 'list');
    });
}

export function addBrainstormSession(userId: string, topic: string) {
    const colRef = collection(db, 'brainstormSessions');
    const data = { userId, topic, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    addDoc(colRef, data)
      .catch(async () => emitPermissionError(colRef.path, 'create', data));
}

export function deleteBrainstormSession(id: string) {
    const docRef = doc(db, 'brainstormSessions', id);
    deleteDoc(docRef)
      .catch(async () => emitPermissionError(docRef.path, 'delete'));
}

export async function getBrainstormSessionById(id: string): Promise<BrainstormSession | undefined> {
    const docRef = doc(db, 'brainstormSessions', id);
    try {
        const snap = await getDoc(docRef);
        return snap.exists() ? { id: snap.id, ...snap.data() } as BrainstormSession : undefined;
    } catch (e) {
        emitPermissionError(docRef.path, 'get');
        return undefined;
    }
}

export function getBrainstormIdeas(sessionId: string, onUpdate: (ideas: BrainstormIdea[]) => void): () => void {
    const colRef = collection(db, 'brainstormSessions', sessionId, 'ideas');
    return onSnapshot(colRef, (snap) => {
        onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data() } as BrainstormIdea)));
    }, async (error: any) => {
        emitPermissionError(colRef.path, 'list');
    });
}

export function addBrainstormIdea(sessionId: string, idea: Omit<BrainstormIdea, 'id'>) {
    const colRef = collection(db, 'brainstormSessions', sessionId, 'ideas');
    addDoc(colRef, idea)
      .then(() => {
        updateDoc(doc(db, 'brainstormSessions', sessionId), { updatedAt: serverTimestamp() });
      })
      .catch(async () => emitPermissionError(colRef.path, 'create', idea));
}

export function deleteBrainstormIdea(sessionId: string, ideaId: string) {
    const docRef = doc(db, 'brainstormSessions', sessionId, 'ideas', ideaId);
    deleteDoc(docRef)
      .catch(async () => emitPermissionError(docRef.path, 'delete'));
}

// --- MIND MAPS ---
export function getMindMaps(userId: string, onUpdate: (m: MindMap[]) => void): () => void {
    const colRef = collection(db, 'mindMaps');
    return onSnapshot(query(colRef, where('userId', '==', userId)), (snap) => {
        onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data(), updatedAt: (d.data().updatedAt as Timestamp)?.toDate() } as MindMap)));
    }, async (error: any) => {
        emitPermissionError(colRef.path, 'list');
    });
}

export function addMindMap(userId: string, name: string) {
    const colRef = collection(db, 'mindMaps');
    const data = { userId, name, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    addDoc(colRef, data)
      .catch(async () => emitPermissionError(colRef.path, 'create', data));
}

export async function getMindMapById(id: string): Promise<MindMap | undefined> {
    const docRef = doc(db, 'mindMaps', id);
    try {
        const snap = await getDoc(docRef);
        return snap.exists() ? { id: snap.id, ...snap.data() } as MindMap : undefined;
    } catch (e) {
        emitPermissionError(docRef.path, 'get');
        return undefined;
    }
}

export function updateMindMap(id: string, data: Partial<MindMap>) {
    const docRef = doc(db, 'mindMaps', id);
    updateDoc(docRef, { ...data, updatedAt: serverTimestamp() })
      .catch(async () => emitPermissionError(docRef.path, 'update', data));
}

export function deleteMindMap(id: string) {
    const docRef = doc(db, 'mindMaps', id);
    deleteDoc(docRef)
      .catch(async () => emitPermissionError(docRef.path, 'delete'));
}

// --- CODIUM ---
export function getCodiumPrograms(userId: string, onUpdate: (p: CodiumProgram[]) => void): () => void {
    const colRef = collection(db, 'codiumPrograms');
    return onSnapshot(query(colRef, where('userId', '==', userId)), (snap) => {
        onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data(), updatedAt: (d.data().updatedAt as Timestamp)?.toDate() } as CodiumProgram)));
    }, async (error: any) => {
        emitPermissionError(colRef.path, 'list');
    });
}

export function addCodiumProgram(userId: string, name: string, projectId?: string) {
    const colRef = collection(db, 'codiumPrograms');
    const data = { userId, name, projectId: projectId === 'no-project' ? null : projectId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    addDoc(colRef, data)
      .catch(async () => emitPermissionError(colRef.path, 'create', data));
}

export async function getCodiumProgramById(id: string): Promise<CodiumProgram | undefined> {
    const docRef = doc(db, 'codiumPrograms', id);
    try {
        const snap = await getDoc(docRef);
        return snap.exists() ? { id: snap.id, ...snap.data() } as CodiumProgram : undefined;
    } catch (e) {
        emitPermissionError(docRef.path, 'get');
        return undefined;
    }
}

export function updateCodiumProgram(id: string, data: Partial<CodiumProgram>) {
    const docRef = doc(db, 'codiumPrograms', id);
    updateDoc(docRef, { ...data, updatedAt: serverTimestamp() })
      .catch(async () => emitPermissionError(docRef.path, 'update', data));
}

export function deleteCodiumProgram(id: string) {
    const docRef = doc(db, 'codiumPrograms', id);
    deleteDoc(docRef)
      .catch(async () => emitPermissionError(docRef.path, 'delete'));
}

export function getCodiumProgramsByProjectId(projectId: string, onUpdate: (p: CodiumProgram[]) => void): () => void {
    const colRef = collection(db, 'codiumPrograms');
    return onSnapshot(query(colRef, where('projectId', '==', projectId)), (snap) => {
        onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data(), updatedAt: (d.data().updatedAt as Timestamp)?.toDate() } as CodiumProgram)));
    }, async (error: any) => {
        emitPermissionError(colRef.path, 'list');
    });
}

// --- PELIX FLOW (WEB GENIUS) ---
export function getWebGeniusPages(userId: string, onUpdate: (p: WebGeniusPage[]) => void): () => void {
    const colRef = collection(db, 'webGeniusPages');
    return onSnapshot(query(colRef, where('userId', '==', userId)), (snap) => {
        onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data(), updatedAt: (d.data().updatedAt as Timestamp)?.toDate() } as WebGeniusPage)));
    }, async (error: any) => {
        emitPermissionError(colRef.path, 'list');
    });
}

export function addWebGeniusPage(userId: string, data: any) {
    const colRef = collection(db, 'webGeniusPages');
    const fullData = { ...data, userId, projectId: data.projectId === 'no-project' ? null : data.projectId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    addDoc(colRef, fullData)
      .catch(async () => emitPermissionError(colRef.path, 'create', fullData));
}

export async function getWebGeniusPageById(id: string): Promise<WebGeniusPage | undefined> {
    const docRef = doc(db, 'webGeniusPages', id);
    try {
        const snap = await getDoc(docRef);
        return snap.exists() ? { id: snap.id, ...snap.data() } as WebGeniusPage : undefined;
    } catch (e) {
        emitPermissionError(docRef.path, 'get');
        return undefined;
    }
}

export function updateWebGeniusPage(id: string, data: Partial<WebGeniusPage>) {
    const docRef = doc(db, 'webGeniusPages', id);
    updateDoc(docRef, { ...data, updatedAt: serverTimestamp() })
      .catch(async () => emitPermissionError(docRef.path, 'update', data));
}

export function deleteWebGeniusPage(id: string) {
    const docRef = doc(db, 'webGeniusPages', id);
    deleteDoc(docRef)
      .catch(async () => emitPermissionError(docRef.path, 'delete'));
}

export function getWebGeniusPagesByProjectId(projectId: string, onUpdate: (p: WebGeniusPage[]) => void): () => void {
    const colRef = collection(db, 'webGeniusPages');
    return onSnapshot(query(colRef, where('projectId', '==', projectId)), (snap) => {
        onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data(), updatedAt: (d.data().updatedAt as Timestamp)?.toDate() } as WebGeniusPage)));
    }, async (error: any) => {
        emitPermissionError(colRef.path, 'list');
    });
}

// --- PRESENTATIONS ---
export function getPresentationsByProjectId(projectId: string, onUpdate: (p: Presentation[]) => void): () => void {
    const colRef = collection(db, 'presentations');
    return onSnapshot(query(colRef, where('projectId', '==', projectId)), (snap) => {
        onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data(), updatedAt: (d.data().updatedAt as Timestamp)?.toDate() } as Presentation)));
    }, async (error: any) => {
        emitPermissionError(colRef.path, 'list');
    });
}

export async function getPresentationById(id: string): Promise<Presentation | undefined> {
    const docRef = doc(db, 'presentations', id);
    try {
        const snap = await getDoc(docRef);
        return snap.exists() ? { id: snap.id, ...snap.data() } as Presentation : undefined;
    } catch (e) {
        emitPermissionError(docRef.path, 'get');
        return undefined;
    }
}

export function addPresentation(userId: string, data: any) {
    const colRef = collection(db, 'presentations');
    const fullData = { ...data, userId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    addDoc(colRef, fullData)
      .catch(async () => emitPermissionError(colRef.path, 'create', fullData));
}

export function updatePresentation(id: string, data: Partial<Presentation>) {
    const docRef = doc(db, 'presentations', id);
    updateDoc(docRef, { ...data, updatedAt: serverTimestamp() })
      .catch(async () => emitPermissionError(docRef.path, 'update', data));
}

export function deletePresentation(id: string) {
    const docRef = doc(db, 'presentations', id);
    deleteDoc(docRef)
      .catch(async () => emitPermissionError(docRef.path, 'delete'));
}

// --- STATS ---
export function getStats(projectId: string, onUpdate: (s: ProjectStat[]) => void): () => void {
    const colRef = collection(db, `projects/${projectId}/stats`);
    return onSnapshot(query(colRef), (snap) => {
        onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProjectStat)));
    }, async (error: any) => {
        emitPermissionError(colRef.path, 'list');
    });
}

export function addStat(projectId: string, stat: Omit<ProjectStat, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>) {
    const colRef = collection(db, `projects/${projectId}/stats`);
    const data = { ...stat, projectId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    addDoc(colRef, data)
      .catch(async () => emitPermissionError(colRef.path, 'create', data));
}

export async function getStatById(projectId: string, statId: string): Promise<ProjectStat | undefined> {
    const docRef = doc(db, `projects/${projectId}/stats`, statId);
    try {
        const snap = await getDoc(docRef);
        return snap.exists() ? { id: snap.id, ...snap.data() } as ProjectStat : undefined;
    } catch (e) {
        emitPermissionError(docRef.path, 'get');
        return undefined;
    }
}

export function updateStat(projectId: string, statId: string, data: Partial<ProjectStat>) {
    const docRef = doc(db, `projects/${projectId}/stats`, statId);
    updateDoc(docRef, { ...data, updatedAt: serverTimestamp() })
      .catch(async () => emitPermissionError(docRef.path, 'update', data));
}

export function deleteStat(projectId: string, statId: string) {
    const docRef = doc(db, `projects/${projectId}/stats`, statId);
    deleteDoc(docRef)
      .catch(async () => emitPermissionError(docRef.path, 'delete'));
}

// --- TIMELINE ---
export function getTimelineEvents(projectId: string, onUpdate: (e: TimelineEvent[]) => void): () => void {
    const colRef = collection(db, `projects/${projectId}/timeline`);
    return onSnapshot(query(colRef), (snap) => {
        onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data() } as TimelineEvent)));
    }, async (error: any) => {
        emitPermissionError(colRef.path, 'list');
    });
}

export function addTimelineEvent(projectId: string, event: Omit<TimelineEvent, 'id'>) {
    const colRef = collection(db, `projects/${projectId}/timeline`);
    addDoc(colRef, event)
      .catch(async () => emitPermissionError(colRef.path, 'create', event));
}

export function updateTimelineEvent(projectId: string, eventId: string, data: Partial<TimelineEvent>) {
    const docRef = doc(db, 'projects', projectId, 'timeline', eventId);
    updateDoc(docRef, data)
      .catch(async () => emitPermissionError(docRef.path, 'update', data));
}

export function deleteTimelineEvent(projectId: string, eventId: string) {
    const docRef = doc(db, 'projects', projectId, 'timeline', eventId);
    deleteDoc(docRef)
      .catch(async () => emitPermissionError(docRef.path, 'delete'));
}

// --- KANBAN ---
export function getKanbanBoard(projectId: string, onUpdate: (b: KanbanBoard | null) => void): () => void {
    const docRef = doc(db, 'projects', projectId, 'kanban', 'board');
    return onSnapshot(docRef, (snap) => {
        if (snap.exists()) onUpdate(snap.data() as KanbanBoard);
        else {
            const defaultBoard: KanbanBoard = {
                columns: {
                    'todo': { id: 'todo', title: 'Por Hacer', taskIds: [] },
                    'doing': { id: 'doing', title: 'En Proceso', taskIds: [] },
                    'done': { id: 'done', title: 'Terminado', taskIds: [] },
                },
                tasks: {},
                columnOrder: ['todo', 'doing', 'done'],
            };
            setDoc(docRef, defaultBoard).catch(async (error: any) => emitPermissionError(docRef.path, 'write', defaultBoard));
            onUpdate(defaultBoard);
        }
    }, async (error: any) => {
        emitPermissionError(docRef.path, 'get');
    });
}

export function updateKanbanBoard(projectId: string, board: KanbanBoard) {
    const docRef = doc(db, 'projects', projectId, 'kanban', 'board');
    setDoc(docRef, board)
      .catch(async () => emitPermissionError(docRef.path, 'write', board));
}

// --- SKETCHES ---
export function getSketches(projectId: string, onUpdate: (s: Sketch[]) => void): () => void {
    const colRef = collection(db, `projects/${projectId}/sketches`);
    return onSnapshot(query(colRef), (snap) => {
        onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data(), updatedAt: (d.data().updatedAt as Timestamp)?.toDate() } as Sketch)));
    }, async (error: any) => {
        emitPermissionError(colRef.path, 'list');
    });
}

export async function getSketchById(projectId: string, sketchId: string): Promise<Sketch | undefined> {
    const docRef = doc(db, `projects/${projectId}/sketches`, sketchId);
    try {
        const snap = await getDoc(docRef);
        return snap.exists() ? { id: snap.id, ...snap.data() } as Sketch : undefined;
    } catch (e) {
        emitPermissionError(docRef.path, 'get');
        return undefined;
    }
}

export function addSketch(projectId: string, userId: string, name: string) {
    const colRef = collection(db, `projects/${projectId}/sketches`);
    const data = { name, userId, projectId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    addDoc(colRef, data)
      .catch(async () => emitPermissionError(colRef.path, 'create', data));
}

export function updateSketch(projectId: string, sketchId: string, data: Partial<Sketch>) {
    const docRef = doc(db, `projects/${projectId}/sketches`, sketchId);
    updateDoc(docRef, { ...data, updatedAt: serverTimestamp() })
      .catch(async () => emitPermissionError(docRef.path, 'update', data));
}

export function deleteSketch(projectId: string, sketchId: string) {
    const docRef = doc(db, `projects/${projectId}/sketches`, sketchId);
    deleteDoc(docRef)
      .catch(async () => emitPermissionError(docRef.path, 'delete'));
}

// --- PROJECT NOTES ---
export async function getProjectNotes(projectId: string): Promise<string> {
    const docRef = doc(db, 'projects', projectId, 'notes', 'content');
    try {
      const snap = await getDoc(docRef);
      return snap.exists() ? snap.data().text || '' : '';
    } catch (error: any) {
      emitPermissionError(docRef.path, 'get');
      return '';
    }
}

export function saveProjectNotes(projectId: string, text: string) {
    const docRef = doc(db, 'projects', projectId, 'notes', 'content');
    setDoc(docRef, { text }, { merge: true })
      .catch(async () => emitPermissionError(docRef.path, 'write', { text }));
}
