
import React, { useState, useEffect } from 'react';
import { Word, Folder } from '../types';
import { X, Sparkles, Loader2, Image as ImageIcon, Wand2, Link as LinkIcon, Volume2, BookMarked, MessageSquareText, Layers, Folder as FolderIcon } from 'lucide-react';
import { enrichWord, generateWordImage } from '../services/geminiService';
import { speak } from '../services/audioService';
import { dbService } from '../services/dbService';

interface AddWordModalProps {
  onClose: () => void;
  onSave: (word: Partial<Word>) => void;
  editingWord?: Word | null;
}

export const AddWordModal: React.FC<AddWordModalProps> = ({ onClose, onSave, editingWord }) => {
  const [character, setCharacter] = useState(editingWord?.character || '');
  const [pinyin, setPinyin] = useState(editingWord?.pinyin || '');
  const [meaning, setMeaning] = useState(editingWord?.meaning || '');
  const [folderId, setFolderId] = useState(editingWord?.folderId || '');
  const [wordType, setWordType] = useState(editingWord?.wordType || '');
  const [grammarNote, setGrammarNote] = useState(editingWord?.grammarNote || '');
  const [radicalAnalysis, setRadicalAnalysis] = useState(editingWord?.radicalAnalysis || '');
  const [example, setExample] = useState(editingWord?.example || '');
  const [examplePinyin, setExamplePinyin] = useState(editingWord?.examplePinyin || '');
  const [exampleTranslation, setExampleTranslation] = useState(editingWord?.exampleTranslation || '');
  const [imageUrl, setImageUrl] = useState(editingWord?.imageUrl || '');
  
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  useEffect(() => {
    const fetchFolders = async () => {
      const data = await dbService.getAllFolders();
      setFolders(data);
    };
    fetchFolders();
  }, []);

  const handleEnrich = async () => {
    if (!character) return;
    setIsEnriching(true);
    const result = await enrichWord(character);
    if (result) {
      setPinyin(result.pinyin);
      setMeaning(result.meaning);
      setWordType(result.wordType);
      setGrammarNote(result.grammarNote);
      setRadicalAnalysis(result.radicalAnalysis);
      setExample(result.example);
      setExamplePinyin(result.examplePinyin);
      setExampleTranslation(result.exampleTranslation);
      speak(character);
    }
    setIsEnriching(false);
  };

  const handleGenerateImage = async () => {
    if (!character || !meaning) {
        alert("Cần Hán tự và Nghĩa để AI vẽ ảnh.");
        return;
    }
    setIsGeneratingImage(true);
    const generatedBase64 = await generateWordImage(character, meaning);
    if (generatedBase64) {
      setImageUrl(generatedBase64);
    }
    setIsGeneratingImage(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      character,
      pinyin,
      meaning,
      folderId,
      wordType,
      grammarNote,
      radicalAnalysis,
      example,
      examplePinyin,
      exampleTranslation,
      imageUrl,
      level: editingWord?.level ?? 0,
      nextReviewDate: editingWord?.nextReviewDate ?? Date.now(),
      createdAt: editingWord?.createdAt ?? Date.now(),
    });
  };

  const isBase64 = imageUrl.startsWith('data:');

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh] border border-white/20">
        
        {/* Header */}
        <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200">
                <Sparkles size={28} />
            </div>
            <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase leading-none mb-1">
                    {editingWord ? 'Cập nhật từ' : 'Thêm từ mới'}
                </h2>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <p className="text-[10px] text-slate-400 font-black tracking-[0.2em] uppercase">Gemini AI Assistant</p>
                </div>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-full text-slate-300 hover:text-slate-600 transition-all active:scale-90">
            <X size={32} />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-50/30">
          <div className="flex flex-col lg:flex-row gap-12">
            
            <div className="flex-1 space-y-8">
                <section>
                    <label className="block text-[11px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-3 ml-1">Hán tự (Character)</label>
                    <div className="space-y-3">
                        <div className="relative group">
                            <input 
                                type="text" 
                                value={character}
                                onChange={(e) => setCharacter(e.target.value)}
                                placeholder="Nhập Hán tự..."
                                className="w-full px-8 py-6 border-2 border-slate-100 rounded-[2rem] focus:ring-0 focus:border-indigo-500 outline-none transition-all chinese-font text-5xl bg-white shadow-sm placeholder:text-slate-200 font-bold"
                                required
                            />
                            {character && (
                              <button 
                                type="button"
                                onClick={() => speak(character)}
                                className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-all"
                              >
                                <Volume2 size={28} />
                              </button>
                            )}
                        </div>
                        <button 
                            type="button"
                            onClick={handleEnrich}
                            disabled={!character || isEnriching}
                            className="w-full bg-indigo-600 text-white py-5 rounded-[1.5rem] hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-100 active:scale-95 group"
                        >
                            {isEnriching ? <Loader2 className="animate-spin" size={20} /> : <Sparkles className="group-hover:rotate-12 transition-transform" size={20} />}
                            <span className="font-black uppercase tracking-widest text-xs">AI tự động hoàn thiện thông tin</span>
                        </button>
                    </div>
                </section>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <section>
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Pinyin (Phiên âm)</label>
                        <input 
                            type="text" 
                            value={pinyin}
                            onChange={(e) => setPinyin(e.target.value)}
                            placeholder="Vd: xué xí"
                            className="w-full px-6 py-4 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none bg-white font-bold text-lg text-indigo-600"
                            required
                        />
                    </section>
                    <section>
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Nghĩa Việt</label>
                        <input 
                            type="text" 
                            value={meaning}
                            onChange={(e) => setMeaning(e.target.value)}
                            placeholder="Vd: Học tập"
                            className="w-full px-6 py-4 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none bg-white font-bold text-lg"
                            required
                        />
                    </section>
                </div>

                <section>
                    <label className="block text-[11px] font-black text-amber-600 uppercase tracking-[0.2em] mb-2 ml-1 flex items-center gap-2">
                        <FolderIcon size={14} /> Chọn thư mục (Phân loại)
                    </label>
                    <select 
                      value={folderId}
                      onChange={(e) => setFolderId(e.target.value)}
                      className="w-full px-6 py-4 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none bg-white font-bold text-slate-700 shadow-sm appearance-none cursor-pointer"
                    >
                      <option value="">Chưa phân loại</option>
                      {folders.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                </section>

                <section>
                    <label className="block text-[11px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-2 ml-1 flex items-center gap-2">
                        <Layers size={14} /> Phân tích bộ chữ (Radicals)
                    </label>
                    <textarea 
                        value={radicalAnalysis}
                        onChange={(e) => setRadicalAnalysis(e.target.value)}
                        placeholder="Vd: Chữ 妈 gồm bộ Nữ (女) và chữ Mã (马)..."
                        className="w-full px-6 py-4 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none bg-white font-medium text-slate-600 min-h-[80px]"
                    />
                </section>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <section>
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Loại từ</label>
                        <div className="relative">
                          <BookMarked size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                              type="text" 
                              value={wordType}
                              onChange={(e) => setWordType(e.target.value)}
                              placeholder="Danh từ, Động từ..."
                              className="w-full pl-12 pr-6 py-4 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none bg-white font-bold text-slate-700"
                          />
                        </div>
                    </section>
                    <section>
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Ghi chú ngữ pháp</label>
                        <div className="relative">
                          <MessageSquareText size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                              type="text" 
                              value={grammarNote}
                              onChange={(e) => setGrammarNote(e.target.value)}
                              placeholder="Quy tắc sử dụng..."
                              className="w-full pl-12 pr-6 py-4 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none bg-white font-medium text-slate-600"
                          />
                        </div>
                    </section>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <section>
                      <div className="flex justify-between items-center mb-2 ml-1">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Ví dụ đặt câu (Tiếng Trung)</label>
                        {example && (
                          <button type="button" onClick={() => speak(example)} className="flex items-center gap-2 text-indigo-500 hover:text-indigo-700 font-bold text-[10px] uppercase tracking-wider">
                            <Volume2 size={16} /> Nghe ví dụ
                          </button>
                        )}
                      </div>
                      <input 
                          type="text"
                          value={example}
                          onChange={(e) => setExample(e.target.value)}
                          placeholder="Vd: 我们要好好学习。"
                          className="w-full px-6 py-5 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none bg-white font-bold text-slate-700 text-lg shadow-sm chinese-font"
                      />
                  </section>
                  <section>
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Pinyin ví dụ</label>
                      <input 
                          type="text"
                          value={examplePinyin}
                          onChange={(e) => setExamplePinyin(e.target.value)}
                          placeholder="Vd: Wǒmen yào hǎohǎo xuéxí."
                          className="w-full px-6 py-4 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none bg-white font-medium text-indigo-400 text-sm shadow-sm"
                      />
                  </section>
                  <section>
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Bản dịch ví dụ (Tiếng Việt)</label>
                      <input 
                          type="text"
                          value={exampleTranslation}
                          onChange={(e) => setExampleTranslation(e.target.value)}
                          placeholder="Vd: Chúng ta cần học tập thật tốt."
                          className="w-full px-6 py-5 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none bg-white italic text-slate-500 text-lg shadow-sm"
                      />
                  </section>
                </div>
            </div>

            <div className="lg:w-80 shrink-0 space-y-8">
                <section>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Minh họa trực quan</label>
                    <div className="aspect-square bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] overflow-hidden flex items-center justify-center relative group shadow-sm">
                        {imageUrl ? (
                            <>
                                <img src={imageUrl} alt="Preview" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                    <button 
                                        type="button" 
                                        onClick={() => setImageUrl('')}
                                        className="bg-white text-red-500 px-6 py-3 rounded-2xl flex items-center gap-2 text-xs font-black shadow-2xl hover:bg-red-50 transition-all uppercase tracking-widest active:scale-95"
                                    >
                                        <X size={18} /> Gỡ ảnh
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="text-center p-8">
                                <div className="w-20 h-20 bg-slate-50 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                    <ImageIcon className="text-slate-200" size={40} />
                                </div>
                                <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Trống</p>
                            </div>
                        )}
                        {isGeneratingImage && (
                            <div className="absolute inset-0 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center z-10 p-6 text-center">
                                <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
                                <p className="text-[10px] font-black text-indigo-600 animate-pulse tracking-[0.3em] uppercase">AI đang kiến tạo hình ảnh...</p>
                            </div>
                        )}
                    </div>
                </section>

                <div className="space-y-4">
                    <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                            <LinkIcon size={18} />
                        </div>
                        <input 
                            type="text" 
                            value={isBase64 ? '' : imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            placeholder={isBase64 ? "✨ Ảnh được tạo bởi AI" : "Link ảnh từ Web..."}
                            disabled={isBase64}
                            className={`w-full pl-12 pr-4 py-4 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none transition-all text-[12px] font-bold ${isBase64 ? 'bg-indigo-50 text-indigo-400 border-indigo-100 italic' : 'bg-white shadow-sm'}`}
                        />
                    </div>
                    
                    <button 
                        type="button"
                        onClick={handleGenerateImage}
                        disabled={!character || !meaning || isGeneratingImage}
                        className="w-full bg-slate-100 text-indigo-600 py-5 rounded-[1.5rem] hover:bg-indigo-50 disabled:opacity-50 flex items-center justify-center gap-3 transition-all border-2 border-indigo-100 border-dashed group active:scale-95"
                    >
                        <Wand2 size={24} className="group-hover:rotate-12 transition-transform" />
                        <span className="font-black uppercase tracking-[0.15em] text-[10px]">Tạo ảnh AI (Gemini 2.5)</span>
                    </button>
                </div>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-10 py-8 bg-white border-t border-slate-100 flex gap-5 shrink-0">
          <button 
            type="button" 
            onClick={onClose}
            className="flex-1 px-8 py-5 bg-slate-50 text-slate-400 rounded-2xl font-black hover:bg-slate-100 transition-all uppercase tracking-[0.2em] text-[11px]"
          >
            Hủy bỏ
          </button>
          <button 
            type="button"
            onClick={handleSubmit}
            className="flex-[2] bg-slate-900 text-white px-8 py-5 rounded-2xl font-black hover:bg-black shadow-2xl shadow-slate-200 transition-all flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-[11px] active:scale-[0.98]"
          >
            <Sparkles size={20} />
            {editingWord ? 'Cập nhật từ vựng' : 'Xác nhận lưu từ'}
          </button>
        </div>
      </div>
    </div>
  );
};
