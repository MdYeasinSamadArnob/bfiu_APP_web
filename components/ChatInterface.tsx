'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, X, RefreshCw, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { UseCase } from '../data/useCases';

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface ChatInterfaceProps {
    context: UseCase;
    model: string;
    onClose: () => void;
}

export default function ChatInterface({ context, model, onClose }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        // Focus input on mount
        inputRef.current?.focus();
        
        // Add initial greeting
        if (messages.length === 0) {
            setMessages([
                { 
                    role: 'assistant', 
                    content: `Hello! I'm your AI assistant. I have the context for "${context.title}". How can I help you with this use case today?` 
                }
            ]);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages.filter(m => m.role !== 'system'), userMessage],
                    context: context,
                    model: model
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to fetch response');
            }

            if (!response.body) return;

            // Create a placeholder for the assistant message
            const assistantMessage: Message = { role: 'assistant', content: '' };
            setMessages(prev => [...prev, assistantMessage]);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let assistantContent = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                // Ollama returns multiple JSON objects in a single chunk sometimes
                const lines = chunk.split('\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                    try {
                        const json = JSON.parse(line);
                        if (json.message?.content) {
                            assistantContent += json.message.content;
                            setMessages(prev => {
                                const newMessages = [...prev];
                                newMessages[newMessages.length - 1].content = assistantContent;
                                return newMessages;
                            });
                        }
                        if (json.done) {
                            setIsLoading(false);
                        }
                    } catch (e) {
                        console.error('Error parsing JSON chunk', e);
                    }
                }
            }
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error connecting to the AI model. Please ensure Ollama is running locally.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const clearChat = () => {
        setMessages([
            { 
                role: 'assistant', 
                content: `Chat memory cleared. I'm ready to start over with "${context.title}".` 
            }
        ]);
    };

    return (
        <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                        <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">AI Assistant</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Powered by Ollama</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button 
                        onClick={clearChat}
                        className="p-2 text-slate-500 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        title="Clear Chat"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                    <div 
                        key={idx} 
                        className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        {msg.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0 mt-1">
                                <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            </div>
                        )}
                        
                        <div 
                            className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                                msg.role === 'user' 
                                    ? 'bg-indigo-600 text-white rounded-tr-sm' 
                                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-tl-sm shadow-sm'
                            }`}
                        >
                            <div className={`prose prose-sm max-w-none break-words ${
                                    msg.role === 'user' 
                                        ? 'prose-invert' 
                                        : 'dark:prose-invert prose-slate'
                                }`}>
                                <ReactMarkdown 
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                         p: ({ node: _node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                         ul: ({ node: _node, ...props }) => <ul className="list-disc pl-4 mb-2 last:mb-0" {...props} />,
                                         ol: ({ node: _node, ...props }) => <ol className="list-decimal pl-4 mb-2 last:mb-0" {...props} />,
                                         li: ({ node: _node, ...props }) => <li className="mb-0.5" {...props} />,
                                         h1: ({ node: _node, ...props }) => <h1 className="text-lg font-bold mb-2 mt-4 first:mt-0" {...props} />,
                                         h2: ({ node: _node, ...props }) => <h2 className="text-base font-bold mb-2 mt-3 first:mt-0" {...props} />,
                                         h3: ({ node: _node, ...props }) => <h3 className="text-sm font-bold mb-2 mt-2 first:mt-0" {...props} />,
                                         pre: ({ node: _node, ...props }) => (
                                             <div className="overflow-auto w-full my-2 bg-slate-950 dark:bg-slate-950 p-2 rounded-lg">
                                                 <pre {...props} />
                                             </div>
                                         ),
                                         code: ({ node: _node, className, children, ...props }) => {
                                            const match = /language-(\w+)/.exec(className || '');
                                            const isInline = !match && !String(children).includes('\n');
                                            return isInline ? (
                                                <code className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded font-mono text-xs" {...props}>
                                                    {children}
                                                </code>
                                            ) : (
                                                <code className={className} {...props}>
                                                    {children}
                                                </code>
                                            );
                                        }
                                    }}
                                >
                                    {msg.content}
                                </ReactMarkdown>
                            </div>
                        </div>

                        {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-1">
                                <User className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                            </div>
                        )}
                    </div>
                ))}
                
                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                     <div className="flex gap-3 justify-start">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0 mt-1">
                            <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                            <span className="text-xs text-slate-500">Thinking...</span>
                        </div>
                     </div>
                )}
                
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                <form onSubmit={handleSubmit} className="relative">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about this use case..."
                        className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400"
                        disabled={isLoading}
                    />
                    <button 
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </form>
            </div>
        </div>
    );
}
