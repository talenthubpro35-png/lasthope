import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { StatCard } from "@/components/StatCard";
import { SearchBar } from "@/components/SearchBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { admin, health } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Bell,
  Users,
  Briefcase,
  Building2,
  Activity,
  TrendingUp,
  MoreHorizontal,
  CheckCircle,
  AlertCircle,
  XCircle,
  Inbox,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AdminDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all users
  const { data: users, isLoading: isLoadingUsers, error: usersError } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    retry: false,
  });

  // Fetch platform statistics
  const { data: stats, isLoading: isLoadingStats } = useQuery<any>({
    queryKey: ["/api/admin/stats"],
    retry: false,
  });

  // Fetch database health
  const { data: dbHealth, isLoading: isLoadingHealth } = useQuery<any>({
    queryKey: ["/api/health/db"],
    retry: false,
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => admin.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      admin.updateUser(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Success",
        description: "User updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  // Calculate dashboard statistics
  const dashboardStats = useMemo(() => {
    if (!stats) return [];

    return [
      {
        title: "Total Users",
        value: stats.totalUsers || 0,
        icon: Users,
        trend: { value: stats.candidateCount || 0, isPositive: true },
      },
      {
        title: "Active Jobs",
        value: stats.activeJobs || 0,
        icon: Briefcase,
        trend: { value: stats.totalJobs || 0, isPositive: true },
      },
      {
        title: "Applications",
        value: stats.totalApplications || 0,
        icon: Building2,
        trend: { value: stats.shortlistedApplications || 0, isPositive: true },
      },
      {
        title: "Platform Health",
        value: dbHealth?.database ? "99.9%" : "Down",
        icon: Activity,
      },
    ];
  }, [stats, dbHealth]);

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchQuery) return users;

    const query = searchQuery.toLowerCase();
    return users.filter(
      (u: any) =>
        u.username?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query) ||
        u.role?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  // System status based on real data
  const systemStatus = useMemo(() => {
    return [
      {
        name: "Database",
        status: dbHealth?.database ? "operational" : "down",
      },
      {
        name: "API Server",
        status: users ? "operational" : "degraded",
      },
      {
        name: "User Management",
        status: users && users.length > 0 ? "operational" : "degraded",
      },
    ];
  }, [dbHealth, users]);

  const handleDeleteUser = (userId: string, username: string) => {
    if (confirm(`Are you sure you want to delete user "${username}"?`)) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleToggleRole = (userId: string, currentRole: string) => {
    const newRole = currentRole === "candidate" ? "recruiter" : "candidate";
    if (
      confirm(
        `Change user role from "${currentRole}" to "${newRole}"?`
      )
    ) {
      updateUserMutation.mutate({ id: userId, updates: { role: newRole } });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "operational":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "degraded":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case "down":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const isLoading = isLoadingUsers || isLoadingStats || isLoadingHealth;
  const hasError = usersError;

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar
          userRole="admin"
          userName={user?.username || "Admin"}
          onLogout={logout}
        />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 border-b p-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="hidden md:block flex-1 max-w-md">
                <SearchBar
                  placeholder="Search users, companies..."
                  onSearch={setSearchQuery}
                  showFilters={false}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" data-testid="button-notifications">
                <Bell className="h-4 w-4" />
              </Button>
              <ThemeToggle />
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-7xl mx-auto space-y-8">
              <div>
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                <p className="text-muted-foreground">Platform overview and management.</p>
              </div>

              {/* Error State */}
              {hasError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Unable to load user data. Please try refreshing the page.
                  </AlertDescription>
                </Alert>
              )}

              {/* Stats Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {isLoadingStats ? (
                  <>
                    {[...Array(4)].map((_, i) => (
                      <Card key={i}>
                        <CardHeader className="pb-2">
                          <Skeleton className="h-4 w-24" />
                        </CardHeader>
                        <CardContent>
                          <Skeleton className="h-8 w-16" />
                        </CardContent>
                      </Card>
                    ))}
                  </>
                ) : (
                  dashboardStats.map((stat) => <StatCard key={stat.title} {...stat} />)
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                      <CardTitle className="text-lg">
                        Users {filteredUsers.length > 0 && `(${filteredUsers.length})`}
                      </CardTitle>
                      <Button variant="ghost" size="sm" data-testid="button-view-all-users">
                        View All
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {isLoadingUsers ? (
                        <div className="space-y-4">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4">
                              <Skeleton className="h-10 w-full" />
                            </div>
                          ))}
                        </div>
                      ) : filteredUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
                          <CardTitle className="text-lg mb-2">No Users Found</CardTitle>
                          <CardDescription>
                            {searchQuery
                              ? "Try adjusting your search query"
                              : "No users in the system yet"}
                          </CardDescription>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Username</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead>Joined</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredUsers.slice(0, 10).map((u: any) => (
                              <TableRow key={u.id}>
                                <TableCell className="font-medium">{u.username}</TableCell>
                                <TableCell className="text-muted-foreground">
                                  {u.email || "N/A"}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      u.role === "admin"
                                        ? "destructive"
                                        : u.role === "recruiter"
                                        ? "default"
                                        : "outline"
                                    }
                                  >
                                    {u.role}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {u.createdAt
                                    ? new Date(u.createdAt).toLocaleDateString()
                                    : "N/A"}
                                </TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        disabled={
                                          updateUserMutation.isPending ||
                                          deleteUserMutation.isPending
                                        }
                                      >
                                        {(updateUserMutation.isPending ||
                                          deleteUserMutation.isPending) ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <MoreHorizontal className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {u.role !== "admin" && (
                                        <DropdownMenuItem
                                          onClick={() => handleToggleRole(u.id, u.role)}
                                        >
                                          Change to{" "}
                                          {u.role === "candidate" ? "Recruiter" : "Candidate"}
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={() => handleDeleteUser(u.id, u.username)}
                                        disabled={u.id === user?.id}
                                      >
                                        Delete User
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Analytics Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 flex items-center justify-center border rounded-lg bg-muted/30">
                        <p className="text-muted-foreground">Analytics charts will be displayed here</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        System Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {isLoadingHealth ? (
                        <>
                          {[...Array(3)].map((_, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <Skeleton className="h-4 w-24" />
                              <Skeleton className="h-4 w-20" />
                            </div>
                          ))}
                        </>
                      ) : (
                        systemStatus.map((service) => (
                          <div
                            key={service.name}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <span className="text-sm font-medium">{service.name}</span>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(service.status)}
                              <span className="text-xs text-muted-foreground capitalize">
                                {service.status}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Platform Stats</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {isLoadingStats ? (
                        <>
                          {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex justify-between">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-4 w-12" />
                            </div>
                          ))}
                        </>
                      ) : stats ? (
                        <>
                          <div className="flex justify-between items-center pb-3 border-b">
                            <span className="text-sm font-medium">Candidates</span>
                            <Badge variant="outline">{stats.candidateCount || 0}</Badge>
                          </div>
                          <div className="flex justify-between items-center pb-3 border-b">
                            <span className="text-sm font-medium">Recruiters</span>
                            <Badge variant="outline">{stats.recruiterCount || 0}</Badge>
                          </div>
                          <div className="flex justify-between items-center pb-3 border-b">
                            <span className="text-sm font-medium">Active Jobs</span>
                            <Badge variant="default">{stats.activeJobs || 0}</Badge>
                          </div>
                          <div className="flex justify-between items-center pb-3 border-b">
                            <span className="text-sm font-medium">Pending Apps</span>
                            <Badge variant="secondary">
                              {stats.pendingApplications || 0}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Shortlisted</span>
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200">
                              {stats.shortlistedApplications || 0}
                            </Badge>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">No data available</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
