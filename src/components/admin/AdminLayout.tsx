import { ReactNode } from 'react';
import { AdminSidebar } from './AdminSidebar';

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  actions?: ReactNode;
}

export function AdminLayout({ children, title, actions }: AdminLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 bg-background">
        <header className="border-b bg-card px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            {actions && <div className="flex items-center gap-4">{actions}</div>}
          </div>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
