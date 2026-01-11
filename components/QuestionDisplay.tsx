
import React, { useState, useEffect } from 'react';
import { Question } from '../types';
import { IconCheck, IconX, IconLanguages, IconTarget } from './Icons';
import { translations, UILang } from '../locales';

interface QuestionDisplayProps {
  question: Question;
  bilingualMode: 'en' | 'cn' | 'both';
  showAnswerDirectly: boolean;
  onRecordAnswer: (isCorrect: boolean) => void;
  stats: { correct: number; incorrect: number };
  uiLang: UILang;
}

const QuestionDisplay: React.FC<QuestionDisplayProps> = ({ 
  question, 
  bilingualMode, 
  showAnswerDirectly,
  onRecordAnswer,
  stats,
  uiLang
}) => {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const t = translations[uiLang];

  useEffect(() => {
    setSelectedKey(null);
    setIsAnswered(showAnswerDirectly);
  }, [question, showAnswerDirectly]);

  const handleOptionClick = (key: string) => {
    if (isAnswered) return;
    
    setSelectedKey(key);
    setIsAnswered(true);
    
    const isCorrect = question.answer_en.split(';').map(s => s.trim()).includes(key);
    onRecordAnswer(isCorrect);
  };

  const getOptionStatus = (key: string) => {
    if (!isAnswered && !showAnswerDirectly) return 'idle';
    const correctKeys = question.answer_en.split(';').map(s => s.trim());
    const isCorrect = correctKeys.includes(key);
    if (isCorrect) return 'correct';
    if (selectedKey === key && !isCorrect) return 'incorrect';
    return 'idle';
  };

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-500">
      {/* Sticky Meta Bar */}
      <div className="sticky top-0 z-30 -mx-4 px-4 py-3 bg-slate-50/80 backdrop-blur-md border-b border-slate-200/50 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Question ID</span>
          <span className="text-sm font-black text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-sm">#{question.question_id}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{t.progress}</span>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-50 text-emerald-700 text-xs font-black px-2.5 py-1 rounded-full border border-emerald-100">{stats.correct}</span>
              <span className="bg-rose-50 text-rose-700 text-xs font-black px-2.5 py-1 rounded-full border border-rose-100">{stats.incorrect}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-[2.5rem] p-6 md:p-12 shadow-sm border border-slate-100 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50/30 rounded-full -mr-24 -mt-24 transition-transform duration-1000 group-hover:scale-110"></div>
        <div className="space-y-6 relative z-10">
          {(bilingualMode === 'en' || bilingualMode === 'both') && (
            <h2 className="text-lg md:text-3xl font-extrabold leading-[1.4] text-slate-900 tracking-tight">{question.question_en}</h2>
          )}
          {(bilingualMode === 'cn' || bilingualMode === 'both') && (
            <h2 className="text-base md:text-2xl font-semibold leading-[1.6] text-slate-500 border-l-4 border-indigo-500/20 pl-6 italic">{question.question_cn}</h2>
          )}
        </div>
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-1 gap-3 md:gap-5">
        {Object.entries(question.options_en).map(([key, text]) => {
          const status = getOptionStatus(key);
          const cnText = question.options_cn[key];
          return (
            <button
              key={key}
              onClick={() => handleOptionClick(key)}
              disabled={isAnswered}
              className={`
                w-full text-left p-5 md:p-8 rounded-[2rem] border-2 transition-all duration-300 group relative flex items-start gap-4 md:gap-8
                ${status === 'idle' ? 'bg-white border-slate-50 hover:border-indigo-100 hover:bg-slate-50/30 shadow-sm active:scale-[0.99]' : ''}
                ${status === 'correct' ? 'bg-emerald-50/50 border-emerald-500 shadow-xl shadow-emerald-500/10' : ''}
                ${status === 'incorrect' ? 'bg-rose-50/50 border-rose-500 shadow-xl shadow-rose-500/10' : ''}
                ${isAnswered && status === 'idle' ? 'opacity-40 grayscale-[0.5]' : ''}
              `}
            >
              <span className={`
                shrink-0 w-10 h-10 md:w-16 md:h-16 rounded-2xl md:rounded-[1.5rem] flex items-center justify-center font-black text-sm md:text-xl transition-all shadow-sm
                ${status === 'idle' ? 'bg-slate-100 text-slate-400 group-hover:bg-slate-900 group-hover:text-white group-hover:rotate-6' : ''}
                ${status === 'correct' ? 'bg-emerald-500 text-white shadow-emerald-200' : ''}
                ${status === 'incorrect' ? 'bg-rose-500 text-white shadow-rose-200' : ''}
              `}>
                {key}
              </span>
              <div className="flex-1 pt-2 md:pt-4 space-y-2">
                {(bilingualMode === 'en' || bilingualMode === 'both') && (
                  <p className={`font-bold text-base md:text-xl ${status === 'correct' ? 'text-emerald-900' : status === 'incorrect' ? 'text-rose-900' : 'text-slate-800'}`}>{text}</p>
                )}
                {(bilingualMode === 'cn' || bilingualMode === 'both') && (
                  <p className="text-slate-400 text-xs md:text-base font-medium italic leading-relaxed">{cnText}</p>
                )}
              </div>
              {isAnswered && status === 'correct' && <div className="shrink-0 pt-2 text-emerald-500 animate-in zoom-in duration-300"><IconCheck /></div>}
            </button>
          );
        })}
      </div>

      {/* Enriched Study Guide Area */}
      {(isAnswered || showAnswerDirectly) && (
        <div className="bg-slate-900 rounded-[3rem] p-8 md:p-16 text-white border border-slate-800 animate-in slide-in-from-top-6 fade-in duration-700 shadow-3xl mt-12 relative overflow-hidden">
           <div className="absolute bottom-0 right-0 opacity-5 -mb-10 -mr-10"><IconTarget /></div>
           
           <div className="flex items-center gap-3 text-indigo-400 text-[10px] font-black uppercase tracking-[0.4em] mb-8">
             <div className="w-6 h-px bg-indigo-400/30"></div>
             <IconLanguages />
             <span>{t.studyGuide}</span>
             <div className="w-6 h-px bg-indigo-400/30"></div>
           </div>
           
           <div className="flex flex-col md:flex-row gap-8 md:gap-14 items-start">
             <div className="bg-white/5 backdrop-blur-sm rounded-[2rem] p-6 md:p-10 border border-white/10 flex-shrink-0 flex md:flex-col items-center justify-between md:justify-center min-w-[140px] shadow-inner text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest md:mb-2">{t.correctKey}</span>
                <span className="text-4xl md:text-7xl font-black text-indigo-400 drop-shadow-2xl">{question.answer_en}</span>
             </div>
             
             <div className="flex-1 space-y-8">
                <div className="space-y-4">
                  {(bilingualMode === 'en' || bilingualMode === 'both') && (
                    <p className="text-slate-200 leading-[1.7] text-base md:text-xl font-medium">
                      {question.explanation_en || t.explanation.replace('{key}', question.answer_en)}
                    </p>
                  )}
                  {(bilingualMode === 'cn' || bilingualMode === 'both') && (
                    <p className="text-slate-400 leading-[1.8] text-sm md:text-lg italic font-normal">
                      {question.explanation_cn || "正在准备解析内容..."}
                    </p>
                  )}
                </div>

                {question.tags && question.tags.length > 0 && (
                  <div className="flex flex-wrap gap-3 pt-6 border-t border-white/10">
                     {question.tags.map(tag => (
                       <span key={tag} className="text-[9px] font-black text-slate-400 uppercase px-3 py-1.5 bg-white/5 rounded-full border border-white/5 transition-colors hover:bg-white/10 hover:text-white cursor-default">
                          #{tag.replace(/^#/, '')}
                       </span>
                     ))}
                  </div>
                )}
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default QuestionDisplay;
