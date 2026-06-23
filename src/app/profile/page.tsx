
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, ExternalLink } from 'lucide-react';
import { updateUserProfile } from '@/lib/data';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, userProfile, loading } = useAuth();
  const { toast } = useToast();
  
  const [displayName, setDisplayName] = useState('');
  const [position, setPosition] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setPosition(userProfile.position || '');
    }
  }, [userProfile]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await updateUserProfile(user.uid, { displayName, position });
      toast({
        title: 'Perfil Actualizado',
        description: 'Tu perfil ha sido actualizado exitosamente.',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar el perfil.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !userProfile) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Tu Perfil</h1>
        <p className="text-muted-foreground">
          Personaliza tu información personal y gestiona tu plan.
        </p>
      </div>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Detalles del Perfil</CardTitle>
          <CardDescription>
            Esta información se mostrará a otros usuarios en tus proyectos.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="email">Correo Electrónico</Label>
            <Input id="email" type="email" value={userProfile.email} disabled />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="displayName">Nombre a Mostrar</Label>
            <Input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ej. Juan Pérez"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="position">Puesto (Opcional)</Label>
            <Input
              id="position"
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Ej. Gerente de Producto, Desarrollador Principal"
            />
          </div>
          <div className="grid gap-2">
            <Label>Plan Actual</Label>
            <div className="flex items-center justify-between rounded-lg border bg-muted px-4 py-2">
                <span className="font-semibold text-primary">{userProfile.plan || 'Gratuito'}</span>
                 <Button variant="link" asChild>
                    <Link href="/pricing">
                        Ver Planes
                        <ExternalLink className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </div>
          </div>
        </CardContent>
        <div className="flex justify-end p-6 pt-0">
            <Button onClick={handleSaveProfile} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar Cambios
            </Button>
        </div>
      </Card>
    </div>
  );
}
