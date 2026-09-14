import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';
import { LibraryModal } from '../pages/Library';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isEditor = location.pathname.includes('/workspace');
  
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('iseeqs_lang') as Language) || 'EN';
  });

  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('iseeqs_lang', lang);
    window.dispatchEvent(new CustomEvent('langChange', { detail: lang }));
  }, [lang]);

  const t = TRANSLATIONS[lang];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="h-[70px] bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-[100]">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-2xl font-black text-blue-600 tracking-tighter flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-black">QN</div>
            QS Nexus
          </Link>
          
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button 
              onClick={() => setLang('EN')}
              className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${lang === 'EN' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
            >
              EN
            </button>
            <button 
              onClick={() => setLang('BM')}
              className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${lang === 'BM' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
            >
              BM
            </button>
          </div>
        </div>

        <nav>
          <ul className="flex items-center gap-8">
            <li>
              <Link to="/" className={`font-black text-xs uppercase tracking-widest transition-colors ${location.pathname === '/' ? 'text-blue-600 underline underline-offset-8' : 'text-slate-500 hover:text-blue-600'}`}>
                {t.dashboard}
              </Link>
            </li>
            <li>
              <button 
                onClick={() => setIsLibraryOpen(true)}
                className={`font-black text-xs uppercase tracking-widest transition-colors ${isLibraryOpen ? 'text-blue-600 underline underline-offset-8' : 'text-slate-500 hover:text-blue-600'}`}
              >
                {t.library}
              </button>
            </li>
          </ul>
        </nav>
      </header>

      {/* Global SMM Library Modal */}
      <LibraryModal 
        isOpen={isLibraryOpen} 
        onClose={() => setIsLibraryOpen(false)} 
      />

      <main className={`flex-1 ${!isEditor ? 'max-w-full w-full' : ''}`}>
        {children}
      </main>
    </div>
  );
};
