'use client';
/**
 * @fileOverview Componente que escucha errores de permisos de Firestore y los lanza para el overlay de desarrollo.
 */

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export function FirebaseErrorListener() {
  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      // En desarrollo, lanzamos el error para que Next.js muestre el overlay con el contexto
      console.group('🔥 Firestore Permission Denied');
      console.error('Path:', error.context.path);
      console.error('Operation:', error.context.operation);
      if (error.context.requestResourceData) {
        console.error('Data:', error.context.requestResourceData);
      }
      console.groupEnd();
      
      throw error;
    };

    errorEmitter.on('permission-error', handlePermissionError);
    return () => errorEmitter.off('permission-error', handlePermissionError);
  }, []);

  return null;
}
