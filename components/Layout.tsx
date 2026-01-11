
import React, { useState } from 'react';
import { IconMenu, IconSettings } from './Icons';
import { translations, UILang } from '../locales';

interface LayoutProps {
  children: React.ReactNode;
  sidebarContent: React.ReactNode;
  onOpenSettings: () => void;
  uiLang: UILang;
}

const Layout: React.FC<LayoutProps> = ({ children, sidebarContent, onOpenSettings, uiLang }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const t = translations[uiLang];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-[60] lg:hidden backdrop-blur-md transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-[70] w-[280px] bg-slate-900 text-slate-100 transition-all duration-300 lg:static lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-8 border-b border-slate-800 flex items-center justify-between">
            <div className="flex flex-col">
              <h1 className="text-xl font-black tracking-tight text-white leading-none">{t.appName}</h1>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-500"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto py-6">
            {sidebarContent}
          </div>

          <div className="p-6 border-t border-slate-800">
            <button 
              onClick={onOpenSettings}
              className="flex items-center gap-3 w-full px-4 py-4 text-slate-400 hover:bg-indigo-600 hover:text-white rounded-2xl transition-all font-bold text-sm"
            >
              <IconSettings />
              <span>{t.settings}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 relative h-full">
        <header className="h-16 md:h-20 flex items-center justify-between px-4 md:px-8 bg-white/70 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-50">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-3 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors border border-slate-100 shadow-sm"
          >
            <IconMenu />
          </button>
          
          <div className="flex-1 flex justify-center lg:justify-start lg:ml-6">
             <span className="text-xs font-black text-slate-800 uppercase lg:hidden">{t.appName}</span>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-lg shadow-indigo-200 border-2 border-white"></div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth">
          <div className="max-w-4xl mx-auto px-4 pb-12 pt-0">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
