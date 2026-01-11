
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Question, ReviewMode, AppState } from './types';
import { translations, UILang } from './locales';
import Layout from './components/Layout';
import QuestionDisplay from './components/QuestionDisplay';
import { IconPlay, IconRepeat, IconX, IconCheck, IconLanguages, IconChevronLeft, IconChevronRight } from './components/Icons';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<AppState>(() => {
    const savedRecords = localStorage.getItem('answerRecords');
    const savedBilingual = localStorage.getItem('aceexam_bilingual');
    const savedShowAnswer = localStorage.getItem('aceexam_show_answer');
    
    return {
      questions: [],
      currentMode: 'sequence',
      currentIndex: 0,
      reviewOrder: [],
      answerRecords: savedRecords ? JSON.parse(savedRecords) : {},
      showAnswerDirectly: savedShowAnswer === 'true',
      bilingualMode: (savedBilingual as any) || 'both',
      uiLanguage: (localStorage.getItem('aceexam_ui_lang') as UILang) || 'cn'
    };
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [jumpInputValue, setJumpInputValue] = useState('1');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
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
        }));
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // SCROLL TO TOP ON QUESTION CHANGE
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [state.currentIndex]);

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
    localStorage.setItem('answerRecords', JSON.stringify(state.answerRecords));
    localStorage.setItem('aceexam_ui_lang', state.uiLanguage);
    localStorage.setItem('aceexam_bilingual', state.bilingualMode);
    localStorage.setItem('aceexam_show_answer', state.showAnswerDirectly.toString());
  }, [state.questions, state.answerRecords, state.uiLanguage, state.bilingualMode, state.showAnswerDirectly]);

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
      case 'sequence': newOrder = Array.from({ length: qCount }, (_, i) => i); break;
      case 'shuffle': newOrder = Array.from({ length: qCount }, (_, i) => i).sort(() => Math.random() - 0.5); break;
      case 'random': newOrder = Array.from({ length: qCount }, (_, i) => i).sort(() => Math.random() - 0.5).slice(0, Math.min(20, qCount)); break;
      case 'wrong': newOrder = Array.from({ length: qCount }, (_, i) => i).filter(i => {
          const rec = state.answerRecords[state.questions[i].question_id];
          return rec && rec.incorrect > 0;
        }); break;
      case 'tags': if (tag) { newOrder = Array.from({ length: qCount }, (_, i) => i).filter(i => state.questions[i].tags?.includes(tag)); } else { newOrder = Array.from({ length: qCount }, (_, i) => i); } break;
    }

    setState(prev => ({ ...prev, currentMode: mode, currentIndex: 0, reviewOrder: newOrder }));
  };

  const handleNav = (dir: 'prev' | 'next') => {
    setState(prev => {
      const newIdx = dir === 'next' ? Math.min(prev.reviewOrder.length - 1, prev.currentIndex + 1) : Math.max(0, prev.currentIndex - 1);
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
          [qId]: { correct: current.correct + (isCorrect ? 1 : 0), incorrect: current.incorrect + (isCorrect ? 0 : 1) }
        }
      };
    });
  };

  const handleSyncFromDataJson = async () => {
    if (!confirm(t.syncConfirm)) return;
    try {
      localStorage.removeItem('aceexam_questions'); 
      const questions = await fetchQuestions();
      setState(prev => ({ ...prev, questions, currentIndex: 0, currentMode: 'sequence', reviewOrder: Array.from({ length: questions.length }, (_, i) => i) }));
      setIsSettingsOpen(false);
    } catch (e) { alert("Sync failed"); }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 custom-scrollbar-hidden">
        <section>
          <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-3 px-2">{t.sequential} / {t.shuffled}</h3>
          <div className="space-y-1">
            {[
              { id: 'sequence', label: t.sequential, icon: <IconRepeat /> },
              { id: 'shuffle', label: t.shuffled, icon: <IconPlay /> },
              { id: 'random', label: t.random, icon: <IconPlay /> },
              { id: 'wrong', label: t.mistakes, icon: <IconRepeat /> }
            ].map((mode) => (
              <button key={mode.id} onClick={() => handleModeChange(mode.id as ReviewMode)}
                className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-all font-bold text-xs ${state.currentMode === mode.id && mode.id !== 'tags' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                {mode.icon}
                <span>{mode.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="pt-4 border-t border-slate-800">
          <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-3 px-2">{t.preferences}</h3>
          <div className="space-y-4 px-2">
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-slate-600 uppercase flex items-center gap-2">
                <IconLanguages /> {t.language}
              </label>
              <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                {(['en', 'cn', 'both'] as const).map(m => (
                  <button key={m} onClick={() => setState(p => ({...p, bilingualMode: m}))}
                    className={`flex-1 py-1 rounded-md text-[9px] font-black uppercase transition-all ${state.bilingualMode === m ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                    {m === 'both' ? 'All' : m}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between group cursor-pointer select-none" onClick={() => setState(p => ({...p, showAnswerDirectly: !p.showAnswerDirectly}))}>
               <span className="text-[10px] font-bold text-slate-500 group-hover:text-slate-200 transition-colors">{t.showAnswers}</span>
               <div className={`w-8 h-4 rounded-full relative transition-all border ${state.showAnswerDirectly ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-700 border-slate-600'}`}>
                  <div className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-all shadow-sm ${state.showAnswerDirectly ? 'right-0.5' : 'left-0.5'}`} />
               </div>
            </div>
          </div>
        </section>

        <section className="pt-4 border-t border-slate-800">
           <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-3 px-2">{t.topics}</h3>
           <div className="flex flex-wrap gap-1 px-2">
              {allUniqueTags.map(tag => (
                <button key={tag} onClick={() => handleModeChange('tags', tag)}
                  className={`px-2 py-1 rounded-md text-[9px] font-bold transition-all border ${selectedTag === tag && state.currentMode === 'tags' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-white'}`}>
                  {tag}
                </button>
              ))}
           </div>
        </section>
      </div>
    </div>
  );

  if (loading) return null;

  const progressPercent = state.reviewOrder.length > 0 ? ((state.currentIndex + 1) / state.reviewOrder.length) * 100 : 0;

  return (
    <Layout ref={scrollContainerRef} sidebarContent={sidebarContent} onOpenSettings={() => setIsSettingsOpen(true)} uiLang={state.uiLanguage}>
      <div className="pb-24 pt-1">
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
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 px-6 shadow-sm flex flex-col items-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4 text-emerald-600 text-3xl"><IconCheck /></div>
            <h3 className="text-lg font-black text-slate-900 mb-1">{t.noMistakes}</h3>
            <p className="text-slate-500 text-xs mb-8 max-w-sm">{t.noMistakesDesc}</p>
            <button onClick={() => handleModeChange('sequence')} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95">{t.restart}</button>
          </div>
        )}
      </div>

      {state.reviewOrder.length > 0 && (
        <div className="fixed bottom-6 left-0 right-0 px-4 md:px-0 lg:left-[280px] z-40 flex justify-center pointer-events-none">
          <div className="pointer-events-auto flex items-center bg-white p-1.5 rounded-xl shadow-xl border border-slate-200">
            <button onClick={() => handleNav('prev')} disabled={state.currentIndex === 0}
              className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg disabled:opacity-10 transition-all">
              <IconChevronLeft />
            </button>

            <div className="px-6 flex flex-col items-center justify-center min-w-[130px]">
               <div className="flex items-baseline gap-1 mb-1">
                  <input type="text" value={jumpInputValue}
                    onChange={(e) => setJumpInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleJump()}
                    onBlur={handleJump}
                    className="w-10 bg-slate-50 text-center text-xs font-black text-slate-900 border border-slate-200 rounded p-0.5 transition-all"
                  />
                  <span className="text-[8px] font-black text-slate-400 tracking-tighter">/ {state.reviewOrder.length}</span>
               </div>
               <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
               </div>
            </div>

            <button onClick={() => handleNav('next')} disabled={state.currentIndex === state.reviewOrder.length - 1}
              className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all shadow-sm active:scale-95 ${progressPercent === 100 ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'}`}>
              <IconChevronRight />
            </button>
          </div>
        </div>
      )}

      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">{t.settings}</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="p-1.5 text-slate-400 hover:bg-white hover:text-slate-600 hover:shadow-sm rounded-full transition-all border border-transparent hover:border-slate-100"><IconX /></button>
            </div>
            <div className="p-8 space-y-4">
               <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setState(p => ({...p, uiLanguage: p.uiLanguage === 'cn' ? 'en' : 'cn'}))}
                    className="flex flex-col items-center gap-3 p-5 bg-slate-50 border border-slate-200 rounded-2xl hover:border-indigo-400 hover:bg-indigo-50 transition-all group">
                    <div className="text-slate-400 group-hover:text-indigo-600"><IconLanguages /></div>
                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">{t.uiLanguage}: {state.uiLanguage === 'cn' ? '中' : 'EN'}</span>
                  </button>
                  <button onClick={handleSyncFromDataJson}
                    className="flex flex-col items-center gap-3 p-5 bg-slate-50 border border-slate-200 rounded-2xl hover:border-indigo-400 hover:bg-indigo-50 transition-all group">
                    <div className="text-slate-400 group-hover:text-indigo-600"><IconRepeat /></div>
                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">{t.syncDb}</span>
                  </button>
               </div>
               <button onClick={() => { if(confirm(t.resetConfirm)) { localStorage.clear(); window.location.reload(); } }} 
                className="w-full py-4 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 transition-all mt-2">
                {t.reset}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
