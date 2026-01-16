import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";

import AuthPage from "./pages/Auth";
import AdminDashboard from "./pages/admin/Dashboard";
import EventsList from "./pages/admin/EventsList";
import EventForm from "./pages/admin/EventForm";
import LessonTypesList from "./pages/admin/LessonTypesList";
import LessonTypeForm from "./pages/admin/LessonTypeForm";
import WidgetSettings from "./pages/admin/WidgetSettings";
import ScheduleWidget from "./pages/ScheduleWidget";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AuthRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  if (user) return <Navigate to="/admin" replace />;
  return <AuthPage />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/admin" replace />} />
            <Route path="/auth" element={<AuthRedirect />} />
            <Route path="/schedule-widget" element={<ScheduleWidget />} />
            
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/events" element={<ProtectedRoute><EventsList /></ProtectedRoute>} />
            <Route path="/admin/events/new" element={<ProtectedRoute><EventForm /></ProtectedRoute>} />
            <Route path="/admin/events/:id" element={<ProtectedRoute><EventForm /></ProtectedRoute>} />
            <Route path="/admin/lesson-types" element={<ProtectedRoute><LessonTypesList /></ProtectedRoute>} />
            <Route path="/admin/lesson-types/new" element={<ProtectedRoute><LessonTypeForm /></ProtectedRoute>} />
            <Route path="/admin/lesson-types/:id" element={<ProtectedRoute><LessonTypeForm /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute><WidgetSettings /></ProtectedRoute>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
