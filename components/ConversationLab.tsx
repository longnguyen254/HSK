
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Word } from '../types';
import { 
  X, 
  Sparkles, 
  Play, 
  Volume2, 
  Loader2, 
  ChevronRight, 
  CheckCircle2, 
  Wand2,
  MessagesSquare,
  Repeat,
  PlayCircle,
  Square,
  Download,
  Edit3
} from 'lucide-react';
import { generateConversation, generateConversationAudio } from '../services/geminiService';
import { speak } from '../services/audioService';

interface ConversationLabProps {
  allWords: Word[];
  onClose: () => void;
}

interface DialogueLine {
  speaker: string;
  chinese: string;
  pinyin: string;
  vietnamese: string;
}

export const ConversationLab: React.FC<ConversationLabProps> = ({ allWords, onClose }) => {
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [scenario, setScenario] = useState('Giao tiếp hàng ngày');
  const [customScenario, setCustomScenario] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [dialogue, setDialogue] = useState<DialogueLine[] | null>(null);
  
  const stopPlaybackRef = useRef(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const difficultWords = useMemo(() => {
    return allWords.filter(w => w.level <= 1).sort((a, b) => a.level - b.level);
  }, [allWords]);

  const toggleWord = (char: string) => {
    setSelectedWords(prev => 
      prev.includes(char) ? prev.filter(c => c !== char) : [...prev, char]
    );
  };

  const handleMagicSelect = () => {
    const chars = difficultWords.map(w => w.character).slice(0, 5);
    setSelectedWords(chars);
  };

  const handleGenerate = async () => {
    const finalScenario = isCustomMode ? (customScenario.trim() || 'Giao tiếp hàng ngày') : scenario;
    let wordsToUse = selectedWords;
    
    if (wordsToUse.length === 0) {
      if (difficultWords.length > 0) {
        wordsToUse = difficultWords.map(w => w.character).slice(0, 3);
        setSelectedWords(wordsToUse);
      } else if (allWords.length > 0) {
        wordsToUse = allWords.map(w => w.character).slice(0, 3);
        setSelectedWords(wordsToUse);
      } else {
        alert("Vui lòng thêm từ vựng vào ứng dụng trước!");
        return;
      }
    }

    setIsGenerating(true);
    setDialogue(null);
    const result = await generateConversation(wordsToUse, finalScenario);
    if (result) {
      setDialogue(result);
    } else {
      alert("Không thể tạo hội thoại. Vui lòng thử lại!");
    }
    setIsGenerating(false);
  };

  const handlePlayAll = async () => {
    if (isPlayingAll) {
      stopPlaybackRef.current = true;
      if (currentAudioRef.current) currentAudioRef.current.pause();
      setIsPlayingAll(false);
      setCurrentLineIndex(null);
      return;
    }
    if (!dialogue) return;
    setIsPlayingAll(true);
    stopPlaybackRef.current = false;
    for (let i = 0; i < dialogue.length; i++) {
      if (stopPlaybackRef.current) break;
      setCurrentLineIndex(i);
      const element = document.getElementById(`line-${i}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise<void>((resolve) => {
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(dialogue[i].chinese)}&tl=zh-CN&client=tw-ob`;
        const audio = new Audio(url);
        currentAudioRef.current = audio;
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
      });
      if (!stopPlaybackRef.current) await new Promise(r => setTimeout(r, 500));
    }
    setIsPlayingAll(false);
    setCurrentLineIndex(null);
  };

  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState<number | null>(null);

  const handleDownloadAudio = async () => {
    if (!dialogue || isDownloading) return;
    setIsDownloading(true);
    try {
      const base64Pcm = await generateConversationAudio(dialogue);
      if (!base64Pcm) throw new Error("TTS failed");
      const binaryString = atob(base64Pcm);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
      const sampleRate = 24000, numChannels = 1, bitsPerSample = 16;
      const header = new ArrayBuffer(44), view = new DataView(header);
      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
      };
      writeString(0, 'RIFF');
      view.setUint32(4, 36 + bytes.length, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true);
      view.setUint16(32, numChannels * bitsPerSample / 8, true);
      view.setUint16(34, bitsPerSample, true);
      writeString(36, 'data');
      view.setUint32(40, bytes.length, true);
      const combinedBlob = new Blob([header, bytes], { type: 'audio/wav' });
      const downloadUrl = URL.createObjectURL(combinedBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `chinese-conv-hq-${Date.now()}.wav`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      alert("Có lỗi khi tạo file âm thanh chất lượng cao.");
    } finally {
      setIsDownloading(false);
    }
  };

  const scenarios = [
    'Giao tiếp hàng ngày',
    'Đi ăn nhà hàng',
    'Phỏng vấn xin việc',
    'Tại sân bay',
    'Mua sắm',
    'Hẹn hò',
    'Bệnh viện',
    'Du lịch tự túc'
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[200] animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
              <MessagesSquare size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">AI Conversation Lab</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Học từ qua ngữ cảnh thực tế</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dialogue && (
              <>
                <button onClick={handleDownloadAudio} disabled={isDownloading} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100">
                  {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  <span className="hidden sm:inline">Tải HQ Audio</span>
                </button>
                <button onClick={handlePlayAll} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isPlayingAll ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-indigo-600'}`}>
                  {isPlayingAll ? <Square size={14} fill="currentColor" /> : <PlayCircle size={14} />}
                  <span className="hidden sm:inline">{isPlayingAll ? 'Dừng phát' : 'Nghe toàn bộ'}</span>
                </button>
              </>
            )}
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-300 transition-colors">
              <X size={28} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/30">
          {!dialogue ? (
            <div className="max-w-2xl mx-auto space-y-8">
              <section>
                <div className="flex justify-between items-center mb-4">
                  <label className="text-[11px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 size={14} /> 1. Chọn từ vựng mục tiêu
                  </label>
                  <button onClick={handleMagicSelect} className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition-colors">
                    <Wand2 size={12} /> Magic Select
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 bg-white rounded-2xl border border-slate-100">
                  {allWords.map(word => (
                    <button key={word.id} onClick={() => toggleWord(word.character)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${selectedWords.includes(word.character) ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300'}`}>
                      {word.character}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <label className="text-[11px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                  <ChevronRight size={14} /> 2. Chọn bối cảnh hội thoại
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-4">
                  {scenarios.map(s => (
                    <button key={s} onClick={() => { setIsCustomMode(false); setScenario(s); }} className={`px-3 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${(!isCustomMode && scenario === s) ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-100 text-slate-400'}`}>
                      {s}
                    </button>
                  ))}
                  <button onClick={() => setIsCustomMode(true)} className={`px-3 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border flex items-center justify-center gap-2 ${isCustomMode ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-indigo-50 border-indigo-100 text-indigo-400'}`}>
                    <Edit3 size={12} /> Khác...
                  </button>
                </div>
                
                {isCustomMode && (
                  <div className="animate-in slide-in-from-top-2">
                    <input 
                      type="text" 
                      value={customScenario}
                      onChange={(e) => setCustomScenario(e.target.value)}
                      placeholder="Mô tả bối cảnh bạn muốn (Vd: Mặc cả mua quần áo ở chợ...)"
                      className="w-full px-6 py-4 bg-white border-2 border-indigo-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-sm text-slate-700 shadow-inner"
                      autoFocus
                    />
                  </div>
                )}
              </section>

              <button onClick={handleGenerate} disabled={isGenerating} className="w-full bg-indigo-600 text-white py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-indigo-100">
                {isGenerating ? <Loader2 className="animate-spin mx-auto" size={24} /> : 'Tạo hội thoại ngay'}
              </button>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto flex flex-col h-full">
              <div className="flex justify-between items-center mb-8 shrink-0">
                <div className="bg-indigo-50 px-4 py-2 rounded-2xl flex items-center gap-2">
                  <span className="text-[10px] font-black text-indigo-600 uppercase">Bối cảnh: {isCustomMode ? customScenario : scenario}</span>
                </div>
                <button onClick={() => setDialogue(null)} className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest transition-colors">
                  <Repeat size={14} /> Tạo đoạn mới
                </button>
              </div>
              <div className="space-y-6 flex-1 pb-10">
                {dialogue.map((line, index) => (
                  <div key={index} id={`line-${index}`} className={`flex items-start gap-4 ${line.speaker === 'A' ? 'flex-row' : 'flex-row-reverse'} ${currentLineIndex === index ? 'scale-[1.02]' : ''}`}>
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white shrink-0 shadow-lg ${line.speaker === 'A' ? 'bg-indigo-500' : 'bg-emerald-500'}`}>
                      {line.speaker}
                    </div>
                    <div className={`max-w-[85%] p-5 rounded-[2rem] shadow-sm border ${line.speaker === 'A' ? 'bg-white border-slate-100 rounded-tl-none' : 'bg-slate-900 text-white border-slate-800 rounded-tr-none'}`}>
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <p className={`chinese-font font-bold text-xl leading-tight ${line.speaker === 'A' ? 'text-slate-800' : 'text-white'}`}>{line.chinese}</p>
                        <button onClick={() => speak(line.chinese)} className={`p-2 rounded-xl ${line.speaker === 'A' ? 'bg-indigo-50 text-indigo-500' : 'bg-white/10 text-white'}`}><Volume2 size={16} /></button>
                      </div>
                      <p className={`text-[10px] font-bold tracking-wider mb-2 ${line.speaker === 'A' ? 'text-indigo-400' : 'text-indigo-200'}`}>{line.pinyin}</p>
                      <p className={`text-sm italic ${line.speaker === 'A' ? 'text-slate-400' : 'text-slate-300'}`}>{line.vietnamese}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
