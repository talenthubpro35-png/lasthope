import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Briefcase, Users, Building2, ArrowLeft, Eye, EyeOff, AlertCircle } from "lucide-react";

export function LoginPage() {
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const { login, user, isAuthenticated } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Get redirect URL from query params
  const getRedirectUrl = () => {
    const params = new URLSearchParams(searchParams);
    return params.get("redirect") || null;
  };

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const redirectUrl = getRedirectUrl();
      if (redirectUrl) {
        setLocation(decodeURIComponent(redirectUrl));
      } else {
        // Redirect to appropriate dashboard based on role
        const dashboardPath = user.role === "admin" ? "/admin"
          : user.role === "recruiter" ? "/recruiter"
          : "/candidate";
        setLocation(dashboardPath);
      }
    }
  }, [isAuthenticated, user, setLocation]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!username.trim()) {
      setError("Username is required");
      return;
    }

    if (!password) {
      setError("Password is required");
      return;
    }

    try {
      setIsLoading(true);
      const userData = await login(username.trim(), password);

      // Redirect based on user role after successful login
      const redirectUrl = getRedirectUrl();
      if (redirectUrl) {
        setLocation(decodeURIComponent(redirectUrl));
      } else {
        const dashboardPath = userData.role === "admin" ? "/admin"
          : userData.role === "recruiter" ? "/recruiter"
          : "/candidate";
        setLocation(dashboardPath);
      }
    } catch (err) {
      // Provide user-friendly error messages
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      if (errorMessage.includes("invalid credentials")) {
        setError("Invalid username or password. Please try again.");
      } else if (errorMessage.includes("unauthorized")) {
        setError("Invalid username or password. Please try again.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="rounded-lg bg-primary p-1.5">
                <Briefcase className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg">TalentHub Pro</span>
            </div>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>Sign in to your account to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  data-testid="input-username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    data-testid="input-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span>Remember me</span>
                </label>
                <a href="#" className="text-primary hover:underline">
                  Forgot password?
                </a>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-sign-in">
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link href="/register">
                <a className="text-primary hover:underline">Sign up</a>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export function RegisterPage() {
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const { register, user, isAuthenticated } = useAuth();
  const [selectedRole, setSelectedRole] = useState<"candidate" | "recruiter">("candidate");
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Get redirect URL from query params
  const getRedirectUrl = () => {
    const params = new URLSearchParams(searchParams);
    return params.get("redirect") || null;
  };

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const redirectUrl = getRedirectUrl();
      if (redirectUrl) {
        setLocation(decodeURIComponent(redirectUrl));
      } else {
        const dashboardPath = user.role === "admin" ? "/admin"
          : user.role === "recruiter" ? "/recruiter"
          : "/candidate";
        setLocation(dashboardPath);
      }
    }
  }, [isAuthenticated, user, setLocation]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.username.trim()) {
      setError("Username is required");
      return;
    }

    if (formData.username.length < 3) {
      setError("Username must be at least 3 characters long");
      return;
    }

    if (!formData.email.trim()) {
      setError("Email is required");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (!formData.password) {
      setError("Password is required");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setIsLoading(true);
      const userData = await register(
        formData.username.trim(),
        formData.password,
        formData.email.trim(),
        selectedRole
      );

      // Redirect based on user role after successful registration
      const redirectUrl = getRedirectUrl();
      if (redirectUrl) {
        setLocation(decodeURIComponent(redirectUrl));
      } else {
        const dashboardPath = userData.role === "admin" ? "/admin"
          : userData.role === "recruiter" ? "/recruiter"
          : "/candidate";
        setLocation(dashboardPath);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="rounded-lg bg-primary p-1.5">
                <Briefcase className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg">TalentHub Pro</span>
            </div>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Create Your Account</CardTitle>
            <CardDescription>Join TalentHub Pro and start your journey</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedRole} onValueChange={(v) => setSelectedRole(v as any)}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="candidate" className="gap-2" data-testid="tab-candidate">
                  <Users className="h-4 w-4" />
                  Job Seeker
                </TabsTrigger>
                <TabsTrigger value="recruiter" className="gap-2" data-testid="tab-recruiter">
                  <Building2 className="h-4 w-4" />
                  Recruiter
                </TabsTrigger>
              </TabsList>

              <form onSubmit={handleRegister} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="johndoe"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                    minLength={3}
                    autoComplete="username"
                    data-testid="input-username"
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 3 characters. Letters, numbers, and underscores only.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    autoComplete="email"
                    data-testid="input-email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    data-testid="input-password"
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 6 characters required.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    data-testid="input-confirm-password"
                  />
                </div>

                <div className="text-sm text-muted-foreground">
                  By signing up, you agree to our{" "}
                  <a href="#" className="text-primary hover:underline">Terms of Service</a>
                  {" "}and{" "}
                  <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
                </div>

                <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-sign-up">
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </Tabs>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <Link href="/login">
                <a className="text-primary hover:underline">Sign in</a>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
