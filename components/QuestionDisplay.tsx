
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
    <div className="space-y-3 md:space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Ultra-Slim Sticky Meta Bar */}
      <div className="sticky top-0 z-30 -mx-4 px-4 py-1.5 bg-slate-50/90 backdrop-blur-md border-b border-slate-200/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ID</span>
          <span className="text-[11px] font-black text-slate-900">#{question.question_id}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center -space-x-1">
              <span className="bg-emerald-500 text-white text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full border border-white shadow-sm z-10">{stats.correct}</span>
              <span className="bg-rose-500 text-white text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full border border-white shadow-sm">{stats.incorrect}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Question Card */}
      <div className="bg-white rounded-3xl p-5 md:p-6 shadow-sm border border-slate-100 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/20 rounded-full -mr-12 -mt-12 transition-transform duration-1000 group-hover:scale-110"></div>
        <div className="space-y-3 relative z-10">
          {(bilingualMode === 'en' || bilingualMode === 'both') && (
            <h2 className="text-base md:text-xl font-bold leading-snug text-slate-900 tracking-tight">{question.question_en}</h2>
          )}
          {(bilingualMode === 'cn' || bilingualMode === 'both') && (
            <h2 className="text-sm md:text-base font-medium leading-relaxed text-slate-500 border-l-3 border-indigo-500/20 pl-3 italic">{question.question_cn}</h2>
          )}
        </div>
      </div>

      {/* Tight Options Grid */}
      <div className="grid grid-cols-1 gap-2">
        {Object.entries(question.options_en).map(([key, text]) => {
          const status = getOptionStatus(key);
          const cnText = question.options_cn[key];
          return (
            <button
              key={key}
              onClick={() => handleOptionClick(key)}
              disabled={isAnswered}
              className={`
                w-full text-left p-3.5 md:p-4 rounded-2xl border-2 transition-all duration-200 group relative flex items-start gap-3
                ${status === 'idle' ? 'bg-white border-slate-50 hover:border-indigo-100 hover:bg-slate-50 active:scale-[0.99]' : ''}
                ${status === 'correct' ? 'bg-emerald-50/40 border-emerald-500 shadow-md shadow-emerald-500/5' : ''}
                ${status === 'incorrect' ? 'bg-rose-50/40 border-rose-500 shadow-md shadow-rose-500/5' : ''}
                ${isAnswered && status === 'idle' ? 'opacity-50' : ''}
              `}
            >
              <span className={`
                shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center font-black text-sm md:text-base transition-all
                ${status === 'idle' ? 'bg-slate-100 text-slate-400 group-hover:bg-slate-900 group-hover:text-white' : ''}
                ${status === 'correct' ? 'bg-emerald-500 text-white' : ''}
                ${status === 'incorrect' ? 'bg-rose-500 text-white' : ''}
              `}>
                {key}
              </span>
              <div className="flex-1 pt-1 space-y-0.5">
                {(bilingualMode === 'en' || bilingualMode === 'both') && (
                  <p className={`font-bold text-sm md:text-[15px] ${status === 'correct' ? 'text-emerald-900' : status === 'incorrect' ? 'text-rose-900' : 'text-slate-800'}`}>{text}</p>
                )}
                {(bilingualMode === 'cn' || bilingualMode === 'both') && (
                  <p className="text-slate-400 text-[11px] md:text-xs font-medium italic leading-normal">{cnText}</p>
                )}
              </div>
              {isAnswered && status === 'correct' && <div className="shrink-0 pt-1 text-emerald-500 animate-in zoom-in duration-300 scale-75"><IconCheck /></div>}
            </button>
          );
        })}
      </div>

      {/* Ultra-Compact Study Guide */}
      {(isAnswered || showAnswerDirectly) && (
        <div className="bg-slate-900 rounded-[2rem] p-5 md:p-8 text-white border border-slate-800 animate-in slide-in-from-top-4 fade-in duration-500 shadow-2xl mt-4 relative overflow-hidden">
           <div className="flex items-center gap-2 text-indigo-400 text-[8px] font-black uppercase tracking-[0.4em] mb-4">
             <IconLanguages />
             <span>{t.studyGuide}</span>
           </div>
           
           <div className="flex flex-col md:flex-row gap-5 items-start">
             <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3 md:p-5 border border-white/10 flex md:flex-col items-center justify-between md:justify-center min-w-[80px] shadow-inner text-center">
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest md:mb-1">Correct</span>
                <span className="text-2xl md:text-4xl font-black text-emerald-400">{question.answer_en}</span>
             </div>
             
             <div className="flex-1 space-y-2">
                <div className="space-y-2">
                  {(bilingualMode === 'en' || bilingualMode === 'both') && (
                    <p className="text-slate-200 leading-normal text-xs md:text-sm font-medium">
                      {question.explanation_en || t.explanation.replace('{key}', question.answer_en)}
                    </p>
                  )}
                  {(bilingualMode === 'cn' || bilingualMode === 'both') && (
                    <p className="text-slate-400 leading-normal text-[11px] md:text-xs italic">
                      {question.explanation_cn || "解析内容生成中..."}
                    </p>
                  )}
                </div>

                {question.tags && question.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-3 border-t border-white/10">
                     {question.tags.map(tag => (
                       <span key={tag} className="text-[8px] font-bold text-slate-400 uppercase px-1.5 py-0.5 bg-white/5 rounded border border-white/5">
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
