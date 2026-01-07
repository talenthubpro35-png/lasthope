import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Briefcase,
  Sparkles,
  Users,
  FileText,
  MessageSquare,
  Target,
  TrendingUp,
  Shield,
  ArrowRight,
  CheckCircle,
  Building2,
  Zap,
} from "lucide-react";

// todo: remove mock functionality
const features = [
  {
    icon: Sparkles,
    title: "AI-Powered Matching",
    description: "Our intelligent algorithms match candidates with jobs based on skills, experience, and preferences.",
  },
  {
    icon: FileText,
    title: "Automated CV Generation",
    description: "Create professional, ATS-optimized resumes in seconds with our AI-powered CV builder.",
  },
  {
    icon: MessageSquare,
    title: "Smart Chatbot",
    description: "Get instant answers to your recruitment questions with our AI assistant available 24/7.",
  },
  {
    icon: Target,
    title: "Interview Preparation",
    description: "AI-generated interview questions tailored to specific job descriptions and company profiles.",
  },
  {
    icon: TrendingUp,
    title: "Skill Recommendations",
    description: "Personalized skill development suggestions based on market trends and career goals.",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Enterprise-grade security to protect your data with role-based access control.",
  },
];

// todo: remove mock functionality
const stats = [
  { value: "50K+", label: "Active Jobs" },
  { value: "200K+", label: "Candidates" },
  { value: "5K+", label: "Companies" },
  { value: "92%", label: "Match Accuracy" },
];

// todo: remove mock functionality
const testimonials = [
  {
    quote: "TalentHub Pro reduced our time-to-hire by 60%. The AI matching is incredibly accurate.",
    name: "Jennifer Smith",
    role: "HR Director, TechCorp",
  },
  {
    quote: "I found my dream job within a week! The personalized recommendations were spot on.",
    name: "Michael Chen",
    role: "Software Engineer",
  },
  {
    quote: "The interview question generator helped me prepare thoroughly. Got the job!",
    name: "Emily Watson",
    role: "Product Manager",
  },
];

export function LandingPage() {
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary p-1.5">
              <Briefcase className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">TalentHub Pro</span>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Testimonials</a>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" data-testid="button-login">Log In</Button>
            </Link>
            <Link href="/register">
              <Button data-testid="button-get-started">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <Badge variant="secondary" className="mb-4">
              <Sparkles className="h-3 w-3 mr-1" />
              Powered by AI
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              Revolutionize Your{" "}
              <span className="text-primary">Hiring Process</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Connect the right talent with the right opportunities using AI-powered matching, 
              automated CV generation, and intelligent interview preparation.
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Link href="/register?role=candidate">
                <Button size="lg" className="gap-2" data-testid="button-find-jobs">
                  <Users className="h-4 w-4" />
                  Find Jobs
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/register?role=recruiter">
                <Button size="lg" variant="outline" className="gap-2" data-testid="button-hire-talent">
                  <Building2 className="h-4 w-4" />
                  Hire Talent
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 max-w-4xl mx-auto">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-primary">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Features</Badge>
            <h2 className="text-3xl md:text-4xl font-bold">
              Everything You Need for Smart Hiring
            </h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              Our platform combines cutting-edge AI technology with intuitive design 
              to streamline your recruitment process.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="hover-elevate">
                <CardContent className="p-6 space-y-4">
                  <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">How It Works</Badge>
            <h2 className="text-3xl md:text-4xl font-bold">
              Get Started in Minutes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center space-y-4">
              <div className="rounded-full bg-primary text-primary-foreground w-12 h-12 flex items-center justify-center mx-auto text-xl font-bold">
                1
              </div>
              <h3 className="font-semibold text-lg">Create Your Profile</h3>
              <p className="text-sm text-muted-foreground">
                Sign up and fill in your details. Our AI will help optimize your profile for better matches.
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="rounded-full bg-primary text-primary-foreground w-12 h-12 flex items-center justify-center mx-auto text-xl font-bold">
                2
              </div>
              <h3 className="font-semibold text-lg">Get AI Recommendations</h3>
              <p className="text-sm text-muted-foreground">
                Receive personalized job matches and skill recommendations based on your goals.
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="rounded-full bg-primary text-primary-foreground w-12 h-12 flex items-center justify-center mx-auto text-xl font-bold">
                3
              </div>
              <h3 className="font-semibold text-lg">Apply & Succeed</h3>
              <p className="text-sm text-muted-foreground">
                Use our AI tools to prepare for interviews and land your dream job.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="testimonials" className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Testimonials</Badge>
            <h2 className="text-3xl md:text-4xl font-bold">
              Trusted by Thousands
            </h2>
          </div>

          <div className="max-w-3xl mx-auto">
            <Card className="p-8">
              <CardContent className="space-y-6 p-0">
                <blockquote className="text-xl text-center italic">
                  "{testimonials[activeTestimonial].quote}"
                </blockquote>
                <div className="text-center">
                  <p className="font-semibold">{testimonials[activeTestimonial].name}</p>
                  <p className="text-sm text-muted-foreground">{testimonials[activeTestimonial].role}</p>
                </div>
                <div className="flex justify-center gap-2">
                  {testimonials.map((_, index) => (
                    <button
                      key={index}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === activeTestimonial ? "bg-primary" : "bg-muted-foreground/30"
                      }`}
                      onClick={() => setActiveTestimonial(index)}
                      data-testid={`button-testimonial-${index}`}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="container mx-auto px-4">
          <Card className="bg-primary text-primary-foreground p-8 md:p-12">
            <CardContent className="p-0 text-center space-y-6">
              <Zap className="h-12 w-12 mx-auto opacity-80" />
              <h2 className="text-3xl md:text-4xl font-bold">
                Ready to Transform Your Hiring?
              </h2>
              <p className="text-lg opacity-90 max-w-2xl mx-auto">
                Join thousands of companies and candidates who are already using 
                TalentHub Pro to connect talent with opportunity.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/register">
                  <Button size="lg" variant="secondary" className="gap-2" data-testid="button-start-free">
                    Start Free Trial
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" data-testid="button-schedule-demo">
                    Schedule Demo
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="rounded-lg bg-primary p-1.5">
                  <Briefcase className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-semibold">TalentHub Pro</span>
              </div>
              <p className="text-sm text-muted-foreground">
                AI-powered recruitment platform connecting talent with opportunity.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Candidates</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Find Jobs</a></li>
                <li><a href="#" className="hover:text-foreground">CV Builder</a></li>
                <li><a href="#" className="hover:text-foreground">Interview Prep</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Recruiters</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Post Jobs</a></li>
                <li><a href="#" className="hover:text-foreground">Find Talent</a></li>
                <li><a href="#" className="hover:text-foreground">AI Screening</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">About</a></li>
                <li><a href="#" className="hover:text-foreground">Privacy</a></li>
                <li><a href="#" className="hover:text-foreground">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>2024 TalentHub Pro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
