import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";

import AuthPage from "./pages/Auth";
import AdminDashboard from "./pages/admin/Dashboard";
import EventsList from "./pages/admin/EventsList";
import EventForm from "./pages/admin/EventForm";
import LessonTypesList from "./pages/admin/LessonTypesList";
import LessonTypeForm from "./pages/admin/LessonTypeForm";
import WidgetSettings from "./pages/admin/WidgetSettings";
import InvitesList from "./pages/admin/InvitesList";
import UsersList from "./pages/admin/UsersList";
import ScheduleWidget from "./pages/ScheduleWidget";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function AuthRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  if (user) return <Navigate to="/admin" replace />;
  return <AuthPage />;
}

// Only mount AuthProvider for auth/admin routes. The public /widget route must
// never hit AuthProvider's session bootstrap — it can hang in third-party
// iframe contexts (Tilda) where storage/locks behave differently.
function AuthGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const needsAuth = pathname === "/auth" || pathname.startsWith("/admin");
  if (!needsAuth) return <>{children}</>;
  return <AuthProvider>{children}</AuthProvider>;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthGate>
            <Routes>
              <Route path="/" element={<Navigate to="/widget" replace />} />
              <Route
                path="/widget"
                element={
                  <ErrorBoundary>
                    <ScheduleWidget />
                  </ErrorBoundary>
                }
              />
              <Route path="/schedule-widget" element={<Navigate to="/widget" replace />} />

              <Route path="/auth" element={<AuthRedirect />} />

              <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/events" element={<ProtectedRoute><EventsList /></ProtectedRoute>} />
              <Route path="/admin/events/new" element={<ProtectedRoute><EventForm /></ProtectedRoute>} />
              <Route path="/admin/events/:id" element={<ProtectedRoute><EventForm /></ProtectedRoute>} />
              <Route path="/admin/lesson-types" element={<ProtectedRoute><LessonTypesList /></ProtectedRoute>} />
              <Route path="/admin/lesson-types/new" element={<ProtectedRoute><LessonTypeForm /></ProtectedRoute>} />
              <Route path="/admin/lesson-types/:id" element={<ProtectedRoute><LessonTypeForm /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute><WidgetSettings /></ProtectedRoute>} />
              <Route path="/admin/invites" element={<ProtectedRoute><AdminRoute><InvitesList /></AdminRoute></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute><AdminRoute><UsersList /></AdminRoute></ProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthGate>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
