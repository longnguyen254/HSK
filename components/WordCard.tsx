
import React from 'react';
import { Word } from '../types';
import { Trash2, Edit2, Calendar, Image as ImageIcon, Volume2, Layers } from 'lucide-react';
import { speak } from '../services/audioService';

interface WordCardProps {
  word: Word;
  onDelete: (id: string) => void;
  onEdit: (word: Word) => void;
}

export const WordCard: React.FC<WordCardProps> = ({ word, onDelete, onEdit }) => {
  const getLevelColor = (level: number) => {
    const colors = [
      'bg-slate-100 text-slate-600',
      'bg-blue-100 text-blue-600',
      'bg-indigo-100 text-indigo-600',
      'bg-purple-100 text-purple-600',
      'bg-pink-100 text-pink-600',
      'bg-emerald-100 text-emerald-600',
    ];
    return colors[level] || colors[0];
  };

  const isDue = word.nextReviewDate <= Date.now();

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    action();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 group relative flex flex-col h-full min-h-[420px]">
      {/* Image Header */}
      <div className="h-28 bg-slate-100 relative overflow-hidden flex items-center justify-center shrink-0">
        {word.imageUrl ? (
            <img src={word.imageUrl} alt={word.character} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
        ) : (
            <ImageIcon className="text-slate-300" size={32} />
        )}
        <div className="absolute top-2 left-2 flex gap-1 flex-wrap pr-16">
            <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm ${getLevelColor(word.level)}`}>
              Lvl {word.level}
            </div>
            {word.wordType && (
              <div className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm bg-white/90 text-indigo-500 border border-indigo-50">
                {word.wordType}
              </div>
            )}
        </div>
        
        {/* Nút Edit và Delete nằm ở góc phải trên cùng */}
        <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
          <button 
            type="button"
            onClick={(e) => handleAction(e, () => onEdit(word))} 
            className="bg-white/95 p-2 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-white shadow-md transition-all active:scale-90"
            title="Chỉnh sửa"
          >
            <Edit2 size={16} />
          </button>
          <button 
            type="button"
            onClick={(e) => handleAction(e, () => onDelete(word.id))} 
            className="bg-white/95 p-2 rounded-xl text-slate-600 hover:text-red-600 hover:bg-red-50 shadow-md transition-all active:scale-90"
            title="Xóa từ vựng"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      <div className="p-4 flex flex-col flex-1 overflow-hidden">
        <div className="mb-2 flex justify-between items-start gap-2">
            <div className="min-w-0 flex-1">
              <h3 className={`font-bold chinese-font text-slate-800 leading-none mb-1 break-all ${word.character.length > 2 ? 'text-xl' : 'text-2xl'}`}>
                {word.character}
              </h3>
              <p className="text-indigo-500 text-[11px] font-bold tracking-wider truncate">{word.pinyin}</p>
            </div>
            <button 
              type="button"
              onClick={(e) => handleAction(e, () => speak(word.character))}
              className="p-2 text-slate-300 hover:text-indigo-500 transition-colors bg-slate-50 rounded-xl shrink-0 active:scale-90"
              title="Phát âm"
            >
              <Volume2 size={18} />
            </button>
        </div>

        <div className="flex-1 space-y-2 overflow-hidden flex flex-col">
            <div className="border-t border-slate-50 pt-2 shrink-0">
                <p className="text-slate-700 font-bold text-[12px] leading-snug line-clamp-2" title={word.meaning}>
                  {word.meaning}
                </p>
            </div>

            {/* Radical Analysis Snippet */}
            {word.radicalAnalysis && (
              <div className="flex items-start gap-1.5 text-[9px] text-emerald-600 font-medium leading-tight bg-emerald-50/50 p-2 rounded-lg shrink-0 overflow-hidden">
                 <Layers size={10} className="shrink-0 mt-0.5" />
                 <p className="line-clamp-2 italic">{word.radicalAnalysis}</p>
              </div>
            )}

            <div className="mt-1 bg-slate-50/50 p-2 rounded-lg border border-slate-100/50 flex-1 flex flex-col overflow-hidden">
              {word.examplePinyin && (
                <p className="text-indigo-400/60 text-[8px] font-black uppercase tracking-tighter leading-none mb-1 truncate">{word.examplePinyin}</p>
              )}
              <div className="flex items-start gap-2 overflow-hidden">
                <div className="flex-1 overflow-hidden">
                   <p className="text-slate-600 text-[10px] italic leading-relaxed line-clamp-3 chinese-font">{word.example}</p>
                   {word.exampleTranslation && (
                     <p className="text-slate-400 text-[9px] mt-1 line-clamp-1">{word.exampleTranslation}</p>
                   )}
                </div>
                <button 
                  type="button"
                  onClick={(e) => handleAction(e, () => speak(word.example))}
                  className="text-slate-300 hover:text-indigo-400 transition-colors shrink-0 mt-0.5 p-1 hover:bg-indigo-50 rounded-lg"
                >
                  <Volume2 size={12} />
                </button>
              </div>
            </div>
        </div>

        <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-50 shrink-0">
            <div className="flex items-center gap-1 text-[9px] font-bold text-slate-300 uppercase tracking-tighter">
                <Calendar size={10} />
                <span>Hẹn: {new Date(word.nextReviewDate || Date.now()).toLocaleDateString('vi-VN')}</span>
            </div>
            {isDue && (
              <div className="flex items-center gap-1">
                <span className="text-[8px] font-black text-orange-500 uppercase tracking-widest">Cần học</span>
                <span className="flex h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse"></span>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};
