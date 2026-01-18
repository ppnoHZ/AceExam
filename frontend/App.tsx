
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Question, ReviewMode, AppState } from './types';
import { translations, UILang } from './locales';
import Layout from './components/Layout';
import QuestionDisplay from './components/QuestionDisplay';
import { IconPlay, IconRepeat, IconX, IconCheck, IconLanguages, IconChevronLeft, IconChevronRight } from './components/Icons';
import { useSocket } from './hooks/useSocket';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<{ id: number; message: string; isCorrect: boolean }[]>([]);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [userCount, setUserCount] = useState(1);
  const [isOpsOpen, setIsOpsOpen] = useState(false);
  const [dbStats, setDbStats] = useState({ totalAnswers: 0, correctAnswers: 0, accuracy: 0, uniqueUsersInDb: 0 });

  useEffect(() => {
    if (isOpsOpen) {
      const fetchStats = async () => {
        try {
          const res = await fetch('http://localhost:3003/api/stats');
          const data = await res.json();
          setDbStats(data);
        } catch (e) {
          console.error("Failed to fetch stats", e);
        }
      };
      fetchStats();
      const interval = setInterval(fetchStats, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpsOpen]);

  const socketOptions = useMemo(() => ({
    auth: { fingerprint },
    path: '/socket.io/aceexam'
  }), [fingerprint]);

  const { emit, on, isConnected } = useSocket('http://localhost:3003', socketOptions);

  useEffect(() => {
    if (!isConnected) return;
    const cleanup = on('user_count_update', (data: any) => {
      setUserCount(data.count);
    });
    return cleanup;
  }, [on, isConnected]);

  useEffect(() => {
    const setFp = async () => {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      setFingerprint(result.visitorId);
    };
    setFp();
  }, []);

  useEffect(() => {
    if (!fingerprint || !isConnected) return;

    const cleanup = on('broadcast_answer', (data: any) => {
      const userIdDisplay = data.fingerprint ? data.fingerprint.substring(0, 6) : data.userId.substring(0, 4);
      const msg = `User ${userIdDisplay}: Question #${data.questionId} is ${data.isCorrect ? 'Correct' : 'Incorrect'}`;
      const id = Date.now();
      setNotifications(prev => [...prev, { id, message: msg, isCorrect: data.isCorrect }]);
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 3000);
    });
    return cleanup;
  }, [on, fingerprint, isConnected]);

  const [state, setState] = useState<AppState>(() => {
    const savedRecords = localStorage.getItem('answerRecords');
    const savedBilingual = localStorage.getItem('aceexam_bilingual');
    const savedShowAnswer = localStorage.getItem('aceexam_show_answer');
    const savedMode = localStorage.getItem('aceexam_mode') as ReviewMode;
    const savedIndex = localStorage.getItem('aceexam_sequence_index');
    
    return {
      questions: [],
      currentMode: savedMode || 'sequence',
      currentIndex: (savedMode === 'sequence' || !savedMode) && savedIndex ? parseInt(savedIndex, 10) : 0,
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
  const autoNextTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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

        setState(prev => {
          const qCount = questions.length;
          let newOrder: number[] = [];
          const savedTag = localStorage.getItem('aceexam_selected_tag');
          
          switch (prev.currentMode) {
            case 'sequence': 
              newOrder = Array.from({ length: qCount }, (_, i) => i); 
              break;
            case 'shuffle': 
              newOrder = Array.from({ length: qCount }, (_, i) => i).sort(() => Math.random() - 0.5); 
              break;
            case 'random': 
              newOrder = Array.from({ length: qCount }, (_, i) => i).sort(() => Math.random() - 0.5).slice(0, Math.min(20, qCount)); 
              break;
            case 'wrong': 
              newOrder = Array.from({ length: qCount }, (_, i) => i).filter(i => {
                const rec = prev.answerRecords[questions[i].question_id];
                return rec && rec.incorrect > 0;
              }); 
              break;
            case 'tags': 
              if (savedTag) {
                newOrder = Array.from({ length: qCount }, (_, i) => i).filter(i => questions[i].tags?.includes(savedTag));
                setSelectedTag(savedTag);
              } else {
                newOrder = Array.from({ length: qCount }, (_, i) => i);
              }
              break;
            default:
              newOrder = Array.from({ length: qCount }, (_, i) => i);
          }

          return {
            ...prev,
            questions,
            reviewOrder: newOrder,
            currentIndex: Math.min(prev.currentIndex, Math.max(0, newOrder.length - 1))
          };
        });
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
    localStorage.setItem('aceexam_mode', state.currentMode);
    if (state.currentMode === 'sequence') {
      localStorage.setItem('aceexam_sequence_index', state.currentIndex.toString());
    }
    if (selectedTag) {
      localStorage.setItem('aceexam_selected_tag', selectedTag);
    } else {
      localStorage.removeItem('aceexam_selected_tag');
    }
  }, [state.questions, state.answerRecords, state.uiLanguage, state.bilingualMode, state.showAnswerDirectly, state.currentMode, state.currentIndex, selectedTag]);

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
      case 'shuffle': newOrder = Array.from({ length: qCount }, (_, i) => i).sort(() => Math.random() - 0.5); break;
      case 'random': newOrder = Array.from({ length: qCount }, (_, i) => i).sort(() => Math.random() - 0.5).slice(0, Math.min(20, qCount)); break;
      case 'wrong': newOrder = Array.from({ length: qCount }, (_, i) => i).filter(i => {
          const rec = state.answerRecords[state.questions[i].question_id];
          return rec && rec.incorrect > 0;
        }); break;
      case 'tags': if (tag) { newOrder = Array.from({ length: qCount }, (_, i) => i).filter(i => state.questions[i].tags?.includes(tag)); } else { newOrder = Array.from({ length: qCount }, (_, i) => i); } break;
    }

    let nextIndex = 0;
    if (mode === 'sequence') {
      const savedIndex = localStorage.getItem('aceexam_sequence_index');
      if (savedIndex) {
        nextIndex = Math.min(parseInt(savedIndex, 10), newOrder.length - 1);
        if (nextIndex < 0) nextIndex = 0;
      }
    }

    setState(prev => ({ ...prev, currentMode: mode, currentIndex: nextIndex, reviewOrder: newOrder }));
  };

  const handleNav = (dir: 'prev' | 'next') => {
    if (autoNextTimeoutRef.current) {
      clearTimeout(autoNextTimeoutRef.current);
      autoNextTimeoutRef.current = null;
    }
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

    // Send answer to backend via WebSocket
    emit('submit_answer', {
      questionId: qId,
      isCorrect,
    });

    if (isCorrect) {
      if (autoNextTimeoutRef.current) clearTimeout(autoNextTimeoutRef.current);
      autoNextTimeoutRef.current = setTimeout(() => {
        handleNav('next');
        autoNextTimeoutRef.current = null;
      }, 1500);
    }

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
      localStorage.removeItem('aceexam_sequence_index');
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
          <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-3 px-2">{t.opsDashboard}</h3>
          <button 
            onClick={() => setIsOpsOpen(true)}
            className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 hover:bg-slate-800 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping absolute inset-0" />
                <div className="w-2 h-2 bg-emerald-500 rounded-full relative" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-white transition-colors">{t.liveStats}</span>
            </div>
            <span className="bg-indigo-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md min-w-[20px] text-center">{userCount}</span>
          </button>
        </section>
      </div>
    </div>
  );

  if (loading) return null;

  const progressPercent = state.reviewOrder.length > 0 ? ((state.currentIndex + 1) / state.reviewOrder.length) * 100 : 0;

  return (
    <Layout 
      ref={scrollContainerRef} 
      sidebarContent={sidebarContent} 
      onOpenSettings={() => setIsSettingsOpen(true)} 
      uiLang={state.uiLanguage}
      fingerprint={fingerprint}
      isSocketConnected={isConnected}
    >
      {/* Operations Dashboard Modal */}
      {isOpsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setIsOpsOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-300">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Live Analytics</h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Real-time Terminal Platform</p>
                </div>
                <button onClick={() => setIsOpsOpen(false)} className="p-2 hover:bg-slate-100 rounded-2xl transition-all">
                  <IconX />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active nodes</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-4xl font-black text-slate-900 tracking-tighter">{userCount}</span>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  </div>
                </div>
                <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-lg shadow-indigo-200">
                  <span className="text-[9px] font-black text-indigo-200 uppercase tracking-widest">Total Answers</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-4xl font-black tracking-tighter">{dbStats.totalAnswers}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Unique Users (History)</span>
                  <div className="mt-2">
                    <span className="text-2xl font-black text-slate-900 tracking-tighter">{dbStats.uniqueUsersInDb}</span>
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Global Accuracy</span>
                  <div className="mt-2">
                    <span className="text-2xl font-black text-indigo-600 tracking-tighter">{dbStats.accuracy}%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Real-time Stream</span>
                  <span className="text-[10px] font-black text-indigo-600 uppercase">Live</span>
                </div>
                <div className="bg-slate-900 rounded-2xl p-4 font-mono text-[9px] text-slate-400 h-40 overflow-y-auto space-y-2 custom-scrollbar-hidden">
                  <div className="flex gap-3">
                    <span className="text-emerald-500">[SYSTEM]</span>
                    <span>Platform initialized. Port 3003 listening...</span>
                  </div>
                  {notifications.slice(-10).reverse().map(n => (
                    <div key={n.id} className="flex gap-3">
                      <span className={n.isCorrect ? 'text-indigo-400' : 'text-rose-400'}>[TRAFFIC]</span>
                      <span className="text-slate-300">{n.message}</span>
                    </div>
                  ))}
                  <div className="flex gap-3">
                    <span className="text-slate-600">[METRIC]</span>
                    <span>Total active sessions synced: {userCount}</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setIsOpsOpen(false)}
                className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg active:scale-[0.98]"
              >
                Close Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {notifications.map(n => (
          <div key={n.id} className={`p-3 rounded-lg shadow-lg border text-[10px] font-black uppercase tracking-wider animate-bounce flex items-center gap-2 pointer-events-auto bg-white ${n.isCorrect ? 'border-emerald-500 text-emerald-600' : 'border-rose-500 text-rose-600'}`}>
            <div className={`w-2 h-2 rounded-full ${n.isCorrect ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} />
            {n.message}
          </div>
        ))}
      </div>

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
