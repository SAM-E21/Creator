import type { Metadata } from 'next';
import './globals.css';
import { AppSidebar } from '@/components/AppSidebar';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/hooks/use-auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

export const metadata: Metadata = {
  title: 'Creactor: El Kit de Herramientas para Proyectos',
  description: 'El kit de herramientas definitivo para organizar, crear y controlar cualquier tipo de proyecto.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          <FirebaseErrorListener />
          <div className="flex min-h-screen w-full bg-background">
            <AppSidebar />
            <main className="flex flex-1 flex-col p-4 md:p-6 lg:p-8">
              {children}
            </main>
          </div>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
