
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
            flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl transition-all font-semibold text-sm mb-1
            ${state.currentMode === mode.id && mode.id !== 'tags'
              ? 'bg-indigo-600 text-white shadow-lg' 
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
          `}
        >
          {mode.icon}
          <span>{mode.label}</span>
        </button>
      ))}

      <div className="pt-8 pb-4 border-t border-slate-800/50 mt-6">
         <h3 className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">{t.topics}</h3>
         <div className="flex flex-wrap gap-2 px-2 max-h-[380px] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => handleModeChange('sequence')}
              className={`
                px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-all border
                ${state.currentMode === 'sequence' 
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'}
              `}
            >
              {t.allTopics}
            </button>
            {allUniqueTags.map(tag => (
              <button
                key={tag}
                onClick={() => handleModeChange('tags', tag)}
                className={`
                  px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-all border
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

      <div className="pt-8 pb-4 border-t border-slate-800/50 mt-6">
         <h3 className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">{t.preferences}</h3>
         <div className="space-y-6 px-4">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={state.showAnswerDirectly}
                onChange={(e) => setState(prev => ({ ...prev, showAnswerDirectly: e.target.checked }))}
                className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-300 group-hover:text-white">{t.showAnswers}</span>
            </label>

            <div className="space-y-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t.language}</span>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-800 rounded-xl">
                {(['en', 'cn', 'both'] as const).map(lang => (
                  <button 
                    key={lang}
                    onClick={() => setState(prev => ({ ...prev, bilingualMode: lang }))}
                    className={`py-1.5 text-[10px] font-black rounded-lg capitalize ${state.bilingualMode === lang ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
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

  // Calculate dynamic colors based on progress
  // Hue: 220 (Slate Blue) to 140 (Emerald Green)
  const dynamicHue = 220 - (progressPercent * 0.8);
  const dynamicSaturation = 30 + (progressPercent * 0.5);
  const dynamicLightness = 10 + (progressPercent * 0.2);
  const dynamicBg = `hsl(${dynamicHue}, ${dynamicSaturation}%, ${dynamicLightness}%)`;
  const dynamicBorderColor = `hsl(${dynamicHue}, 80%, 50%)`;

  return (
    <Layout 
      sidebarContent={sidebarContent} 
      onOpenSettings={() => setIsSettingsOpen(true)}
      uiLang={state.uiLanguage}
    >
      <div className="pb-40 md:pb-56 pt-6" ref={questionContainerRef}>
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
          <div className="text-center py-24 bg-white rounded-[3rem] border border-slate-100 px-8 shadow-sm flex flex-col items-center animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-8 text-indigo-500">
               {state.currentMode === 'wrong' ? <IconCheck /> : <IconRepeat />}
            </div>
            <h3 className="text-3xl font-black text-slate-900 mb-4">
              {state.currentMode === 'wrong' ? t.noMistakes : t.noItems}
            </h3>
            <p className="text-slate-500 text-lg max-w-md mx-auto mb-12 leading-relaxed">
              {state.currentMode === 'wrong' ? t.noMistakesDesc : t.noItemsDesc}
            </p>
            <button 
              onClick={() => handleModeChange('sequence')}
              className="px-12 py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-2xl shadow-indigo-200 transition-all hover:-translate-y-1 hover:shadow-indigo-300 active:scale-95"
            >
              {t.restart}
            </button>
          </div>
        )}
      </div>

      {/* Floating Action Bar */}
      {state.reviewOrder.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 md:p-8 lg:left-[280px] z-40 bg-gradient-to-t from-slate-50 via-slate-50/80 to-transparent pointer-events-none">
          <div className="max-w-xl mx-auto relative group pointer-events-auto">
            {/* Navigation Pill */}
            <div className="relative overflow-hidden flex items-center flex-nowrap gap-1 md:gap-2 bg-white/95 backdrop-blur-3xl p-1.5 md:p-2.5 rounded-[2.5rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.2)] border border-white">
              
              <button 
                onClick={() => handleNav('prev')}
                disabled={state.currentIndex === 0}
                className="shrink-0 p-4 md:p-6 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-white rounded-full disabled:opacity-5 transition-all active:scale-90 border border-transparent hover:border-slate-100"
              >
                <IconChevronLeft />
              </button>
              
              <div className="flex-1 flex flex-col items-center justify-center px-1 min-w-0">
                {/* Progress Border Wrapper */}
                <div className="relative p-[2px] rounded-2xl overflow-hidden transition-all duration-700">
                  {/* The actual progress border using conic-gradient */}
                  <div 
                    className="absolute inset-0 transition-all duration-700"
                    style={{ 
                      background: `conic-gradient(from 0deg, ${dynamicBorderColor} ${progressPercent}%, #1e293b ${progressPercent}%)`,
                      filter: `drop-shadow(0 0 6px ${dynamicBorderColor}80)`
                    }}
                  />
                  {/* Main Input Content with DYNAMIC BACKGROUND */}
                  <div 
                    className="relative flex items-center gap-1 md:gap-2 px-3 md:px-5 py-2 md:py-2.5 rounded-[0.9rem] border border-slate-800/30 max-w-full overflow-hidden transition-all duration-700"
                    style={{ backgroundColor: dynamicBg }}
                  >
                    <span className="text-white/40 shrink-0"><IconTarget /></span>
                    <input 
                      type="text"
                      value={jumpInputValue}
                      onChange={(e) => setJumpInputValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleJump()}
                      onBlur={handleJump}
                      className="w-8 md:w-12 bg-transparent text-center text-xs md:text-base font-black text-white border-none focus:ring-0 p-0"
                    />
                    <span className="text-[10px] md:text-xs font-bold text-white/40 uppercase tracking-tighter shrink-0">
                      / {state.reviewOrder.length}
                    </span>
                  </div>
                </div>
                <span className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-[0.25em] mt-1.5 shrink-0">
                  {t.jumpTo}
                </span>
              </div>

              <button 
                onClick={() => handleNav('next')}
                disabled={state.currentIndex === state.reviewOrder.length - 1}
                className="shrink-0 min-w-0 py-4 md:py-6 px-6 md:px-10 bg-indigo-600 text-white rounded-[2rem] disabled:opacity-20 flex items-center justify-center gap-2 md:gap-3 shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:translate-x-0.5 transition-all active:scale-95"
              >
                <span className="font-black text-[10px] md:text-xs uppercase tracking-widest whitespace-nowrap">{t.next}</span>
                <IconChevronRight />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] w-full max-w-lg overflow-hidden shadow-3xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">{t.settings}</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Application Preferences & Data</p>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="p-3 text-slate-300 hover:bg-slate-50 rounded-full transition-colors"><IconX /></button>
            </div>
            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-3">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                  <IconLanguages /> {t.uiLanguage}
                </span>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
                  {(['en', 'cn'] as const).map(lang => (
                    <button 
                      key={lang}
                      onClick={() => setState(prev => ({ ...prev, uiLanguage: lang }))}
                      className={`py-3 text-sm font-black rounded-xl uppercase transition-all ${state.uiLanguage === lang ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {lang === 'cn' ? '简体中文' : 'English'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                <div className="relative flex justify-center text-[10px] font-black uppercase text-slate-300"><span className="bg-white px-2">{t.dataManagement}</span></div>
              </div>

              <div className="space-y-4">
                <button 
                  onClick={handleSyncFromDataJson}
                  className="w-full py-4 px-6 bg-indigo-50 text-indigo-700 rounded-2xl font-black text-sm flex items-center justify-center gap-3 border border-indigo-100 transition-all hover:bg-indigo-100 active:scale-[0.98]"
                >
                  <IconRepeat />
                  {t.syncDb}
                </button>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t.importJson}</span>
                  </div>
                  <textarea 
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder='[{"question_id": 1, ...}]'
                    className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-[10px] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      if(confirm(t.resetConfirm)) {
                        localStorage.clear();
                        window.location.reload();
                      }
                    }}
                    className="flex-1 py-4 text-rose-500 font-bold hover:bg-rose-50 rounded-2xl text-xs uppercase tracking-widest transition-colors"
                  >
                    {t.reset}
                  </button>
                  <button 
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(importText);
                        if (Array.isArray(parsed)) {
                          setState(prev => ({ ...prev, questions: parsed, currentIndex: 0, reviewOrder: Array.from({ length: parsed.length }, (_, i) => i) }));
                          setIsSettingsOpen(false);
                          setImportText('');
                        }
                      } catch (e) { alert("Invalid JSON"); }
                    }}
                    className="flex-[2] py-4 bg-slate-900 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all"
                  >
                    {t.importDb}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
