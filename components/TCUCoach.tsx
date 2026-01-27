import React, { useState } from 'react';
import {
    Send,
    Bot,
    User,
    Sparkles,
    Zap,
    Loader2,
    RefreshCw,
    Info
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useFontSize } from '../hooks/useFontSize';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: number;
}

const TCUCoach: React.FC = () => {
    const { athlete, memberData } = useAuth();
    const { fontSize, fontSizeValue } = useFontSize();
    const displayName = memberData?.real_name || memberData?.member_name || athlete?.firstname || '選手';

    // Debugging font size change


    const getGreetingMessage = (name: string): Message => ({
        id: '1',
        role: 'assistant',
        content: `嗨 ${name}！我是您的專屬 AI 功率教練。\n我可以協助您分析騎乘數據、規劃訓練課表，或是解答關於功率訓練的疑問。\n\n您可以試著問我：「如何提升 FTP？」「請分析我最近的爬坡表現」`,
        createdAt: Date.now()
    });

    const [messages, setMessages] = useState<Message[]>([getGreetingMessage(displayName)]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // 當 displayName 變化時（memberData 載入完成），更新問候語
    React.useEffect(() => {
        setMessages(prev => {
            if (prev.length === 1 && prev[0].id === '1') {
                return [getGreetingMessage(displayName)];
            }
            return prev;
        });
    }, [displayName]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            createdAt: Date.now()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        // TODO: Integrate with backend API
        setTimeout(() => {
            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: '此功能目前為預覽模式。後端 AI 整合即將上線！(這是一個自動回覆範例)',
                createdAt: Date.now()
            };
            setMessages(prev => [...prev, aiMsg]);
            setIsLoading(false);
        }, 1500);
    };

    return (
        <div className="flex flex-col h-[600px] w-full max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden relative">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 backdrop-blur-sm flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-tcu-blue rounded-xl shadow-lg shadow-tcu-blue/20">
                        <Bot className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-900 dark:text-white uppercase italic tracking-wide">TCU Coach</h3>
                        <div className="flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">AI Online</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400">
                        <Info className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setMessages([messages[0]])}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-tcu-blue"
                        title="重新開始對話"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md ${msg.role === 'assistant'
                            ? 'bg-gradient-to-br from-tcu-blue to-indigo-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}>
                            {msg.role === 'assistant' ? <Sparkles className="w-4 h-4" /> : <User className="w-4 h-4" />}
                        </div>

                        <div className={`flex flex-col max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div
                                className={`px-5 py-3.5 rounded-2xl shadow-sm font-medium leading-relaxed whitespace-pre-wrap transition-all duration-200 ${msg.role === 'user'
                                    ? 'bg-tcu-blue text-white rounded-tr-none'
                                    : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-tl-none'
                                    }`}
                            >
                                {msg.content}
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold mt-1 px-1">
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-tcu-blue to-indigo-600 text-white flex items-center justify-center shadow-md">
                            <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                        <div className="px-5 py-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-tl-none flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                <div className="relative flex items-end gap-2 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-2 transition-colors focus-within:border-tcu-blue/50 focus-within:bg-white dark:focus-within:bg-slate-800">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="輸入您的問題..."
                        className="w-full bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white placeholder:text-slate-400 font-medium resize-none max-h-32 py-2.5 px-2"
                        rows={1}
                        style={{ minHeight: '44px' }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className={`p-2.5 rounded-xl flex-shrink-0 transition-all ${!input.trim() || isLoading
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                            : 'bg-tcu-blue text-white shadow-lg shadow-tcu-blue/30 hover:scale-105 active:scale-95'
                            }`}
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
                <p className="text-center mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Powered by TCU AI Engine • 僅供訓練參考
                </p>
            </div>

            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-tcu-blue/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        </div>
    );
};

export default TCUCoach;
