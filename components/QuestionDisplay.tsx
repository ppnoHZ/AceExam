
import React, { useState, useEffect } from 'react';
import { Question } from '../types';
import { IconCheck, IconX } from './Icons';
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
    if (correctKeys.includes(key)) return 'correct';
    if (selectedKey === key) return 'incorrect';
    return 'idle';
  };

  return (
    <div className="relative">
      {/* FIXED TOP STATUS NAV - Compact & Solid */}
      <div className="sticky top-0 z-30 bg-slate-50 py-2 mb-3 border-b border-slate-200 flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <div className="bg-slate-900 text-white px-1.5 py-0.5 rounded text-[9px] font-black">
            #{question.question_id}
          </div>
          {question.tags?.slice(0, 1).map(tag => (
            <span key={tag} className="text-[9px] font-bold text-indigo-600 bg-white px-1.5 py-0.5 rounded border border-indigo-100">
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white rounded border border-slate-200">
             <div className="w-1 h-1 bg-emerald-500 rounded-full" />
             <span className="text-[9px] font-black text-slate-700">{stats.correct}</span>
          </div>
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white rounded border border-slate-200">
             <div className="w-1 h-1 bg-rose-500 rounded-full" />
             <span className="text-[9px] font-black text-slate-700">{stats.incorrect}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* Question Text - Tightened */}
        <div className="bg-white border-2 border-slate-200 rounded-xl p-4 md:p-5 shadow-sm">
          <div className="space-y-2">
            {(bilingualMode === 'en' || bilingualMode === 'both') && (
              <h2 className="text-[15px] md:text-base font-black leading-snug text-slate-900 tracking-tight">
                {question.question_en}
              </h2>
            )}
            {(bilingualMode === 'cn' || bilingualMode === 'both') && (
              <div className="p-2.5 bg-slate-50 border-l-2 border-indigo-500 rounded-r-md">
                <p className="text-xs md:text-sm font-bold text-slate-600 leading-normal italic">
                  {question.question_cn}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Options - Highlighted with standard border width (2px) */}
        <div className="grid grid-cols-1 gap-2">
          {Object.entries(question.options_en).map(([key, text]) => {
            const status = getOptionStatus(key);
            const cnText = question.options_cn[key] as string;
            
            let containerStyle = "border-2 border-slate-200 bg-white hover:border-indigo-400";
            let indexStyle = "bg-slate-100 text-slate-400";
            let textStyle = "text-slate-800";

            if (status === 'correct') {
              containerStyle = "border-2 border-emerald-500 bg-emerald-50/30";
              indexStyle = "bg-emerald-500 text-white";
              textStyle = "text-emerald-900";
            } else if (status === 'incorrect') {
              containerStyle = "border-2 border-rose-500 bg-rose-50/30";
              indexStyle = "bg-rose-500 text-white";
              textStyle = "text-rose-900";
            } else if (isAnswered) {
              containerStyle = "border-2 border-slate-100 bg-slate-50 opacity-60";
            }

            return (
              <button 
                key={key} 
                onClick={() => handleOptionClick(key)} 
                disabled={isAnswered}
                className={`w-full text-left p-3.5 rounded-lg transition-all flex items-start gap-3.5 ${containerStyle}`}
              >
                <span className={`shrink-0 w-7 h-7 rounded flex items-center justify-center font-black text-[10px] ${indexStyle}`}>
                  {key}
                </span>

                <div className="flex-1 pt-0.5 space-y-0.5">
                  {(bilingualMode === 'en' || bilingualMode === 'both') && (
                    <p className={`font-bold text-[13px] md:text-sm leading-snug ${textStyle}`}>
                      {text as string}
                    </p>
                  )}
                  {(bilingualMode === 'cn' || bilingualMode === 'both') && (
                    <p className={`text-[10px] font-medium leading-normal opacity-70 ${textStyle}`}>
                      {cnText}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Analysis - More Compact */}
        {(isAnswered || showAnswerDirectly) && (
          <div className="bg-slate-900 rounded-xl p-4 md:p-5 border border-slate-800 text-white mt-4 animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="bg-indigo-600 px-4 py-2 rounded shadow-lg border border-indigo-500 shrink-0">
                <span className="text-[8px] font-black block text-indigo-200 uppercase tracking-widest">{t.correctKey}</span>
                <span className="text-xl font-black">{question.answer_en}</span>
              </div>
              <div className="flex-1 space-y-1.5">
                <h4 className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-400">Analysis</h4>
                <p className="text-slate-200 leading-snug text-xs md:text-sm font-bold">
                  {question.explanation_en || t.explanation.replace('{key}', question.answer_en)}
                </p>
                {question.explanation_cn && (
                  <p className="text-slate-500 leading-snug text-[10px] italic border-t border-slate-800 pt-1.5 mt-1.5">
                    {question.explanation_cn}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionDisplay;
