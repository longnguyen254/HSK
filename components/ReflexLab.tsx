
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Word } from '../types';
import { 
  X, 
  Send, 
  Loader2, 
  User, 
  Bot, 
  Volume2, 
  Zap, 
  CheckCircle2, 
  MessageCircle, 
  ArrowRight,
  Sparkles,
  Trophy,
  History,
  Languages,
  Edit3
} from 'lucide-react';
import { generateReflexResponse } from '../services/geminiService';
import { speak } from '../services/audioService';

interface ReflexLabProps {
  allWords: Word[];
  onClose: () => void;
}

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  evaluation?: {
    translatedUserChinese: string;
    score: number;
    grammar: string;
    context: string;
    vocabUsage: string;
    suggestion: string;
    suggestionPinyin: string;
    suggestionVietnamese: string;
    userPinyin: string;
    userVietnamese: string;
  };
  pinyin?: string;
  vietnamese?: string;
}

export const ReflexLab: React.FC<ReflexLabProps> = ({ allWords, onClose }) => {
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [scenario, setScenario] = useState('Kết bạn mới');
  const [customScenario, setCustomScenario] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  const difficultWords = useMemo(() => {
    return allWords.filter(w => w.level <= 1).sort((a, b) => a.level - b.level);
  }, [allWords]);

  const toggleWord = (char: string) => {
    setSelectedWords(prev => 
      prev.includes(char) ? prev.filter(c => c !== char) : [...prev, char]
    );
  };

  const handleSmartSelect = () => {
    const chars = difficultWords.map(w => w.character).slice(0, 5);
    setSelectedWords(chars);
  };

  const handleStart = async () => {
    if (selectedWords.length === 0) {
      handleSmartSelect();
    }
    const finalScenario = isCustomMode ? (customScenario.trim() || 'Hội thoại tự do') : scenario;
    setIsStarted(true);
    setIsThinking(true);
    
    const result = await generateReflexResponse([], selectedWords, finalScenario);
    if (result) {
      setChatHistory([{
        role: 'model',
        content: result.nextMessage.chinese,
        pinyin: result.nextMessage.pinyin,
        vietnamese: result.nextMessage.vietnamese
      }]);
      speak(result.nextMessage.chinese);
    }
    setIsThinking(false);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userInput.trim() || isThinking) return;

    const userMsg = userInput.trim();
    setUserInput('');
    
    const newHistory = [...chatHistory, { role: 'user', content: userMsg } as ChatMessage];
    setChatHistory(newHistory);
    setIsThinking(true);

    const apiHistory = newHistory.map(h => ({ role: h.role, content: h.content }));
    const finalScenario = isCustomMode ? customScenario : scenario;
    const result = await generateReflexResponse(apiHistory, selectedWords, finalScenario);
    
    if (result) {
      const updatedHistory = [...newHistory];
      updatedHistory[updatedHistory.length - 1].evaluation = result.evaluation;
      
      setChatHistory([...updatedHistory, {
        role: 'model',
        content: result.nextMessage.chinese,
        pinyin: result.nextMessage.pinyin,
        vietnamese: result.nextMessage.vietnamese
      }]);
      speak(result.nextMessage.chinese);
    }
    
    setIsThinking(false);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isThinking]);

  const scenarios = ['Kết bạn mới', 'Đi phỏng vấn', 'Đặt phòng khách sạn', 'Than phiền về đồ ăn', 'Hỏi đường', 'Đi mua sắm trả giá'];

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4 z-[200] animate-in fade-in duration-300">
      <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95">
        
        {/* Header */}
        <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-100">
              <Zap size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">AI Reflex Lab</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Luyện phản xạ & Dịch thuật AI</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-300 transition-colors">
            <X size={28} />
          </button>
        </div>

        {!isStarted ? (
          <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-slate-50/50">
            <div className="max-w-2xl mx-auto space-y-10">
              <section className="text-center space-y-2">
                <h3 className="text-3xl font-black text-slate-800">Tự tin giao tiếp</h3>
                <p className="text-slate-500">Mô tả bất kỳ tình huống nào bạn muốn, AI sẽ đóng vai nhân vật đó để trò chuyện cùng bạn.</p>
              </section>

              <section className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-6">
                   <label className="text-xs font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                      <CheckCircle2 size={16} /> 1. Từ vựng mục tiêu
                   </label>
                   <button onClick={handleSmartSelect} className="text-[10px] font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full hover:bg-orange-100 transition-colors flex items-center gap-1">
                      <Sparkles size={12} /> Chọn hộ tôi
                   </button>
                </div>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {allWords.map(w => (
                    <button key={w.id} onClick={() => toggleWord(w.character)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${selectedWords.includes(w.character) ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-slate-100 text-slate-500'}`}>
                      {w.character}
                    </button>
                  ))}
                </div>
              </section>

              <section className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                <label className="text-xs font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2 mb-6">
                   <MessageCircle size={16} /> 2. Chọn bối cảnh hội thoại
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  {scenarios.map(s => (
                    <button key={s} onClick={() => { setIsCustomMode(false); setScenario(s); }} className={`px-4 py-4 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all border ${(!isCustomMode && scenario === s) ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-slate-50 border-transparent text-slate-400'}`}>
                      {s}
                    </button>
                  ))}
                  <button onClick={() => setIsCustomMode(true)} className={`px-4 py-4 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all border flex items-center justify-center gap-2 ${isCustomMode ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-indigo-50 border-indigo-100 text-indigo-400'}`}>
                    <Edit3 size={14} /> Khác...
                  </button>
                </div>
                
                {isCustomMode && (
                  <div className="animate-in slide-in-from-top-2">
                    <input 
                      type="text" 
                      value={customScenario}
                      onChange={(e) => setCustomScenario(e.target.value)}
                      placeholder="Vd: Bạn đang ở rạp phim và muốn mua bắp rang bơ..."
                      className="w-full px-6 py-5 bg-white border-2 border-indigo-100 rounded-[1.5rem] focus:border-indigo-500 outline-none font-bold text-sm text-slate-700 shadow-inner"
                      autoFocus
                    />
                  </div>
                )}
              </section>

              <button onClick={handleStart} className="w-full bg-indigo-600 text-white py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-indigo-100">
                Bắt đầu hội thoại ngay
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col bg-slate-50/30">
              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                {chatHistory.map((msg, idx) => (
                  <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`flex items-start gap-4 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${msg.role === 'user' ? 'bg-slate-800 text-white' : 'bg-orange-500 text-white'}`}>
                        {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                      </div>
                      <div className="space-y-2">
                        <div className={`p-5 rounded-[2rem] shadow-sm border ${msg.role === 'user' ? 'bg-white border-slate-100 rounded-tr-none' : 'bg-indigo-600 text-white border-indigo-500 rounded-tl-none shadow-indigo-100'}`}>
                          {msg.role === 'user' && msg.evaluation?.translatedUserChinese && msg.evaluation.translatedUserChinese !== msg.content && (
                            <div className="mb-3 pb-3 border-b border-slate-100">
                               <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1 flex items-center gap-1"><Languages size={10} /> AI đã dịch giúp bạn:</p>
                               <p className="chinese-font font-bold text-xl text-indigo-600 leading-none">{msg.evaluation.translatedUserChinese}</p>
                            </div>
                          )}
                          <div className="flex justify-between items-start gap-4 mb-1">
                             <p className={`chinese-font font-bold text-xl leading-snug ${msg.role === 'user' ? 'text-slate-800' : 'text-white'}`}>{msg.content}</p>
                             <button onClick={() => speak(msg.role === 'user' ? (msg.evaluation?.translatedUserChinese || msg.content) : msg.content)} className={`p-1.5 rounded-lg transition-colors ${msg.role === 'user' ? 'bg-slate-50 text-slate-400' : 'bg-white/10 text-white'}`}><Volume2 size={16} /></button>
                          </div>
                          {msg.role === 'user' && msg.evaluation?.userPinyin && <p className="text-[10px] font-bold text-indigo-400 tracking-wide mb-1">{msg.evaluation.userPinyin}</p>}
                          {msg.role === 'user' && msg.evaluation?.userVietnamese && msg.evaluation.userVietnamese !== msg.content && <p className="text-xs italic text-slate-400">{msg.evaluation.userVietnamese}</p>}
                          {msg.pinyin && <p className="text-[10px] font-bold opacity-80 tracking-wide mb-1">{msg.pinyin}</p>}
                          {msg.vietnamese && <p className="text-xs italic opacity-60">{msg.vietnamese}</p>}
                        </div>
                        {msg.role === 'user' && msg.evaluation && (
                          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm animate-in zoom-in-95">
                             <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-50">
                                <div className="flex items-center gap-2"><Trophy size={16} className="text-orange-500" /><span className="text-[10px] font-black uppercase text-slate-400">Phân tích & Đánh giá</span></div>
                                <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${msg.evaluation.score >= 80 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{msg.evaluation.score}/100</span>
                             </div>
                             <div className="space-y-3 text-[11px]">
                                <div><span className="font-bold text-slate-400 uppercase tracking-tighter">Ngữ pháp:</span> <span className="text-slate-600">{msg.evaluation.grammar}</span></div>
                                <div><span className="font-bold text-slate-400 uppercase tracking-tighter">Bối cảnh:</span> <span className="text-slate-600">{msg.evaluation.context}</span></div>
                                <div><span className="font-bold text-slate-400 uppercase tracking-tighter">Từ vựng:</span> <span className="text-slate-600">{msg.evaluation.vocabUsage}</span></div>
                                <div className="mt-3 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 italic relative group">
                                   <span className="font-bold text-indigo-600 block mb-2 uppercase tracking-tighter not-italic text-[9px]">Cách nói của người bản xứ:</span>
                                   <div className="flex justify-between items-start gap-2 mb-2">
                                      <div className="flex-1">
                                        <span className="text-indigo-900 chinese-font font-bold text-sm block mb-1">{msg.evaluation.suggestion}</span>
                                        <span className="text-[10px] text-indigo-400 font-bold not-italic block">{msg.evaluation.suggestionPinyin}</span>
                                      </div>
                                      <button onClick={() => speak(msg.evaluation!.suggestion)} className="p-1.5 bg-white text-indigo-500 rounded-lg shadow-sm"><Volume2 size={14} /></button>
                                   </div>
                                   <div className="pt-2 border-t border-indigo-100/50"><p className="text-[10px] text-indigo-700/70 font-medium not-italic">{msg.evaluation.suggestionVietnamese}</p></div>
                                </div>
                             </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {isThinking && (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg animate-pulse"><Bot size={18} /></div>
                    <div className="bg-white px-6 py-4 rounded-full border border-slate-100 shadow-sm flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin text-indigo-500" />
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">AI đang lắng nghe...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="p-8 bg-white border-t border-slate-100">
                <form onSubmit={handleSend} className="relative max-w-4xl mx-auto">
                  <input type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder="Nhập tiếng Trung, Việt hoặc Anh..." className="w-full px-10 py-6 pr-24 bg-slate-50 border-2 border-slate-100 rounded-[2rem] focus:border-indigo-500 focus:bg-white outline-none transition-all chinese-font font-bold text-xl" disabled={isThinking} />
                  <button disabled={!userInput.trim() || isThinking} className="absolute right-3 top-1/2 -translate-y-1/2 w-16 h-16 bg-indigo-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-90 transition-all disabled:opacity-30"><Send size={24} /></button>
                </form>
              </div>
            </div>
            <div className="w-80 border-l border-slate-100 bg-white p-8 overflow-y-auto custom-scrollbar hidden xl:block">
               <div className="flex items-center gap-2 mb-8"><History size={18} className="text-indigo-600" /><h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Từ vựng mục tiêu</h3></div>
               <div className="space-y-3">
                  {selectedWords.map(wordChar => {
                    const isUsed = chatHistory.some(m => (m.role === 'user' && m.content.includes(wordChar)) || (m.role === 'user' && m.evaluation?.translatedUserChinese?.includes(wordChar)));
                    return (
                      <div key={wordChar} className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${isUsed ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-slate-50 border-slate-100'}`}>
                         <span className={`chinese-font font-bold text-xl ${isUsed ? 'text-emerald-700' : 'text-slate-400'}`}>{wordChar}</span>
                         {isUsed && <CheckCircle2 size={16} className="text-emerald-500" />}
                      </div>
                    )
                  })}
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
