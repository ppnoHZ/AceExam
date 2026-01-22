
import React, { useState, useEffect } from 'react';
import { Question } from '../types';
import { IconCheck, IconX, IconSparkles } from './Icons';
import { translations, UILang } from '../locales';
import { fetchMemoryAid } from '../api/questions';

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
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [memoryAid, setMemoryAid] = useState<{ memory_aid_en: string, memory_aid_cn: string } | null>(null);
  const [isLoadingAid, setIsLoadingAid] = useState(false);
  const t = translations[uiLang];

  useEffect(() => {
    setSelectedKeys([]);
    setIsAnswered(showAnswerDirectly);
    setMemoryAid(null);
    setIsLoadingAid(false);

    // Auto-generate memory aid if showAnswerDirectly is enabled
    if (showAnswerDirectly) {
      const autoFetch = async () => {
        setIsLoadingAid(true);
        try {
          const aid = await fetchMemoryAid(question.question_id);
          setMemoryAid(aid);
        } catch (err) {
          console.error('Auto-load memory aid failed:', err);
        } finally {
          setIsLoadingAid(false);
        }
      };
      autoFetch();
    }
  }, [question, showAnswerDirectly]);

  const handleOptionClick = (key: string) => {
    if (isAnswered) return;

    const correctKeys = question.answer_en.split(';').map(s => s.trim());
    const targetCount = correctKeys.length;

    let newSelected: string[];
    if (selectedKeys.includes(key)) {
      newSelected = selectedKeys.filter(k => k !== key);
    } else {
      if (selectedKeys.length >= targetCount && targetCount === 1) {
        newSelected = [key];
      } else if (selectedKeys.length < targetCount) {
        newSelected = [...selectedKeys, key];
      } else {
        return;
      }
    }

    setSelectedKeys(newSelected);

    if (newSelected.length === targetCount) {
      setIsAnswered(true);
      const isCorrect = [...newSelected].sort().join(';') === [...correctKeys].sort().join(';');
      onRecordAnswer(isCorrect);
    }
  };

  const handleGenerateMemoryAid = async () => {
    if (isLoadingAid) return;
    setIsLoadingAid(true);
    try {
      const aid = await fetchMemoryAid(question.question_id);
      setMemoryAid(aid);
    } catch (err) {
      console.error('Failed to generate memory aid:', err);
    } finally {
      setIsLoadingAid(false);
    }
  };

  const getOptionStatus = (key: string) => {
    const correctKeys = question.answer_en.split(';').map(s => s.trim());
    
    if (isAnswered || showAnswerDirectly) {
      if (correctKeys.includes(key)) return 'correct';
      if (selectedKeys.includes(key)) return 'incorrect';
      return 'idle';
    }
    
    if (selectedKeys.includes(key)) return 'selected';
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
            } else if (status === 'selected') {
              containerStyle = "border-2 border-indigo-500 bg-indigo-50/30 shadow-md";
              indexStyle = "bg-indigo-500 text-white";
              textStyle = "text-indigo-900";
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
                <div 
                  className="text-slate-200 leading-relaxed text-xs md:text-sm font-bold
                    [&_b]:text-white [&_strong]:text-white [&_b]:font-black
                    [&_code]:bg-slate-800 [&_code]:px-1 [&_code]:rounded [&_code]:text-indigo-300 [&_code]:font-mono"
                  dangerouslySetInnerHTML={{ 
                    __html: question.explanation_en || t.explanation.replace('{key}', `<b>${question.answer_en}</b>`) 
                  }}
                />
                {question.explanation_cn && (
                  <div 
                    className="text-slate-500 leading-snug text-[10px] italic border-t border-slate-800 pt-1.5 mt-1.5
                      [&_b]:text-slate-400 [&_strong]:text-slate-400 [&_b]:font-bold"
                    dangerouslySetInnerHTML={{ __html: question.explanation_cn }}
                  />
                )}

                {/* AI Memory Aid Section - Enhanced UI */}
                <div className="mt-8 pt-6 border-t border-slate-800/50">
                  {!memoryAid ? (
                    <button
                      onClick={handleGenerateMemoryAid}
                      disabled={isLoadingAid}
                      className="group relative flex items-center gap-3 px-5 py-2.5 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 hover:from-indigo-500 hover:to-violet-700 rounded-xl text-[11px] font-black uppercase tracking-[0.15em] text-white transition-all shadow-xl hover:shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
                    >
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                      <span className={`relative flex items-center gap-2 ${isLoadingAid ? 'animate-pulse' : ''}`}>
                        <div className={isLoadingAid ? 'animate-spin' : 'group-hover:rotate-12 transition-transform'}>
                          <IconSparkles />
                        </div>
                        {isLoadingAid ? t.loadingAi : t.aiMemoryAid}
                      </span>
                    </button>
                  ) : (
                    <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-slate-950/40 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-500">
                      {/* Decorative background pulse */}
                      <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl animate-pulse" />
                      
                      <div className="relative flex items-center justify-between px-5 py-3 bg-white/5 border-b border-white/5">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1 bg-indigo-500/20 rounded-lg text-indigo-300">
                            <IconSparkles />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200">{t.aiTutorAid}</span>
                        </div>
                        <div className="flex gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/50" />
                        </div>
                      </div>
                      
                      <div className="relative p-5 space-y-5">
                        <div 
                          className="memory-aid-content text-slate-200 text-sm md:text-[15px] leading-relaxed
                            [&_b]:text-indigo-300 [&_strong]:text-indigo-300 [&_b]:font-black [&_strong]:font-black [&_b]:drop-shadow-[0_0_8px_rgba(165,180,252,0.3)]
                            [&_code]:bg-indigo-950/60 [&_code]:border [&_code]:border-indigo-500/30 [&_code]:px-2 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:text-indigo-200 [&_code]:font-mono [&_code]:text-[13px]
                            [&_ul]:list-none [&_ul]:space-y-2 [&_ul]:mt-3
                            [&_li]:relative [&_li]:pl-6
                            [&_li]:before:content-[''] [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-[0.6em] [&_li]:before:w-1.5 [&_li]:before:h-1.5 [&_li]:before:bg-indigo-500 [&_li]:before:rounded-full
                            [&_em]:text-slate-400 [&_em]:italic [&_em]:font-medium"
                          dangerouslySetInnerHTML={{ __html: (bilingualMode === 'cn' ? memoryAid.memory_aid_cn : memoryAid.memory_aid_en) }}
                        />
                        
                        {(bilingualMode === 'both' || (bilingualMode === 'en' && uiLang === 'cn')) && (
                          <div className="pt-4 border-t border-white/5">
                            <div className="flex items-center gap-2 mb-2 opacity-40">
                              <div className="h-px flex-1 bg-white/10" />
                              <span className="text-[8px] font-black uppercase tracking-tighter text-indigo-300 whitespace-nowrap">Context / 翻译</span>
                              <div className="h-px flex-1 bg-white/10" />
                            </div>
                            <div 
                              className="text-slate-400 text-xs leading-relaxed italic
                                [&_b]:text-indigo-400/70 [&_strong]:text-indigo-400/70 [&_b]:font-black [&_strong]:font-black"
                              dangerouslySetInnerHTML={{ __html: memoryAid.memory_aid_cn }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionDisplay;
