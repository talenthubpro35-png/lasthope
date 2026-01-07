import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  X,
  Send,
  Trash2,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface QuickQuestion {
  text: string;
  category: string;
}

const STORAGE_KEY = "talenthub_chat_history";
const MAX_HISTORY_MESSAGES = 50; // Keep last 50 messages

// Role-specific quick questions
const QUICK_QUESTIONS: Record<string, QuickQuestion[]> = {
  candidate: [
    { text: "How do I apply for jobs?", category: "getting-started" },
    { text: "How can I improve my profile?", category: "profile" },
    { text: "What are the best interview tips?", category: "interview" },
    { text: "How do I upload my resume?", category: "resume" },
    { text: "How does AI matching work?", category: "features" },
  ],
  recruiter: [
    { text: "How do I post a job?", category: "getting-started" },
    { text: "How do I find the best candidates?", category: "candidates" },
    { text: "How does AI candidate matching work?", category: "features" },
    { text: "How do I shortlist candidates?", category: "applications" },
    { text: "How do I manage applications?", category: "applications" },
  ],
  admin: [
    { text: "How do I manage users?", category: "users" },
    { text: "How do I view platform statistics?", category: "analytics" },
    { text: "Can I delete a user account?", category: "users" },
    { text: "How do I monitor applications?", category: "monitoring" },
  ],
  default: [
    { text: "What features does TalentHub Pro offer?", category: "features" },
    { text: "How do I get started?", category: "getting-started" },
    { text: "I need help with my account", category: "account" },
  ],
};

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const { toast } = useToast();
  const { user } = useAuth();
  const [location] = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load chat history from localStorage on mount
  useEffect(() => {
    loadChatHistory();
  }, []);

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      saveChatHistory();
    }
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Update unread count when chat is closed and assistant sends a message
  useEffect(() => {
    if (!isOpen && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "assistant") {
        setUnreadCount((prev) => prev + 1);
      }
    }
  }, [messages, isOpen]);

  // Reset unread count when chat is opened
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Send welcome message if no history
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        role: "assistant",
        content: `Hi! 👋 I'm your TalentHub Assistant. I'm here to help you navigate the platform and answer any questions you have. How can I assist you today?`,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);

      // Set initial suggestions based on user role
      const userRole = user?.role || "default";
      const initialQuestions = QUICK_QUESTIONS[userRole] || QUICK_QUESTIONS.default;
      setSuggestions(initialQuestions.map((q) => q.text));
    }
  }, []);

  const loadChatHistory = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const messagesWithDates = parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(messagesWithDates);
      }
    } catch (err) {
      console.error("Failed to load chat history:", err);
    }
  };

  const saveChatHistory = () => {
    try {
      // Keep only last MAX_HISTORY_MESSAGES messages
      const messagesToSave = messages.slice(-MAX_HISTORY_MESSAGES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messagesToSave));
    } catch (err) {
      console.error("Failed to save chat history:", err);
    }
  };

  const clearHistory = () => {
    if (confirm("Are you sure you want to clear your chat history? This cannot be undone.")) {
      setMessages([]);
      localStorage.removeItem(STORAGE_KEY);
      toast({
        title: "Chat history cleared",
        description: "Your conversation history has been deleted.",
      });

      // Send welcome message again
      const welcomeMessage: Message = {
        role: "assistant",
        content: `Hi! 👋 I'm your TalentHub Assistant. How can I help you today?`,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      console.log("ChatBot: Scrolled to bottom");
    } else {
      console.log("ChatBot: scrollRef.current is null");
    }
  };

  const getPageContext = () => {
    const pathParts = location.split("/").filter(Boolean);
    if (pathParts.length === 0) return { path: "/", pageName: "Home" };

    const pageNames: Record<string, string> = {
      candidate: "Candidate Dashboard",
      recruiter: "Recruiter Dashboard",
      admin: "Admin Dashboard",
      jobs: "Job Search",
      applications: "Applications",
      profile: "Profile",
      cv: "CV Builder",
      "interview-prep": "Interview Prep",
    };

    const pageName = pageNames[pathParts[pathParts.length - 1]] || pathParts[pathParts.length - 1];
    return { path: location, pageName };
  };

  const sendMessage = async (content: string) => {
    console.log("ChatBot: sendMessage called with:", content);
    if (!content.trim()) return;

    // Add user message
    const userMessage: Message = {
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    console.log("ChatBot: Adding user message:", userMessage);
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);
    setSuggestions([]);

    try {
      // Prepare messages for API (convert to simple format)
      const apiMessages = [...messages, userMessage].slice(-10).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Get page context
      const pageContext = getPageContext();

      // Call API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          messages: apiMessages,
          pageContext,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("You're sending messages too quickly. Please wait a moment.");
        }
        throw new Error("Failed to get response");
      }

      const data = await response.json();
      console.log("ChatBot: Received response:", data);

      // Add assistant response
      const assistantMessage: Message = {
        role: "assistant",
        content: data.message || "I'm sorry, I couldn't generate a response.",
        timestamp: new Date(),
      };

      console.log("ChatBot: Adding assistant message:", assistantMessage);
      setMessages((prev) => {
        const newMessages = [...prev, assistantMessage];
        console.log("ChatBot: New messages array:", newMessages);
        return newMessages;
      });

      // Update suggestions if provided
      if (data.suggestions && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
      }
    } catch (err: any) {
      console.error("Chat error:", err);

      const errorMessage: Message = {
        role: "assistant",
        content: err.message || "Sorry, I'm having trouble connecting. Please try again in a moment.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);

      toast({
        title: "Connection error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    sendMessage(question);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Floating action button when closed
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center p-0 rounded-full"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </div>
    );
  }

  // Get quick questions for current user
  const userRole = user?.role || "default";
  const quickQuestions = QUICK_QUESTIONS[userRole] || QUICK_QUESTIONS.default;

  return (
    <Card className="fixed bottom-6 right-6 w-[400px] h-[600px] shadow-2xl z-50 flex flex-col border-2 animate-in slide-in-from-bottom-5 duration-300">
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between gap-2 border-b p-4 space-y-0 bg-primary text-primary-foreground rounded-t-lg">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary-foreground/20 p-2 backdrop-blur-sm">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">TalentHub Assistant</h3>
            <p className="text-xs opacity-90">Ask me anything!</p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={clearHistory}
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            title="Clear history"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
        <div
          ref={scrollRef}
          className="flex-1 px-4 py-4 overflow-y-auto"
          style={{ scrollBehavior: 'smooth' }}
        >
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex flex-col gap-1 ${
                  message.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap break-words ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {message.content}
                </div>
                <span className="text-xs text-muted-foreground px-2">
                  {formatTime(message.timestamp)}
                </span>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Assistant is typing...</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick questions / Suggestions */}
        {!isTyping && (suggestions.length > 0 || messages.length === 1) && (
          <div className="px-4 pb-3">
            <p className="text-xs text-muted-foreground mb-2 font-medium">
              {messages.length === 1 ? "Quick questions:" : "You might also ask:"}
            </p>
            <div className="flex flex-wrap gap-2">
              {(suggestions.length > 0 ? suggestions : quickQuestions.map(q => q.text)).map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickQuestion(suggestion)}
                  className="text-xs h-auto py-1.5 px-3 rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
                  disabled={isTyping}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="border-t p-4 bg-background">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="flex gap-2"
          >
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message... (Shift+Enter for new line)"
              className="flex-1 min-h-[44px] max-h-[120px] resize-none"
              rows={1}
              disabled={isTyping}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isTyping}
              className="h-11 w-11 shrink-0"
            >
              {isTyping ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Powered by AI • TalentHub Pro
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
