
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Word, ReviewGrade } from '../types';
import { 
  RotateCcw, 
  XCircle, 
  Info, 
  Volume2, 
  Lightbulb, 
  Layers, 
  Mic, 
  Loader2,
  BookOpen,
  Image as ImageIcon,
  ShieldAlert,
  GraduationCap,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { speak } from '../services/audioService';
import { audioRecorder } from '../services/audioRecorderService';
import { evaluatePronunciation } from '../services/geminiService';

interface ReviewSessionProps {
  wordsToReview: Word[];
  onFinish: (results: { id: string, grade: ReviewGrade }[]) => void;
  onClose: () => void;
}

export const ReviewSession: React.FC<ReviewSessionProps> = ({ wordsToReview, onFinish, onClose }) => {
  // sessionWords là danh sách động, có thể tăng lên nếu chọn "Again"
  const [sessionWords, setSessionWords] = useState<Word[]>(wordsToReview);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [isChecked, setIsChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  
  // Lưu kết quả thực tế để cập nhật DB (chỉ lưu kết quả lần đầu tiên gặp từ đó)
  const [finalResults, setFinalResults] = useState<{ id: string, grade: ReviewGrade }[]>([]);
  
  // Theo dõi các từ đã "vượt qua" (không chọn Again)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  
  const [isRecording, setIsRecording] = useState<'word' | 'example' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pronunciationFeedback, setPronunciationFeedback] = useState<{ 
    transcript: string, 
    feedback: string, 
    status: 'success' | 'error' | 'idle',
    score: number 
  }>({ transcript: '', feedback: '', status: 'idle', score: 0 });
  
  const inputRef = useRef<HTMLInputElement>(null);
  const currentWord = sessionWords[currentIndex];

  // Xử lý Phím tắt
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isProcessing || isRecording) return;

      if (!isChecked) {
        if (e.key === 'Enter') handleCheck();
      } else {
        switch (e.key) {
          case ' ': // Space -> Again
            e.preventDefault();
            handleGrade('again');
            break;
          case 'Enter': // Enter -> Good
            e.preventDefault();
            handleGrade('good');
            break;
          case '1': // 1 -> Hard
            handleGrade('hard');
            break;
          case '2': // 2 -> Easy
            handleGrade('easy');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isChecked, isProcessing, isRecording, userInput, currentIndex, sessionWords]);

  useEffect(() => {
    if (currentWord && !isChecked) {
      const timer = setTimeout(() => {
        speak(currentWord.character);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, isChecked, currentWord]);

  useEffect(() => {
    if (!isChecked && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentIndex, isChecked]);

  const handlePlaySound = (text: string, e?: React.MouseEvent | React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    speak(text);
  };

  const handleCheck = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userInput.trim()) return;

    const correct = userInput.trim() === currentWord.character;
    setIsCorrect(correct);
    setIsChecked(true);
    setPronunciationFeedback({ transcript: '', feedback: '', status: 'idle', score: 0 });
    
    if (correct) {
      speak(currentWord.character);
    }
  };

  const handleGrade = (grade: ReviewGrade) => {
    // 1. Ghi nhận kết quả cho DB (Chỉ ghi lần đầu tiên gặp từ này)
    const hasBeenGraded = finalResults.some(r => r.id === currentWord.id);
    let newResults = finalResults;
    if (!hasBeenGraded) {
      newResults = [...finalResults, { id: currentWord.id, grade }];
      setFinalResults(newResults);
    }

    // 2. Xử lý logic vòng lặp (Lặp lại nếu chọn 'again')
    if (grade === 'again') {
      // Đẩy từ này xuống cuối danh sách hiện tại để học lại
      setSessionWords(prev => [...prev, currentWord]);
    } else {
      // Đánh dấu là đã hoàn thành từ này
      setCompletedIds(prev => new Set(prev).add(currentWord.id));
    }

    // 3. Chuyển sang từ tiếp theo hoặc kết thúc
    if (currentIndex < sessionWords.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setUserInput('');
      setIsChecked(false);
      setIsCorrect(false);
      setPronunciationFeedback({ transcript: '', feedback: '', status: 'idle', score: 0 });
    } else {
      // Kết thúc buổi học: Gửi kết quả về App (đã lọc các từ duy nhất)
      onFinish(newResults);
    }
  };

  const showHint = () => {
    setIsChecked(true);
    setIsCorrect(false);
    speak(currentWord.character);
  };

  const startPractice = async (type: 'word' | 'example') => {
    try {
      setIsRecording(type);
      setPronunciationFeedback({ ...pronunciationFeedback, feedback: 'Đang ghi âm...', status: 'idle' });
      await audioRecorder.startRecording();
      
      setTimeout(() => {
        if (isRecording === type) stopAndEvaluate(type);
      }, type === 'word' ? 4000 : 7000);
    } catch (err) {
      setIsRecording(null);
      alert("Không thể truy cập Microphone.");
    }
  };

  const stopAndEvaluate = async (type: 'word' | 'example') => {
    if (isProcessing) return;
    setIsRecording(null);
    setIsProcessing(true);
    setPronunciationFeedback({ ...pronunciationFeedback, feedback: 'Đang thẩm định...', status: 'idle' });

    try {
      const audioBase64 = await audioRecorder.stopRecording();
      const targetText = type === 'word' ? currentWord.character : currentWord.example;
      const result = await evaluatePronunciation(audioBase64, targetText);
      
      if (result) {
        setPronunciationFeedback({
          transcript: result.transcript,
          feedback: result.feedback,
          status: result.isMatch ? 'success' : 'error',
          score: result.score
        });
      }
    } catch (err) {
      setPronunciationFeedback({
        transcript: '',
        feedback: 'Có lỗi khi phân tích. Vui lòng thử lại!',
        status: 'error',
        score: 0
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Tính toán tiến độ dựa trên số từ duy nhất đã "vượt qua"
  const progressPercent = useMemo(() => {
    const totalUnique = wordsToReview.length;
    const completedUnique = completedIds.size;
    return (completedUnique / totalUnique) * 100;
  }, [completedIds, wordsToReview]);

  if (!currentWord) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-5xl w-full overflow-hidden flex flex-col my-4 border border-white/20 animate-in zoom-in-95 duration-300 max-h-[95vh]">
        
        {/* Progress Bar (Dựa trên số từ đã thuộc) */}
        <div className="h-2 bg-slate-100 w-full relative shrink-0">
          <div 
            className="h-full bg-emerald-500 transition-all duration-700 ease-in-out shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
            style={{ width: `${progressPercent}%` }} 
          />
        </div>

        {/* Header */}
        <div className="px-6 md:px-8 py-4 flex justify-between items-center border-b border-slate-100 bg-white sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                <BookOpen size={16} />
            </div>
            <div className="flex flex-col">
              <span className="text-slate-900 font-bold text-sm leading-none mb-1">
                Tiến độ: {completedIds.size} / {wordsToReview.length} từ
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                {sessionWords.length > wordsToReview.length ? `Lượt học: ${currentIndex + 1}` : 'Vòng học chính'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all">
            <XCircle size={24} />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6 md:p-8 flex flex-col bg-slate-50/30 overflow-y-auto custom-scrollbar">
          <div className="flex flex-col lg:flex-row gap-6 md:gap-8 items-start">
            
            {/* Left Column */}
            <div className="w-full lg:w-64 space-y-4 shrink-0">
                <div className="relative group mx-auto lg:mx-0 max-w-[220px] lg:max-w-none">
                    <div className="w-full aspect-square rounded-[2rem] overflow-hidden shadow-lg border-4 border-white bg-white flex items-center justify-center">
                        {currentWord.imageUrl ? (
                          <img src={currentWord.imageUrl} alt="Hint" className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-slate-200 flex flex-col items-center p-6">
                            <ImageIcon size={48} />
                            <p className="text-[9px] font-black mt-2 uppercase tracking-widest">No Image</p>
                          </div>
                        )}
                        {!isChecked && (
                            <button 
                                onClick={() => handlePlaySound(currentWord.character)}
                                className="absolute inset-0 bg-indigo-900/10 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
                            >
                                <div className="bg-white p-3 rounded-xl shadow-xl text-indigo-600">
                                    <Volume2 size={24} />
                                </div>
                            </button>
                        )}
                    </div>
                </div>

                {isChecked && currentWord.radicalAnalysis && (
                     <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-100 shadow-sm flex gap-3 animate-in slide-in-from-left-4 max-h-48 overflow-y-auto scrollbar-thin">
                        <Layers size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[8px] text-emerald-600 uppercase font-black tracking-widest mb-1">Cấu tạo chữ</p>
                          <p className="text-slate-700 text-[12px] font-semibold leading-snug break-words">{currentWord.radicalAnalysis}</p>
                        </div>
                     </div>
                )}
            </div>

            {/* Right Column */}
            <div className="flex-1 w-full min-w-0">
              {!isChecked ? (
                <div className="space-y-6 flex flex-col justify-center py-6 md:py-12">
                  <div className="text-center space-y-4">
                    <h3 className="text-slate-400 text-[9px] font-black uppercase tracking-[0.3em]">Ghi lại mặt chữ</h3>
                    <form onSubmit={handleCheck} className="relative max-w-xs md:max-w-md mx-auto w-full">
                      <input
                        ref={inputRef}
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="?"
                        className="w-full px-6 py-8 md:py-10 bg-white border-4 border-slate-100 rounded-[2.5rem] text-5xl md:text-7xl chinese-font focus:border-indigo-500 outline-none transition-all shadow-xl font-bold text-center"
                        autoComplete="off"
                        required
                      />
                    </form>
                  </div>
                  
                  <div className="flex gap-3 max-w-xs mx-auto w-full">
                    <button 
                      onClick={handleCheck}
                      disabled={!userInput.trim()}
                      className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-xs tracking-widest uppercase hover:bg-black transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                      KIỂM TRA (Enter)
                    </button>
                    <button onClick={showHint} className="px-4 py-4 bg-white text-slate-400 border border-slate-200 rounded-2xl font-black text-[9px] uppercase hover:bg-slate-50 transition-colors">
                      QUÊN
                    </button>
                  </div>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-6 duration-500 space-y-4">
                   {/* Word Card */}
                   <div className={`p-6 md:p-8 rounded-[2.5rem] border-2 shadow-xl relative overflow-hidden bg-white ${isCorrect ? 'border-emerald-500' : 'border-red-500'}`}>
                      <div className={`absolute top-0 right-0 px-4 py-1.5 font-black text-[8px] tracking-widest uppercase rounded-bl-xl ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                        {isCorrect ? 'ĐÚNG' : 'SAI'}
                      </div>

                      <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 mb-4">
                        <h2 className={`font-black chinese-font leading-none text-slate-900 break-all ${currentWord.character.length > 2 ? 'text-4xl md:text-5xl' : 'text-6xl md:text-7xl'}`}>
                            {currentWord.character}
                        </h2>
                        <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-3 mb-1 flex-wrap">
                              <p className={`font-black text-indigo-600 break-all ${currentWord.pinyin.length > 10 ? 'text-xl' : 'text-2xl md:text-3xl'}`}>
                                {currentWord.pinyin}
                              </p>
                              {currentWord.wordType && (
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase border border-indigo-100">
                                  {currentWord.wordType}
                                </span>
                              )}
                           </div>
                           <p className="text-base md:text-lg font-bold text-slate-400 leading-tight break-words">
                               {currentWord.meaning}
                           </p>
                        </div>
                        
                        <div className="flex gap-2 shrink-0 self-end md:self-center">
                            <button onClick={() => handlePlaySound(currentWord.character)} className="p-3 bg-slate-50 rounded-xl hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all border border-slate-100">
                                <Volume2 size={20} />
                            </button>
                            <button 
                                onClick={() => isRecording === 'word' ? stopAndEvaluate('word') : startPractice('word')} 
                                disabled={isProcessing}
                                className={`p-3 rounded-xl transition-all shadow-md ${isRecording === 'word' ? 'bg-red-500 text-white animate-pulse' : isProcessing ? 'bg-slate-100 text-slate-300' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                            >
                                {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Mic size={20} />}
                            </button>
                        </div>
                      </div>

                      {/* AI Feedback */}
                      {pronunciationFeedback.feedback && (
                        <div className={`p-4 rounded-2xl border animate-in slide-in-from-top-2 flex gap-3 ${
                            pronunciationFeedback.status === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-900' : 
                            pronunciationFeedback.status === 'error' ? 'bg-orange-50 border-orange-100 text-orange-900' :
                            'bg-white text-indigo-600 border-indigo-100'
                        }`}>
                           <div className="shrink-0 mt-0.5">
                               {pronunciationFeedback.status === 'success' ? <GraduationCap size={24} className="text-emerald-500" /> : 
                                pronunciationFeedback.status === 'error' ? <ShieldAlert size={24} className="text-orange-500" /> :
                                <Loader2 className="animate-spin" size={24} />}
                           </div>
                           <div className="flex-1 text-[12px] min-w-0">
                              <p className="text-[9px] font-black uppercase opacity-60 mb-0.5">AI Nhận xét ({pronunciationFeedback.score}%)</p>
                              <p className="font-bold leading-tight break-words">{pronunciationFeedback.feedback}</p>
                           </div>
                        </div>
                      )}
                   </div>

                   {/* Secondary Info */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group min-h-[140px] flex flex-col">
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
                          <div className="flex justify-between items-start mb-2 shrink-0">
                            <p className="text-[8px] text-indigo-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                              <Info size={10} /> Ví dụ
                            </p>
                          </div>
                          <div className="space-y-1.5 overflow-y-auto max-h-40 pr-1 scrollbar-thin">
                            <p className="text-slate-800 font-bold chinese-font text-lg leading-tight break-words">{currentWord.example}</p>
                            <p className="text-slate-400 text-[10px] italic font-medium leading-tight break-words">{currentWord.examplePinyin}</p>
                            <p className="text-slate-500 text-[12px] font-medium border-t border-slate-50 pt-2 mt-2 leading-relaxed break-words">{currentWord.exampleTranslation}</p>
                          </div>
                      </div>

                      {currentWord.grammarNote && (
                          <div className="bg-amber-50/50 p-5 rounded-3xl border border-amber-100 shadow-sm flex gap-3 min-h-[140px]">
                              <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 shrink-0 border border-amber-200">
                                  <Lightbulb size={16} />
                              </div>
                              <div className="flex-1 overflow-y-auto max-h-40 scrollbar-thin pr-1">
                                  <p className="text-[8px] text-amber-600 font-black uppercase tracking-widest mb-1">Ngữ pháp</p>
                                  <p className="text-slate-700 text-[12px] font-semibold leading-relaxed italic break-words">{currentWord.grammarNote}</p>
                              </div>
                          </div>
                      )}
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {isChecked && (
          <div className="p-4 md:p-6 bg-white grid grid-cols-4 gap-2 md:gap-4 border-t border-slate-100 shadow-inner sticky bottom-0 z-20 shrink-0">
            <button 
              onClick={() => handleGrade('again')}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${!isCorrect ? 'bg-red-50 border-red-500 text-red-600' : 'border-slate-50 text-slate-300 hover:border-red-100 hover:text-red-400'}`}
              title="Phím tắt: Space"
            >
              <RotateCcw size={18} className="mb-0.5" />
              <span className="text-[8px] font-black uppercase">Ôn lại (Space)</span>
            </button>
            <button 
              onClick={() => handleGrade('hard')}
              className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-100 hover:bg-orange-50 text-orange-400"
              title="Phím tắt: 1"
            >
              <span className="text-xl mb-0.5">☹️</span>
              <span className="text-[8px] font-black uppercase">Khó (1)</span>
            </button>
            <button 
              onClick={() => handleGrade('good')}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${isCorrect ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'border-slate-50 text-slate-300 hover:border-indigo-100 hover:text-indigo-400'}`}
              title="Phím tắt: Enter"
            >
              <span className="text-xl mb-0.5">🙂</span>
              <span className="text-[8px] font-black uppercase">Nhớ (Enter)</span>
            </button>
            <button 
              onClick={() => handleGrade('easy')}
              className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-100 hover:bg-emerald-50 text-emerald-500"
              title="Phím tắt: 2"
            >
              <span className="text-xl mb-0.5">🤩</span>
              <span className="text-[8px] font-black uppercase">Dễ (2)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
