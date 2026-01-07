import { useLocation, Redirect, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Home } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "candidate" | "recruiter" | "admin" | ("candidate" | "recruiter" | "admin")[];
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const [location] = useLocation();

  // Show loading skeleton while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="space-y-4 w-full max-w-md p-6">
          <Skeleton className="w-full h-12" />
          <Skeleton className="w-full h-64" />
          <Skeleton className="w-full h-12" />
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Redirect to={`/login?redirect=${encodeURIComponent(location)}`} />;
  }

  // Check if user has the required role
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(user.role)) {
      // Show Access Denied message
      const dashboardPath = user.role === "admin" ? "/admin"
        : user.role === "recruiter" ? "/recruiter"
        : "/candidate";

      return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-destructive/10 p-3">
                  <ShieldAlert className="h-8 w-8 text-destructive" />
                </div>
              </div>
              <CardTitle className="text-2xl">Access Denied</CardTitle>
              <CardDescription>
                You don't have permission to access this page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Your role:</span> {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="font-medium">Required role:</span> {
                    Array.isArray(requiredRole)
                      ? requiredRole.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(" or ")
                      : requiredRole.charAt(0).toUpperCase() + requiredRole.slice(1)
                  }
                </p>
              </div>
              <Link href={dashboardPath}>
                <Button className="w-full" variant="default">
                  <Home className="mr-2 h-4 w-4" />
                  Go to My Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  return <>{children}</>;
}
