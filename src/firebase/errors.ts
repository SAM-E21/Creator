/**
 * @fileOverview Definiciones de errores personalizados para Firestore.
 */

export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  context: SecurityRuleContext;
  
  constructor(context: SecurityRuleContext) {
    super('Firestore Security Rules: Missing or insufficient permissions');
    this.name = 'FirestorePermissionError';
    this.context = context;
    
    // Asegurar que el stack trace sea correcto en entornos modernos
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FirestorePermissionError);
    }
  }
}
