import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ChatBot } from "@/components/ChatBot";
import NotFound from "@/pages/not-found";
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage, RegisterPage } from "@/pages/AuthPages";
import { CandidateDashboard } from "@/pages/CandidateDashboard";
import { RecruiterDashboard } from "@/pages/RecruiterDashboard";
import { AdminDashboard } from "@/pages/AdminDashboard";
import { JobSearchPage } from "@/pages/JobSearchPage";
import { SavedJobsPage } from "@/pages/SavedJobsPage";
import { CVBuilderPage } from "@/pages/CVBuilderPage";
import { InterviewPrepPage } from "@/pages/InterviewPrepPage";
import { SkillInsightsPage } from "@/pages/SkillInsightsPage";
import CandidateProfileEdit from "@/pages/CandidateProfileEdit";

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/help" component={LandingPage} />

      {/* Candidate Routes - Protected */}
      <Route path="/candidate">
        {() => (
          <ProtectedRoute requiredRole="candidate">
            <CandidateDashboard />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/candidate/jobs">
        {() => (
          <ProtectedRoute requiredRole="candidate">
            <JobSearchPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/candidate/saved-jobs">
        {() => (
          <ProtectedRoute requiredRole="candidate">
            <SavedJobsPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/candidate/applications">
        {() => (
          <ProtectedRoute requiredRole="candidate">
            <CandidateDashboard />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/candidate/cv">
        {() => (
          <ProtectedRoute requiredRole="candidate">
            <CVBuilderPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/candidate/availability">
        {() => (
          <ProtectedRoute requiredRole="candidate">
            <CandidateDashboard />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/candidate/ai-match">
        {() => (
          <ProtectedRoute requiredRole="candidate">
            <JobSearchPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/candidate/interview-prep">
        {() => (
          <ProtectedRoute requiredRole="candidate">
            <InterviewPrepPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/candidate/skills">
        {() => (
          <ProtectedRoute requiredRole="candidate">
            <SkillInsightsPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/candidate/profile">
        {() => (
          <ProtectedRoute requiredRole="candidate">
            <CandidateProfileEdit />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/candidate/settings">
        {() => (
          <ProtectedRoute requiredRole="candidate">
            <CandidateDashboard />
          </ProtectedRoute>
        )}
      </Route>

      {/* Recruiter Routes - Protected */}
      <Route path="/recruiter">
        {() => (
          <ProtectedRoute requiredRole="recruiter">
            <RecruiterDashboard />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/recruiter/post-job">
        {() => (
          <ProtectedRoute requiredRole="recruiter">
            <RecruiterDashboard />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/recruiter/jobs">
        {() => (
          <ProtectedRoute requiredRole="recruiter">
            <RecruiterDashboard />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/recruiter/candidates">
        {() => (
          <ProtectedRoute requiredRole="recruiter">
            <RecruiterDashboard />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/recruiter/applications">
        {() => (
          <ProtectedRoute requiredRole="recruiter">
            <RecruiterDashboard />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/recruiter/ai-screening">
        {() => (
          <ProtectedRoute requiredRole="recruiter">
            <RecruiterDashboard />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/recruiter/questions">
        {() => (
          <ProtectedRoute requiredRole="recruiter">
            <InterviewPrepPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/recruiter/profile">
        {() => (
          <ProtectedRoute requiredRole="recruiter">
            <RecruiterDashboard />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/recruiter/settings">
        {() => (
          <ProtectedRoute requiredRole="recruiter">
            <RecruiterDashboard />
          </ProtectedRoute>
        )}
      </Route>

      {/* Admin Routes - Protected */}
      <Route path="/admin">
        {() => (
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/admin/users">
        {() => (
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/admin/companies">
        {() => (
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/admin/jobs">
        {() => (
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/admin/analytics">
        {() => (
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/admin/system">
        {() => (
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/admin/profile">
        {() => (
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/admin/settings">
        {() => (
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        )}
      </Route>

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const [location] = useLocation();

  // Don't show ChatBot on login/register pages
  const showChatBot = !["/login", "/register"].includes(location);

  return (
    <>
      <Router />
      {showChatBot && <ChatBot />}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <AppContent />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
