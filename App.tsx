
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Question, ReviewMode, AppState } from './types';
import { translations, UILang } from './locales';
import Layout from './components/Layout';
import QuestionDisplay from './components/QuestionDisplay';
import { IconPlay, IconRepeat, IconChevronLeft, IconChevronRight, IconX, IconLanguages, IconDownload, IconCheck, IconTarget } from './components/Icons';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<AppState>({
    questions: [],
    currentMode: 'sequence',
    currentIndex: 0,
    reviewOrder: [],
    answerRecords: {},
    showAnswerDirectly: false,
    bilingualMode: 'both',
    uiLanguage: (localStorage.getItem('aceexam_ui_lang') as UILang) || 'cn'
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [jumpInputValue, setJumpInputValue] = useState('1');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  
  const questionContainerRef = useRef<HTMLDivElement>(null);

  const t = translations[state.uiLanguage];

  const fetchQuestions = async () => {
    try {
      const response = await fetch('data.json');
      return await response.json();
    } catch (e) {
      console.error("Fetch failed", e);
      return [];
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const savedQuestions = localStorage.getItem('aceexam_questions');
        const savedRecords = localStorage.getItem('aceexam_records');
        const answerRecords = savedRecords ? JSON.parse(savedRecords) : {};
        
        let questions: Question[] = [];
        if (savedQuestions && JSON.parse(savedQuestions).length > 0) {
          questions = JSON.parse(savedQuestions);
        } else {
          questions = await fetchQuestions();
        }

        setState(prev => ({
          ...prev,
          questions,
          reviewOrder: Array.from({ length: questions.length }, (_, i) => i),
          answerRecords
        }));
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (questionContainerRef.current) {
      setTimeout(() => {
        questionContainerRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 50);
    }
  }, [state.currentIndex, state.reviewOrder]);

  const allUniqueTags = useMemo(() => {
    const tagsSet = new Set<string>();
    state.questions.forEach(q => {
      if (q.tags) {
        q.tags.forEach(tag => tagsSet.add(tag));
      }
    });
    return Array.from(tagsSet).sort();
  }, [state.questions]);

  useEffect(() => {
    setJumpInputValue((state.currentIndex + 1).toString());
  }, [state.currentIndex]);

  useEffect(() => {
    if (state.questions.length > 0) {
      localStorage.setItem('aceexam_questions', JSON.stringify(state.questions));
    }
    localStorage.setItem('aceexam_records', JSON.stringify(state.answerRecords));
    localStorage.setItem('aceexam_ui_lang', state.uiLanguage);
  }, [state.questions, state.answerRecords, state.uiLanguage]);

  const currentQuestion = useMemo(() => {
    if (state.reviewOrder.length === 0) return null;
    const idx = state.reviewOrder[state.currentIndex];
    return state.questions[idx];
  }, [state.questions, state.reviewOrder, state.currentIndex]);

  const handleModeChange = (mode: ReviewMode, tag: string | null = null) => {
    let newOrder: number[] = [];
    const qCount = state.questions.length;
    setSelectedTag(tag);

    switch (mode) {
      case 'sequence':
        newOrder = Array.from({ length: qCount }, (_, i) => i);
        break;
      case 'shuffle':
        newOrder = Array.from({ length: qCount }, (_, i) => i).sort(() => Math.random() - 0.5);
        break;
      case 'random':
        newOrder = Array.from({ length: qCount }, (_, i) => i)
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.min(20, qCount));
        break;
      case 'wrong':
        newOrder = Array.from({ length: qCount }, (_, i) => i).filter(i => {
          const rec = state.answerRecords[state.questions[i].question_id];
          return rec && rec.incorrect > 0;
        });
        break;
      case 'tags':
        if (tag) {
          newOrder = Array.from({ length: qCount }, (_, i) => i).filter(i => 
            state.questions[i].tags?.includes(tag)
          );
        } else {
          newOrder = Array.from({ length: qCount }, (_, i) => i);
        }
        break;
    }

    setState(prev => ({
      ...prev,
      currentMode: mode,
      currentIndex: 0,
      reviewOrder: newOrder
    }));
  };

  const handleNav = (dir: 'prev' | 'next') => {
    setState(prev => {
      const newIdx = dir === 'next' 
        ? Math.min(prev.reviewOrder.length - 1, prev.currentIndex + 1)
        : Math.max(0, prev.currentIndex - 1);
      return { ...prev, currentIndex: newIdx };
    });
  };

  const handleJump = () => {
    const val = parseInt(jumpInputValue, 10);
    if (!isNaN(val) && val >= 1 && val <= state.reviewOrder.length) {
      setState(prev => ({ ...prev, currentIndex: val - 1 }));
    } else {
      setJumpInputValue((state.currentIndex + 1).toString());
    }
  };

  const handleRecordAnswer = (isCorrect: boolean) => {
    if (!currentQuestion) return;
    const qId = currentQuestion.question_id;
    setState(prev => {
      const current = prev.answerRecords[qId] || { correct: 0, incorrect: 0 };
      return {
        ...prev,
        answerRecords: {
          ...prev.answerRecords,
          [qId]: {
            correct: current.correct + (isCorrect ? 1 : 0),
            incorrect: current.incorrect + (isCorrect ? 0 : 1)
          }
        }
      };
    });
  };

  const handleSyncFromDataJson = async () => {
    if (!confirm(t.syncConfirm)) return;
    try {
      localStorage.removeItem('aceexam_questions'); 
      const questions = await fetchQuestions();
      setState(prev => ({
        ...prev,
        questions,
        currentIndex: 0,
        currentMode: 'sequence',
        reviewOrder: Array.from({ length: questions.length }, (_, i) => i)
      }));
      setIsSettingsOpen(false);
    } catch (e) {
      alert("Sync failed");
    }
  };

  const sidebarContent = (
    <nav className="space-y-1 px-4">
      <h3 className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{t.sequential} / {t.shuffled}</h3>
      {[
        { id: 'sequence', label: t.sequential, icon: <IconRepeat /> },
        { id: 'shuffle', label: t.shuffled, icon: <IconPlay /> },
        { id: 'random', label: t.random, icon: <IconPlay /> },
        { id: 'wrong', label: t.mistakes, icon: <IconRepeat /> }
      ].map((mode) => (
        <button
          key={mode.id}
          onClick={() => handleModeChange(mode.id as ReviewMode)}
          className={`
            flex items-center gap-3 w-full px-4 py-3 rounded-2xl transition-all font-semibold text-sm mb-1
            ${state.currentMode === mode.id && mode.id !== 'tags'
              ? 'bg-indigo-600 text-white shadow-lg' 
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
          `}
        >
          {mode.icon}
          <span>{mode.label}</span>
        </button>
      ))}

      <div className="pt-6 pb-4 border-t border-slate-800/50 mt-4">
         <h3 className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">{t.topics}</h3>
         <div className="flex flex-wrap gap-1.5 px-2 max-h-[300px] overflow-y-auto custom-scrollbar">
            {allUniqueTags.map(tag => (
              <button
                key={tag}
                onClick={() => handleModeChange('tags', tag)}
                className={`
                  px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border
                  ${selectedTag === tag && state.currentMode === 'tags'
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'}
                `}
              >
                #{tag}
              </button>
            ))}
         </div>
      </div>

      <div className="pt-6 pb-4 border-t border-slate-800/50 mt-4">
         <h3 className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">{t.preferences}</h3>
         <div className="space-y-4 px-4">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={state.showAnswerDirectly}
                onChange={(e) => setState(prev => ({ ...prev, showAnswerDirectly: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-400 group-hover:text-white">{t.showAnswers}</span>
            </label>

            <div className="space-y-1.5">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{t.language}</span>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-800 rounded-xl">
                {(['en', 'cn', 'both'] as const).map(lang => (
                  <button 
                    key={lang}
                    onClick={() => setState(prev => ({ ...prev, bilingualMode: lang }))}
                    className={`py-1 text-[9px] font-black rounded-lg capitalize ${state.bilingualMode === lang ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
         </div>
      </div>
    </nav>
  );

  if (loading) return null;

  const progressPercent = state.reviewOrder.length > 0 
    ? ((state.currentIndex + 1) / state.reviewOrder.length) * 100 
    : 0;

  // DYNAMIC COLOR ENGINE - COMPACT PATH
  const isComplete = progressPercent === 100;
  const getDynamicColors = () => {
    if (isComplete) return { h: 142, s: 76, l: 45 }; // High SAT Emerald
    if (progressPercent < 50) {
      const ratio = progressPercent / 50;
      return { h: 215 + (20 * ratio), s: 25 + (35 * ratio), l: 12 + (8 * ratio) };
    } else {
      const ratio = (progressPercent - 50) / 50;
      return { h: 235 - (40 * ratio), s: 60 + (10 * ratio), l: 20 + (15 * ratio) };
    }
  };

  const { h, s, l } = getDynamicColors();
  const dynamicBg = `hsl(${h}, ${s}%, ${l}%)`;
  const dynamicBorderColor = `hsl(${h}, 85%, 50%)`;

  return (
    <Layout 
      sidebarContent={sidebarContent} 
      onOpenSettings={() => setIsSettingsOpen(true)}
      uiLang={state.uiLanguage}
    >
      <div className="pb-28 md:pb-40 pt-2" ref={questionContainerRef}>
        {currentQuestion ? (
          <QuestionDisplay 
            question={currentQuestion}
            bilingualMode={state.bilingualMode}
            showAnswerDirectly={state.showAnswerDirectly}
            onRecordAnswer={handleRecordAnswer}
            stats={state.answerRecords[currentQuestion.question_id] || { correct: 0, incorrect: 0 }}
            uiLang={state.uiLanguage}
          />
        ) : (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 px-8 shadow-sm flex flex-col items-center animate-in zoom-in-95 duration-500">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4 text-indigo-500">
               <IconCheck />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">{t.noMistakes}</h3>
            <p className="text-slate-500 text-sm max-w-xs mx-auto mb-8">{t.noMistakesDesc}</p>
            <button 
              onClick={() => handleModeChange('sequence')}
              className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:shadow-indigo-200"
            >
              {t.restart}
            </button>
          </div>
        )}
      </div>

      {/* Floating Action Bar - Ultra Compact */}
      {state.reviewOrder.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-3 md:p-5 lg:left-[280px] z-40 bg-gradient-to-t from-slate-50 via-slate-50/70 to-transparent pointer-events-none">
          <div className="max-w-md mx-auto relative pointer-events-auto">
            <div className="relative overflow-hidden flex items-center gap-1 bg-white/95 backdrop-blur-3xl p-1 rounded-[1.75rem] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] border border-white">
              
              <button 
                onClick={() => handleNav('prev')}
                disabled={state.currentIndex === 0}
                className="shrink-0 p-3 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-white rounded-full disabled:opacity-5 active:scale-90 transition-all"
              >
                <IconChevronLeft />
              </button>
              
              <div className="flex-1 flex flex-col items-center justify-center min-w-0">
                <div className={`relative p-[2px] rounded-lg overflow-hidden transition-all duration-700 ${isComplete ? 'scale-105' : ''}`}>
                  <div 
                    className={`absolute inset-0 transition-all duration-700 ${isComplete ? 'animate-pulse' : ''}`}
                    style={{ 
                      background: `conic-gradient(from 0deg, ${dynamicBorderColor} ${progressPercent}%, #0f172a ${progressPercent}%)`,
                      filter: `drop-shadow(0 0 4px ${dynamicBorderColor}66)`
                    }}
                  />
                  <div 
                    className="relative flex items-center gap-1.5 px-3 py-1.5 md:py-2 rounded-md border border-white/5 overflow-hidden transition-all duration-700"
                    style={{ backgroundColor: dynamicBg }}
                  >
                    <input 
                      type="text"
                      value={jumpInputValue}
                      onChange={(e) => setJumpInputValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleJump()}
                      onBlur={handleJump}
                      className="w-8 md:w-10 bg-transparent text-center text-sm md:text-base font-black text-white border-none focus:ring-0 p-0"
                    />
                    <span className="text-[10px] md:text-xs font-black text-white/50">/ {state.reviewOrder.length}</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => handleNav('next')}
                disabled={state.currentIndex === state.reviewOrder.length - 1}
                className={`shrink-0 min-w-0 py-3 md:py-4 px-5 md:px-8 rounded-2xl disabled:opacity-20 flex items-center justify-center shadow-lg transition-all active:scale-95 ${isComplete ? 'bg-emerald-500 shadow-emerald-100' : 'bg-indigo-600 shadow-indigo-100 hover:bg-indigo-700'}`}
              >
                <span className="font-black text-[10px] uppercase tracking-widest text-white">{t.next}</span>
                <IconChevronRight />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal - Compact */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100">
            <div className="p-5 border-b border-slate-50 flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900">{t.settings}</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 text-slate-300 hover:bg-slate-50 rounded-full transition-colors"><IconX /></button>
            </div>
            <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{t.uiLanguage}</span>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                  {(['en', 'cn'] as const).map(lang => (
                    <button 
                      key={lang}
                      onClick={() => setState(prev => ({ ...prev, uiLanguage: lang }))}
                      className={`py-2 text-xs font-black rounded-lg ${state.uiLanguage === lang ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                    >
                      {lang === 'cn' ? '中文' : 'EN'}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleSyncFromDataJson}
                className="w-full py-2.5 px-4 bg-indigo-50 text-indigo-700 rounded-xl font-black text-[10px] uppercase tracking-widest border border-indigo-100"
              >
                {t.syncDb}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
