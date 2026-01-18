
import React, { useState, useEffect, forwardRef } from 'react';
import { IconMenu, IconSettings, IconX } from './Icons';
import { translations, UILang } from '../locales';

interface LayoutProps {
  children: React.ReactNode;
  sidebarContent: React.ReactNode;
  onOpenSettings: () => void;
  uiLang: UILang;
  fingerprint?: string | null;
  isSocketConnected?: boolean;
}

const Layout = forwardRef<HTMLDivElement, LayoutProps>(({ children, sidebarContent, onOpenSettings, uiLang, fingerprint, isSocketConnected }, ref) => {
  // Desktop sidebar state: default open on large screens, hidden on small
  const [isSidebarVisible, setIsSidebarVisible] = useState(window.innerWidth >= 1024);
  const t = translations[uiLang];

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarVisible(false);
      } else {
        setIsSidebarVisible(true);
      }
    };

    window.addEventListener('resize', handleResize);
    // Set initial state correctly on mount
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => setIsSidebarVisible(!isSidebarVisible);

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Mobile Drawer Overlay */}
      <div 
        className={`fixed inset-0 bg-slate-900/60 z-[60] lg:hidden transition-opacity duration-300 ${isSidebarVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={toggleSidebar}
      />

      {/* Collapsible Sidebar */}
      <aside 
        onClick={() => { if (window.innerWidth < 1024) setIsSidebarVisible(false); }}
        className={`
          fixed inset-y-0 left-0 z-[70] bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out overflow-hidden flex flex-col
          lg:static lg:translate-x-0
          ${isSidebarVisible ? 'w-[280px] translate-x-0 shadow-2xl lg:shadow-none' : 'w-0 -translate-x-full lg:w-0'}
        `}
      >
        <div className="w-[280px] flex flex-col h-full shrink-0">
          <div className="p-6 pb-4 flex items-center justify-between">
            <h1 className="text-lg font-black tracking-tighter text-white uppercase">{t.appName}</h1>
            <button onClick={toggleSidebar} className="lg:hidden p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-500">
              <IconX />
            </button>
          </div>
          
          <div className="flex-1 overflow-hidden">
            {sidebarContent}
          </div>

          <div className="p-4">
            <button onClick={onOpenSettings}
              className="flex items-center gap-3 w-full px-4 py-3 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-xl transition-all font-black text-[10px] uppercase tracking-widest border border-slate-700">
              <IconSettings />
              <span>{t.settings}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 relative h-full">
        {/* Universal Header */}
        <header className="h-14 flex items-center gap-4 px-4 bg-white border-b border-slate-200 sticky top-0 z-50">
          <button 
            onClick={toggleSidebar}
            className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-all border border-slate-200 shadow-sm active:scale-95"
          >
            <IconMenu />
          </button>
          
          <div className="flex-1 overflow-hidden">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] truncate">{t.appName}</span>
          </div>
          
          <div className="flex items-center gap-2">
             {fingerprint && (
               <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-lg border border-slate-200 shadow-sm">
                 <div className={`w-1.5 h-1.5 rounded-full ${isSocketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                 <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">
                   {fingerprint.substring(0, 8)}
                 </span>
               </div>
             )}
          </div>
        </header>

        {/* Scrollable Container */}
        <div 
          ref={ref}
          className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth"
        >
          <div className="max-w-3xl mx-auto px-4 pb-28 pt-1">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
});

Layout.displayName = 'Layout';

export default Layout;
