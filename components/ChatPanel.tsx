'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, X, Loader as Loader2, User } from 'lucide-react';
import { ChatPanelProps } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function ChatPanel({
  messages,
  onSendMessage,
  isLoading,
  isOpen,
  onToggle,
}: ChatPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <>
      <div className={cn('h-full bg-white border-l w-full md:w-96 lg:w-[26rem]')}> 
        <Card className="h-full rounded-none border-l flex flex-col">
          <div className="px-3 py-2 border-b bg-white/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-fleet-primary/10 flex items-center justify-center text-fleet-primary text-[10px] font-semibold">
                AI
              </div>
              <div>
                <h2 className="text-sm font-medium text-fleet-text-primary tracking-tight">AI Assistant</h2>
                <p className="text-[11px] text-fleet-text-secondary">Ask about fleet status and insights</p>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1 p-3" ref={scrollRef}>
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-10 h-10 rounded-full bg-fleet-primary/10 flex items-center justify-center text-fleet-primary text-xs font-semibold mx-auto mb-2">AI</div>
                  <p className="text-[13px] text-fleet-text-secondary">Start a conversation with the AI</p>
                  <div className="mt-4 space-y-2">
                    <button
                      onClick={() =>
                        onSendMessage('Show me all vehicles that are currently en route')
                      }
                      className="block w-full text-left p-2.5 rounded-md border border-border hover:bg-fleet-background text-[13px] transition-colors"
                    >
                      Show vehicles en route
                    </button>
                    <button
                      onClick={() => onSendMessage('Which vehicles are offline?')}
                      className="block w-full text-left p-2.5 rounded-md border border-border hover:bg-fleet-background text-[13px] transition-colors"
                    >
                      Check offline vehicles
                    </button>
                    <button
                      onClick={() => onSendMessage('What is the average battery level?')}
                      className="block w-full text-left p-2.5 rounded-md border border-border hover:bg-fleet-background text-[13px] transition-colors"
                    >
                      Average battery level
                    </button>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn('flex gap-2.5', message.type === 'user' ? 'justify-end' : 'justify-start')}
                  >
                    {message.type === 'system' && (
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-fleet-primary/10 flex items-center justify-center text-fleet-primary text-[10px] font-semibold">AI</div>
                    )}
                    <div
                      className={cn(
                        'max-w-[80%] rounded-md px-3.5 py-2',
                        message.type === 'user'
                          ? 'bg-fleet-primary text-white'
                          : 'bg-white border border-border text-foreground'
                      )}
                    >
                      <p className="text-[13px] leading-5 whitespace-pre-wrap">{message.content}</p>
                      <p
                        className={cn(
                          'text-[11px] mt-1.5',
                          message.type === 'user' ? 'text-white/70' : 'text-muted-foreground'
                        )}
                      >
                        {new Date(message.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </p>
                    </div>
                    {message.type === 'user' && (
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-fleet-secondary/20 flex items-center justify-center text-fleet-secondary text-[10px] font-semibold">You</div>
                    )}
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex gap-2.5 justify-start">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-fleet-primary/10 flex items-center justify-center text-fleet-primary text-[10px] font-semibold">AI</div>
                  <div className="bg-white border border-border rounded-md px-3.5 py-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-fleet-text-secondary rounded-full animate-bounce" />
                      <span
                        className="w-2 h-2 bg-fleet-text-secondary rounded-full animate-bounce"
                        style={{ animationDelay: '0.1s' }}
                      />
                      <span
                        className="w-2 h-2 bg-fleet-text-secondary rounded-full animate-bounce"
                        style={{ animationDelay: '0.2s' }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-3 border-t bg-white/70">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                ref={inputRef}
                type="text"
                placeholder="Type a message..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="flex-1 rounded-md text-[13px]"
                aria-label="Chat message input"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!inputValue.trim() || isLoading}
                className="rounded-md bg-fleet-primary hover:bg-fleet-primary/90"
                aria-label="Send message"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </>
  );
}
