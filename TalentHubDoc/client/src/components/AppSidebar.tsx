import { useLocation, Link } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  MessageSquare,
  User,
  Settings,
  LogOut,
  Sparkles,
  Users,
  PlusCircle,
  BarChart3,
  Shield,
  Building2,
  Search,
  Calendar,
  HelpCircle,
  Bookmark,
} from "lucide-react";

type UserRole = "candidate" | "recruiter" | "admin";

interface AppSidebarProps {
  userRole: UserRole;
  userName: string;
  userAvatar?: string;
  onLogout?: () => void;
}

const candidateMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/candidate" },
  { icon: Search, label: "Find Jobs", href: "/candidate/jobs" },
  { icon: Bookmark, label: "Saved Jobs", href: "/candidate/saved-jobs" },
  { icon: Briefcase, label: "My Applications", href: "/candidate/applications" },
  { icon: FileText, label: "My CV", href: "/candidate/cv" },
  { icon: Calendar, label: "Availability", href: "/candidate/profile" },
];

const candidateAITools = [
  { icon: Sparkles, label: "AI Match", href: "/candidate/ai-match" },
  { icon: MessageSquare, label: "Interview Prep", href: "/candidate/interview-prep" },
  { icon: BarChart3, label: "Skill Insights", href: "/candidate/skills" },
];

const recruiterMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/recruiter" },
];

const adminMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/admin" },
  { icon: Users, label: "Users", href: "/admin/users" },
  { icon: Building2, label: "Companies", href: "/admin/companies" },
  { icon: Briefcase, label: "All Jobs", href: "/admin/jobs" },
  { icon: BarChart3, label: "Analytics", href: "/admin/analytics" },
  { icon: Shield, label: "System", href: "/admin/system" },
];

export function AppSidebar({ userRole, userName, userAvatar, onLogout }: AppSidebarProps) {
  const [location] = useLocation();

  const getMenuItems = () => {
    switch (userRole) {
      case "candidate":
        return { main: candidateMenuItems, ai: candidateAITools };
      case "recruiter":
        return { main: recruiterMenuItems, ai: [] };
      case "admin":
        return { main: adminMenuItems, ai: [] };
      default:
        return { main: [], ai: [] };
    }
  };

  const { main, ai } = getMenuItems();
  const initials = userName.split(" ").map((n) => n[0]).join("").toUpperCase();

  const getRoleLabel = () => {
    switch (userRole) {
      case "candidate": return "Job Seeker";
      case "recruiter": return "Recruiter";
      case "admin": return "Administrator";
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="rounded-lg bg-primary p-1.5">
              <Briefcase className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold text-lg">TalentHub Pro</h1>
              <p className="text-xs text-muted-foreground">{getRoleLabel()}</p>
            </div>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {main.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={location === item.href}>
                    <Link href={item.href} data-testid={`link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {ai.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              AI Tools
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {ai.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={location === item.href}>
                      <Link href={item.href} data-testid={`link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {userRole !== "recruiter" && (
          <SidebarGroup>
            <SidebarGroupLabel>Settings</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.includes("/profile")}>
                    <Link href={`/${userRole}/profile`} data-testid="link-profile">
                      <User className="h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={userAvatar} alt={userName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userName}</p>
            <p className="text-xs text-muted-foreground truncate">{getRoleLabel()}</p>
          </div>
          <Button size="icon" variant="ghost" onClick={onLogout} data-testid="button-logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
