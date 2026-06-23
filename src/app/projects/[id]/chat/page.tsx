
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { getChatMessages, addChatMessage, getChatChannels, addChatChannel, updateChatChannel, getAlterMIAChatHistory } from '@/lib/data';
import type { ChatMessage, ChatChannel } from '@/types';
import { Loader2, Send, PlusCircle, Hash, Pencil, BrainCircuit, ExternalLink, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { handleAskAlterMIA } from '@/app/actions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';

function getInitials(name: string) {
    if (!name) return '??';
    const names = name.split(' ');
    const initials = names.map(n => n[0]).join('');
    return initials.toUpperCase().slice(0, 2);
}

function AIMessages() {
    const [history, setHistory] = useState<{role: 'user' | 'model', content: string}[]>([]);
    const [query, setQuery] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    const params = useParams();
    const projectId = params.id as string;
    const { user, userProfile } = useAuth();
    const { toast } = useToast();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (projectId && user) {
            setIsLoadingHistory(true);
            const unsubscribe = getAlterMIAChatHistory(projectId, (newHistory) => {
                setHistory(newHistory);
                setIsLoadingHistory(false);
            });
            return () => unsubscribe();
        }
    }, [projectId, user]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [history]);

    const handleSendQuery = async () => {
        if (query.trim() === '' || !user || !userProfile || isSending) return;
        
        const userQuery = query;
        setQuery('');
        setIsSending(true);

        try {
            // The history state is now managed by the onSnapshot listener.
            // We just send the query and the current history to the backend.
            const result = await handleAskAlterMIA(projectId, userQuery, history);
            if(!result.success) {
                 toast({ variant: 'destructive', title: 'Error de AlterMIA', description: result.error });
            }

        } catch (error) {
            console.error("Error asking AlterMIA:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo enviar la consulta a AlterMIA.' });
        } finally {
            setIsSending(false);
        }
    };
    
    if (isLoadingHistory) {
         return (
            <div className="flex-grow flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
         <div className="flex flex-col h-full">
            <CardContent className="flex-grow overflow-y-auto p-4 flex flex-col gap-4">
                {history.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                         {msg.role === 'model' && (
                            <Avatar className="h-8 w-8 bg-primary text-primary-foreground flex items-center justify-center">
                                <BrainCircuit className="w-5 h-5"/>
                            </Avatar>
                        )}
                        <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-4 py-2 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            </div>
                             <span className="text-xs text-muted-foreground mt-1">
                                {msg.role === 'user' ? (userProfile?.displayName || 'Tú') : 'AlterMIA'}
                            </span>
                        </div>
                            {msg.role === 'user' && (
                            <Avatar className="h-8 w-8">
                                <AvatarFallback>{getInitials(userProfile?.displayName || '')}</AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                ))}
                {isSending && (
                     <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8 bg-primary text-primary-foreground flex items-center justify-center">
                            <BrainCircuit className="w-5 h-5"/>
                        </Avatar>
                        <div className="flex flex-col items-start">
                             <div className="max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-4 py-2 bg-muted flex items-center">
                                <Loader2 className="h-5 w-5 animate-spin"/>
                             </div>
                        </div>
                     </div>
                )}
                <div ref={messagesEndRef} />
            </CardContent>
            <div className="p-4 border-t flex gap-2">
                <Input
                    type="text"
                    placeholder="Pregúntale a AlterMIA sobre tu proyecto..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !isSending && handleSendQuery()}
                    disabled={isSending}
                />
                <Button onClick={handleSendQuery} disabled={isSending || !query.trim()}>
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    <span className="sr-only">Enviar</span>
                </Button>
            </div>
        </div>
    )
}


function ChatMessages({ channelId }: { channelId: string | null }) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    
    const { user, userProfile } = useAuth();
    const params = useParams();
    const projectId = params.id as string;
    const { toast } = useToast();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (projectId && user && channelId) {
            setIsLoading(true);
            const unsubscribe = getChatMessages(projectId, channelId, (newMessages) => {
                setMessages(newMessages);
                setIsLoading(false);
            });
            return () => unsubscribe();
        } else {
            setIsLoading(false);
        }
    }, [projectId, user, channelId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async () => {
        if (!channelId || newMessage.trim() === '' || !user || !userProfile || isSending) return;
        
        setIsSending(true);
        const messageData: Omit<ChatMessage, 'id'> = {
            text: newMessage.trim(),
            userId: user.uid,
            userName: userProfile.displayName || 'Anónimo',
            createdAt: new Date(),
        };

        try {
            await addChatMessage(projectId, channelId, messageData);
            setNewMessage('');
        } catch (error) {
            console.error("Error sending message:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo enviar el mensaje.' });
        } finally {
            setIsSending(false);
        }
    };
    
     if (isLoading) {
        return (
            <div className="flex-grow flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!channelId) {
        return (
            <div className="flex-grow flex items-center justify-center h-full">
                <div className="text-center text-muted-foreground">
                    <Hash className="mx-auto h-12 w-12" />
                    <p>Selecciona un canal para empezar a chatear.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <CardContent className="flex-grow overflow-y-auto p-4 flex flex-col gap-4">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex items-start gap-3 ${msg.userId === user?.uid ? 'justify-end' : ''}`}>
                        {msg.userId !== user?.uid && (
                            <Avatar className="h-8 w-8">
                                <AvatarFallback>{getInitials(msg.userName)}</AvatarFallback>
                            </Avatar>
                        )}
                        <div className={`flex flex-col ${msg.userId === user?.uid ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-4 py-2 ${msg.userId === user?.uid ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                <p className="text-sm">{msg.text}</p>
                            </div>
                            <span className="text-xs text-muted-foreground mt-1">
                                    {msg.userName} - {msg.createdAt ? format(new Date(msg.createdAt), 'p') : ''}
                            </span>
                        </div>
                            {msg.userId === user?.uid && (
                            <Avatar className="h-8 w-8">
                                <AvatarFallback>{getInitials(userProfile?.displayName || '')}</AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                ))}
                    <div ref={messagesEndRef} />
            </CardContent>
            <div className="p-4 border-t flex gap-2">
                <Input
                    type="text"
                    placeholder="Escribe un mensaje..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !isSending && handleSendMessage()}
                    disabled={isSending || isLoading}
                />
                <Button onClick={handleSendMessage} disabled={isSending || isLoading || !newMessage.trim()}>
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    <span className="sr-only">Enviar</span>
                </Button>
            </div>
        </div>
    );
}

export default function ProjectChatPage() {
    const [channels, setChannels] = useState<ChatChannel[]>([]);
    const [isLoadingChannels, setIsLoadingChannels] = useState(true);
    const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newChannelName, setNewChannelName] = useState('');
    const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
    const [editingChannelName, setEditingChannelName] = useState('');
    const [isAIChatActive, setAIChatActive] = useState(false);

    const { user, userProfile } = useAuth();
    const params = useParams();
    const projectId = params.id as string;
    const { toast } = useToast();

    const isPro = userProfile?.plan === 'Pro';

    useEffect(() => {
        if (projectId && user) {
            setIsLoadingChannels(true);
            const unsubscribe = getChatChannels(projectId, (newChannels) => {
                setChannels(newChannels);
                if (!activeChannelId && !isAIChatActive && newChannels.length > 0) {
                    setActiveChannelId(newChannels[0].id!);
                }
                setIsLoadingChannels(false);
            });
            return () => unsubscribe();
        }
    }, [projectId, user, activeChannelId, isAIChatActive]);

    const handleCreateChannel = async () => {
        if (!newChannelName.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'El nombre del canal no puede estar vacío.' });
            return;
        }
        try {
            const newChannelId = await addChatChannel(projectId, newChannelName.trim());
            setActiveChannelId(newChannelId);
            setAIChatActive(false);
            setNewChannelName('');
            setIsDialogOpen(false);
            toast({ title: 'Canal Creado', description: `Se ha creado el canal #${newChannelName.trim()}.` });
        } catch (error) {
            console.error("Error creating channel:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear el canal.' });
        }
    };

    const startEditing = (channel: ChatChannel) => {
        setEditingChannelId(channel.id!);
        setEditingChannelName(channel.name);
    }
    
    const cancelEditing = () => {
        setEditingChannelId(null);
        setEditingChannelName('');
    }

    const handleUpdateChannelName = async () => {
        if (!editingChannelId || !editingChannelName.trim()) {
            cancelEditing();
            return;
        }
        
        try {
            await updateChatChannel(projectId, editingChannelId, { name: editingChannelName.trim() });
            toast({ title: 'Canal Actualizado', description: 'El nombre del canal ha sido cambiado.'});
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar el canal.'});
        } finally {
            cancelEditing();
        }
    }

    const selectChannel = (channelId: string) => {
        setAIChatActive(false);
        setActiveChannelId(channelId);
    }
    
    const selectAIChat = () => {
        if (!isPro) return;
        setAIChatActive(true);
        setActiveChannelId(null);
    }


    return (
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] h-[calc(100vh-200px)] gap-4">
            <Card>
                <CardHeader>
                    <CardTitle>Canales</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col justify-between h-[calc(100%-80px)] p-2">
                    <div className="flex-grow space-y-1 overflow-y-auto">
                         <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={isAIChatActive ? 'secondary' : 'ghost'}
                                        className="w-full justify-start gap-2"
                                        onClick={selectAIChat}
                                        disabled={!isPro}
                                    >
                                        <BrainCircuit className="w-4 h-4" />
                                        AlterMIA
                                        {!isPro && <Lock className="w-3 h-3 ml-auto" />}
                                    </Button>
                                </TooltipTrigger>
                                {!isPro && (
                                    <TooltipContent>
                                        <p>Función Pro: Chatea con el asistente de IA.</p>
                                         <Button variant="link" size="sm" asChild className="p-0 h-auto">
                                            <Link href="/pricing">
                                                Actualizar plan <ExternalLink className="ml-1 h-3 w-3" />
                                            </Link>
                                        </Button>
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        </TooltipProvider>

                        <hr className="my-2"/>
                        {isLoadingChannels ? (
                            <div className="flex-grow flex items-center justify-center pt-4">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                        ) : (
                            channels.map(channel => (
                                <div key={channel.id} className="group flex items-center rounded-md">
                                    {editingChannelId === channel.id ? (
                                        <Input
                                            type="text"
                                            value={editingChannelName}
                                            onChange={(e) => setEditingChannelName(e.target.value)}
                                            onBlur={handleUpdateChannelName}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleUpdateChannelName();
                                                if (e.key === 'Escape') cancelEditing();
                                            }}
                                            autoFocus
                                            className="h-9 flex-1"
                                        />
                                    ) : (
                                        <>
                                            <Button
                                                variant={activeChannelId === channel.id ? 'secondary' : 'ghost'}
                                                className="w-full justify-start gap-2 flex-1"
                                                onClick={() => selectChannel(channel.id!)}
                                            >
                                                <Hash className="w-4 h-4" />
                                                <span className="truncate">{channel.name}</span>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100"
                                                onClick={() => startEditing(channel)}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                         <Button variant="outline" className="w-full mt-2">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Crear Canal
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Crear Nuevo Canal de Chat</DialogTitle>
                          <DialogDescription>
                            Los canales ayudan a organizar las conversaciones.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <Label htmlFor="channel-name">Nombre del Canal</Label>
                          <Input
                            id="channel-name"
                            value={newChannelName}
                            onChange={(e) => setNewChannelName(e.target.value)}
                            placeholder="ej. marketing, desarrollo"
                          />
                        </div>
                        <DialogFooter>
                          <Button onClick={handleCreateChannel} disabled={!newChannelName.trim()}>
                            Crear Canal
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                </CardContent>
            </Card>

            <Card className="flex flex-col">
                 <CardHeader>
                    <CardTitle className="truncate flex items-center gap-2">
                         {isAIChatActive ? (
                            <>
                                <BrainCircuit className="w-6 h-6"/>
                                AlterMIA
                            </>
                         ) : (
                            <>
                                <Hash className="w-6 h-6"/>
                                {activeChannelId ? `${channels.find(c => c.id === activeChannelId)?.name}` : 'Chat del Proyecto'}
                            </>
                         )}
                    </CardTitle>
                </CardHeader>
                {isAIChatActive ? <AIMessages /> : <ChatMessages channelId={activeChannelId} />}
            </Card>
        </div>
    );
}
