
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Word, ReviewGrade, Folder } from './types';
import { WordCard } from './components/WordCard';
import { AddWordModal } from './components/AddWordModal';
import { ReviewSession } from './components/ReviewSession';
import { ConversationLab } from './components/ConversationLab';
import { ReflexLab } from './components/ReflexLab';
import { dbService } from './services/dbService';
import { 
  Plus, 
  BookOpen, 
  Search, 
  Zap, 
  Trash2, 
  X, 
  Check, 
  Download, 
  Upload, 
  MessagesSquare,
  FolderPlus,
  AlertCircle,
  Copy,
  Database,
  ShieldCheck,
  History,
  Target
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

const App: React.FC = () => {
  const [words, setWords] = useState<Word[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReviewConfig, setShowReviewConfig] = useState(false);
  const [showReviewSession, setShowReviewSession] = useState(false);
  const [showConvLab, setShowConvLab] = useState(false);
  const [showReflexLab, setShowReflexLab] = useState(false);
  const [showDataSettings, setShowDataSettings] = useState(false);
  
  const [reviewWords, setReviewWords] = useState<Word[]>([]);
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [reviewLimit, setReviewLimit] = useState<number | 'all'>(20);
  
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initApp = async () => {
      try {
        await dbService.init();
        const [initialWords, initialFolders] = await Promise.all([
          dbService.getAllWords(),
          dbService.getAllFolders()
        ]);
        setWords(initialWords || []);
        setFolders(initialFolders || []);
      } catch (err: any) {
        setInitError(err.toString());
      } finally {
        setIsLoading(false);
      }
    };
    initApp();
  }, []);

  const handleAddWord = async (wordData: Partial<Word>) => {
    try {
      let newWord: Word;
      if (editingWord) {
        newWord = { ...editingWord, ...wordData } as Word;
        setWords(prev => prev.map(w => w.id === editingWord.id ? newWord : w));
      } else {
        newWord = {
          id: generateId(),
          character: wordData.character || '',
          pinyin: wordData.pinyin || '',
          meaning: wordData.meaning || '',
          folderId: wordData.folderId,
          wordType: wordData.wordType,
          grammarNote: wordData.grammarNote,
          radicalAnalysis: wordData.radicalAnalysis,
          example: wordData.example || '',
          examplePinyin: wordData.examplePinyin || '',
          exampleTranslation: wordData.exampleTranslation || '',
          imageUrl: wordData.imageUrl,
          level: 0,
          nextReviewDate: Date.now(),
          createdAt: Date.now(),
        };
        setWords(prev => [newWord, ...prev]);
      }
      await dbService.saveWord(newWord);
      setShowAddModal(false);
      setEditingWord(null);
    } catch (err) {
      alert("Lỗi khi lưu từ vựng!");
    }
  };

  const handleDeleteWord = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa từ này?')) return;
    try {
      await dbService.deleteWord(id);
      setWords(prev => prev.filter(w => w.id !== id));
    } catch (err) {
      alert("Lỗi khi xóa từ vựng!");
    }
  };

  const handleExportData = async () => {
    try {
      const data = await dbService.getFullBackup();
      if (data.words.length === 0 && data.folders.length === 0) {
        alert("Không có dữ liệu để xuất!");
        return;
      }
      
      const backupData = {
        version: 1,
        exportDate: new Date().toISOString(),
        ...data
      };
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `zhongwen-mastery-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      
      alert("Đã tạo file sao lưu thành công. Hãy cất giữ file này cẩn thận!");
    } catch (err) {
      alert("Lỗi khi xuất dữ liệu: " + err);
    }
  };

  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("CẢNH BÁO: Toàn bộ từ vựng hiện tại của bạn sẽ bị THAY THẾ bằng dữ liệu từ file này. Bạn có chắc chắn đã sao lưu dữ liệu hiện tại chưa?")) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);

        if (!data || !Array.isArray(data.words)) {
          throw new Error("File sao lưu không hợp lệ hoặc sai định dạng.");
        }

        setIsLoading(true);
        await dbService.importData(data.words, data.folders || []);
        alert(`Thành công! Đã nạp ${data.words.length} từ vựng. Ứng dụng sẽ khởi động lại để cập nhật.`);
        window.location.reload();
      } catch (err: any) {
        alert("Lỗi nhập dữ liệu: " + err.message);
        setIsLoading(false);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleCopyBackupCode = async () => {
    try {
      const data = await dbService.getFullBackup();
      const code = JSON.stringify(data);
      await navigator.clipboard.writeText(code);
      alert("Đã sao chép toàn bộ mã dữ liệu vào bộ nhớ tạm. Bạn có thể dán vào file văn bản để lưu trữ!");
    } catch (err) {
      alert("Không thể sao chép dữ liệu.");
    }
  };

  const handleSaveNewFolder = async () => {
    const trimmedName = newFolderName.trim();
    if (!trimmedName) {
      setIsAddingFolder(false);
      return;
    }
    const newFolder: Folder = { id: generateId(), name: trimmedName, createdAt: Date.now() };
    try {
      await dbService.saveFolder(newFolder);
      setFolders(prev => [...prev, newFolder]);
      setNewFolderName('');
      setIsAddingFolder(false);
      setSelectedFolderId(newFolder.id);
    } catch (err) {
      alert("Lỗi tạo thư mục!");
    }
  };

  const handleDeleteFolder = async (id: string, name: string) => {
    if (!confirm(`Xóa thư mục "${name}"? Các từ sẽ về "Chưa phân loại".`)) return;
    try {
      await dbService.deleteFolder(id);
      setFolders(prev => prev.filter(f => f.id !== id));
      if (selectedFolderId === id) setSelectedFolderId(null);
      const updatedWords = words.map(w => w.folderId === id ? { ...w, folderId: undefined } : w);
      setWords(updatedWords);
    } catch (err) {
      alert("Lỗi xóa thư mục!");
    }
  };

  const handleReviewFinish = async (results: { id: string, grade: ReviewGrade }[]) => {
    const updatedWords = words.map(word => {
      const result = results.find(r => r.id === word.id);
      if (!result) return word;
      let newLevel = word.level;
      let interval = 1; 
      switch (result.grade) {
        case 'again': newLevel = Math.max(0, newLevel - 1); interval = 0.5; break;
        case 'hard': newLevel = Math.min(5, newLevel + 0.5); interval = 1; break;
        case 'good': newLevel = Math.min(5, newLevel + 1); interval = 3; break;
        case 'easy': newLevel = Math.min(5, newLevel + 2); interval = 7; break;
      }
      const nextReviewDate = Date.now() + interval * 24 * 60 * 60 * 1000;
      return { ...word, level: Math.floor(newLevel), nextReviewDate };
    });
    setWords(updatedWords);
    await dbService.saveAllWords(updatedWords);
    setShowReviewSession(false);
  };

  const startReview = () => {
    if (words.length === 0) return alert("Hãy thêm từ vựng trước!");
    let candidates = selectedFolderId === 'uncategorized' ? words.filter(w => !w.folderId) : selectedFolderId ? words.filter(w => w.folderId === selectedFolderId) : words;
    if (candidates.length === 0) return alert("Không có từ để ôn tập!");
    const sortedWords = [...candidates].sort((a, b) => (a.nextReviewDate || 0) - (b.nextReviewDate || 0));
    setReviewWords(reviewLimit === 'all' ? sortedWords : sortedWords.slice(0, reviewLimit));
    setShowReviewConfig(false);
    setShowReviewSession(true);
  };

  const filteredWords = useMemo(() => {
    let result = words;
    if (selectedFolderId === 'uncategorized') result = result.filter(w => !w.folderId);
    else if (selectedFolderId) result = result.filter(w => w.folderId === selectedFolderId);
    const term = searchTerm.toLowerCase().trim();
    if (term) {
      result = result.filter(w => 
        (w.character?.toLowerCase() || '').includes(term) ||
        (w.pinyin?.toLowerCase() || '').includes(term) ||
        (w.meaning?.toLowerCase() || '').includes(term)
      );
    }
    return result;
  }, [words, selectedFolderId, searchTerm]);

  const dueCount = useMemo(() => words.filter(w => (w.nextReviewDate || 0) <= Date.now()).length, [words]);
  const statsData = useMemo(() => [0,1,2,3,4,5].map(l => ({
    level: `Lvl ${l}`,
    count: words.filter(w => w.level === l).length,
    fill: ['#94a3b8', '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#10b981'][l]
  })), [words]);

  if (initError) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mb-6 shadow-xl"><AlertCircle size={48} /></div>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Lỗi Khởi Tạo</h1>
      <button onClick={() => window.location.reload()} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold">Thử lại</button>
    </div>
  );

  if (isLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold animate-bounce shadow-xl">中</div>
      <p className="mt-4 text-slate-400 font-black text-[10px] uppercase tracking-[0.3em]">Đang đồng bộ dữ liệu...</p>
    </div>
  );

  return (
    <div className="min-h-screen pb-20 bg-slate-50/50">
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setSelectedFolderId(null)}>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">中</div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight hidden lg:block">Zhongwen Mastery</h1>
          </div>

          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm từ vựng..."
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowDataSettings(true)}
              className="p-2 text-slate-400 hover:text-indigo-600 rounded-xl transition-all relative"
              title="Quản lý dữ liệu & Sao lưu"
            >
              <Database size={20} />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full border-2 border-white"></span>
            </button>
            
            <button 
              onClick={() => setShowConvLab(true)} 
              className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all" 
              title="AI Conversation Lab"
            >
              <MessagesSquare size={20} />
            </button>

            <button 
              onClick={() => setShowReflexLab(true)} 
              className="p-2 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-xl transition-all" 
              title="AI Reflex Lab"
            >
              <Target size={20} />
            </button>

            <button onClick={() => setShowReviewConfig(true)} className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 hover:bg-emerald-600 transition-all shadow-lg relative shrink-0">
              <Zap size={18} />
              <span className="hidden sm:inline">Ôn tập</span>
              {dueCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center border-2 border-white font-black">{dueCount}</span>}
            </button>
            <button onClick={() => { setEditingWord(null); setShowAddModal(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 hover:bg-indigo-700 shadow-lg shrink-0">
              <Plus size={18} />
              <span className="hidden sm:inline">Thêm từ</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Banner Nhắc nhở Sao lưu */}
        <div className="mb-8 bg-indigo-600 rounded-3xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-indigo-100 overflow-hidden relative">
          <div className="absolute top-0 right-0 opacity-10 -translate-y-1/2 translate-x-1/2">
            <ShieldCheck size={200} />
          </div>
          <div className="relative z-10 text-center md:text-left">
            <h2 className="text-xl font-black mb-1 flex items-center gap-2 justify-center md:justify-start">
               <ShieldCheck size={24} /> Bảo vệ dữ liệu của bạn
            </h2>
            <p className="text-indigo-100 text-sm max-w-md">Dữ liệu được lưu tại trình duyệt này. Hãy thường xuyên xuất file sao lưu để không bị mất từ vựng đã học.</p>
          </div>
          <button 
            onClick={handleExportData}
            className="relative z-10 bg-white text-indigo-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <Download size={18} /> Sao lưu ngay
          </button>
        </div>

        <div className="mb-8 flex flex-wrap items-center gap-2">
          <button onClick={() => setSelectedFolderId(null)} className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all border ${selectedFolderId === null ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-400 border-slate-100 hover:border-indigo-200'}`}>
            Tất cả ({words.length})
          </button>
          <button onClick={() => setSelectedFolderId('uncategorized')} className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all border ${selectedFolderId === 'uncategorized' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-400 border-slate-100 hover:border-indigo-200'}`}>
            Chưa phân loại ({words.filter(w => !w.folderId).length})
          </button>
          {folders.map(f => (
            <div key={f.id} className="relative group">
              <button onClick={() => setSelectedFolderId(f.id)} className={`px-6 py-2 pr-10 rounded-full text-xs font-black uppercase tracking-wider transition-all border ${selectedFolderId === f.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-400 border-slate-100 hover:border-indigo-200'}`}>
                {f.name} ({words.filter(w => w.folderId === f.id).length})
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleDeleteFolder(f.id, f.name); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
            </div>
          ))}
          {isAddingFolder ? (
            <div className="flex items-center bg-white border-2 border-indigo-500 rounded-full pl-4 pr-1 py-1 shadow-lg animate-in zoom-in-90">
              <input ref={folderInputRef} type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveNewFolder()} className="bg-transparent border-none outline-none text-xs font-bold w-24 sm:w-32" placeholder="Tên thư mục..." autoFocus />
              <button onClick={handleSaveNewFolder} className="p-1.5 text-emerald-500 hover:scale-110"><Check size={16} /></button>
              <button onClick={() => setIsAddingFolder(false)} className="p-1.5 text-red-400 hover:scale-110"><X size={16} /></button>
            </div>
          ) : (
            <button onClick={() => setIsAddingFolder(true)} className="w-10 h-10 rounded-full bg-white text-indigo-500 border border-indigo-100 flex items-center justify-center hover:bg-indigo-600 hover:text-white shadow-md transition-all"><FolderPlus size={18} /></button>
          )}
        </div>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 h-64">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statsData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="level" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>{statsData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
          </div>
          <div className="bg-slate-900 rounded-3xl p-8 shadow-xl text-white flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 opacity-10 -translate-y-1/4 translate-x-1/4">
                 <BookOpen size={160} />
              </div>
              <p className="text-5xl font-black mb-2 relative z-10">{filteredWords.length}</p>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.3em] relative z-10">Từ vựng hiện có</p>
          </div>
        </section>

        {filteredWords.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredWords.map(word => (
              <WordCard key={word.id} word={word} onDelete={handleDeleteWord} onEdit={(w) => { setEditingWord(w); setShowAddModal(true); }} />
            ))}
          </div>
        ) : (
          <div className="py-24 text-center bg-white rounded-[3rem] border-4 border-dashed border-slate-100 text-slate-400">
            <BookOpen className="mx-auto mb-4 opacity-20" size={64} />
            <p className="font-bold text-lg">Danh sách đang trống</p>
            <p className="text-sm">Bấm "Thêm từ" để bắt đầu hành trình học tập.</p>
          </div>
        )}
      </main>

      {/* Modal Quản lý dữ liệu chuyên sâu */}
      {showDataSettings && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[150] animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl relative overflow-hidden">
            <button onClick={() => setShowDataSettings(false)} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-600 transition-colors"><X size={24} /></button>
            <div className="mb-8">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-4"><Database size={24} /></div>
              <h2 className="text-2xl font-black text-slate-800">Quản lý dữ liệu</h2>
              <p className="text-slate-400 text-sm">Hãy cẩn thận khi thực hiện các thao tác thay thế dữ liệu.</p>
            </div>

            <div className="space-y-4">
               <button onClick={handleExportData} className="w-full flex items-center justify-between p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-300 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"><Download size={20} /></div>
                    <div className="text-left">
                      <p className="text-sm font-black text-slate-800 uppercase tracking-wider">Xuất file sao lưu (.json)</p>
                      <p className="text-[10px] text-slate-400">Lưu lại toàn bộ từ vựng & ảnh minh họa.</p>
                    </div>
                  </div>
               </button>

               <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-between p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-emerald-300 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"><Upload size={20} /></div>
                    <div className="text-left">
                      <p className="text-sm font-black text-slate-800 uppercase tracking-wider">Nhập dữ liệu mới (Restore)</p>
                      <p className="text-[10px] text-slate-400">Thay thế dữ liệu hiện tại bằng file dự phòng.</p>
                    </div>
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleImportData} className="hidden" accept=".json" />
               </button>

               <button onClick={handleCopyBackupCode} className="w-full flex items-center justify-between p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-orange-300 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"><Copy size={20} /></div>
                    <div className="text-left">
                      <p className="text-sm font-black text-slate-800 uppercase tracking-wider">Sao chép mã dữ liệu</p>
                      <p className="text-[10px] text-slate-400">Copy văn bản thô để dán vào file Note cá nhân.</p>
                    </div>
                  </div>
               </button>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-3 text-orange-500">
               <AlertCircle size={20} className="shrink-0" />
               <p className="text-[10px] font-bold leading-tight uppercase">Mẹo: Hãy lưu file backup vào Google Drive hoặc iCloud để không bao giờ mất dữ liệu.</p>
            </div>
          </div>
        </div>
      )}

      {showReviewConfig && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[150] animate-in zoom-in-95">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl">
            <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
              <History className="text-indigo-600" /> Cấu hình ôn tập
            </h2>
            <div className="grid grid-cols-2 gap-3 mb-8">
              {[10, 20, 50, 'all'].map(limit => (
                <button key={limit} onClick={() => setReviewLimit(limit as any)} className={`py-4 rounded-2xl font-bold border-2 transition-all ${reviewLimit === limit ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200'}`}>
                  {limit === 'all' ? 'Tất cả' : `${limit} từ`}
                </button>
              ))}
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowReviewConfig(false)} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest">Hủy</button>
              <button onClick={startReview} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl shadow-indigo-100 tracking-widest active:scale-95">Bắt đầu ngay</button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && <AddWordModal onClose={() => setShowAddModal(false)} onSave={handleAddWord} editingWord={editingWord} />}
      {showReviewSession && <ReviewSession wordsToReview={reviewWords} onClose={() => setShowReviewSession(false)} onFinish={handleReviewFinish} />}
      {showConvLab && <ConversationLab allWords={words} onClose={() => setShowConvLab(false)} />}
      {showReflexLab && <ReflexLab allWords={words} onClose={() => setShowReflexLab(false)} />}
    </div>
  );
};

export default App;
