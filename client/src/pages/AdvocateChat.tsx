import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Trash2, MessageSquarePlus, Scale, Loader2, ShieldCheck, HelpCircle, AlertTriangle, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import type { AdvocateMessage } from "@shared/schema";

export default function AdvocateChat() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: messages = [], isLoading } = useQuery<AdvocateMessage[]>({
    queryKey: ["/api/advocate-chat"],
  });

  const sendMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/advocate-chat", { message });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/advocate-chat"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/advocate-chat");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/advocate-chat"] });
      toast({
        title: "Chat cleared",
        description: "Your conversation has been reset.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to clear chat",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sendMutation.isPending]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || sendMutation.isPending) return;
    setInput("");
    sendMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full" data-testid="advocate-chat-page">
      <div className="flex items-center justify-between gap-2 flex-wrap px-4 py-3 border-b sticky top-0 z-50 bg-background/95 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 -ml-1 hidden md:flex"
            onClick={() => setLocation("/dashboard")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Scale className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-base font-semibold" data-testid="text-advocate-title">Your Advocate</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => clearMutation.mutate()}
          disabled={clearMutation.isPending || !hasMessages}
          data-testid="button-new-chat"
        >
          {clearMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          <span className="ml-1">New Chat</span>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="chat-messages-container">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" data-testid="loading-messages" />
          </div>
        ) : !hasMessages ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-4" data-testid="welcome-container">
            <div className="rounded-full bg-muted p-4">
              <ShieldCheck className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="space-y-2 max-w-md">
              <h2 className="text-xl font-semibold" data-testid="text-welcome-heading">Ask me anything</h2>
              <p className="text-sm text-muted-foreground">
                I remember your contracts, obligations, and risk profile. Ask about legal questions, life decisions, or anything on your mind.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-sm">
              {[
                { icon: HelpCircle, text: "Can they do this?" },
                { icon: MessageSquarePlus, text: "Should I respond?" },
                { icon: AlertTriangle, text: "What happens if I ignore it?" },
              ].map((item) => (
                <Button
                  key={item.text}
                  variant="outline"
                  className="justify-start gap-2 text-left"
                  onClick={() => {
                    setInput(item.text);
                  }}
                  data-testid={`button-suggestion-${item.text.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                >
                  <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm">{item.text}</span>
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => {
              const isUser = msg.role === "user";
              const showDate =
                idx === 0 ||
                formatDate(msg.createdAt as unknown as string) !==
                  formatDate(messages[idx - 1].createdAt as unknown as string);

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex justify-center my-3">
                      <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full" data-testid={`text-date-separator-${idx}`}>
                        {formatDate(msg.createdAt as unknown as string)}
                      </span>
                    </div>
                  )}
                  <div
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                    data-testid={`message-bubble-${msg.id}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[70%] px-4 py-3 ${
                        isUser
                          ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                          : "bg-muted rounded-2xl rounded-bl-md"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap" data-testid={`text-message-content-${msg.id}`}>
                        {msg.content}
                      </p>
                      <p
                        className={`text-[10px] mt-1 ${
                          isUser ? "text-primary-foreground/70" : "text-muted-foreground"
                        }`}
                        data-testid={`text-message-time-${msg.id}`}
                      >
                        {formatTime(msg.createdAt as unknown as string)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {sendMutation.isPending && (
              <div className="flex justify-start" data-testid="loading-response">
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%] sm:max-w-[70%]">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="sticky bottom-0 z-50 border-t bg-background p-4" data-testid="chat-input-area">
        <div className="flex gap-2 items-end max-w-3xl mx-auto">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your advocate anything..."
            className="resize-none min-h-[44px] max-h-[120px] text-sm"
            rows={1}
            disabled={sendMutation.isPending}
            data-testid="input-chat-message"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || sendMutation.isPending}
            data-testid="button-send-message"
          >
            {sendMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
