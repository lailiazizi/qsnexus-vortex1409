import React, { useState, useEffect } from 'react';
import { SMM3_LIBRARY, SMM2_LIBRARY, TRANSLATIONS } from '../constants';
import { Language, SMMEdition } from '../types';

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSectionId?: string;
  initialEdition?: SMMEdition;
}

export const LibraryModal: React.FC<LibraryModalProps> = ({ 
  isOpen, 
  onClose, 
  initialSectionId, 
  initialEdition = 'SMM3' 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [lang, setLang] = useState<Language>((localStorage.getItem('iseeqs_lang') as Language) || 'EN');
  const [edition, setEdition] = useState<SMMEdition>(initialEdition);
  const [selectedSectionId, setSelectedSectionId] = useState<string | undefined>(initialSectionId);
  
  const currentLibrary = edition === 'SMM3' ? SMM3_LIBRARY : SMM2_LIBRARY;

  useEffect(() => {
    const handleLang = (e: any) => setLang(e.detail);
    window.addEventListener('langChange', handleLang);
    return () => window.removeEventListener('langChange', handleLang);
  }, []);

  // Update selection if the initial prop changes while open
  useEffect(() => {
    if (initialSectionId) setSelectedSectionId(initialSectionId);
    if (initialEdition) setEdition(initialEdition);
  }, [initialSectionId, initialEdition, isOpen]);

  if (!isOpen) return null;

  const t = TRANSLATIONS[lang];
  const activeSection = selectedSectionId ? currentLibrary[selectedSectionId] : null;

  const filteredSections = Object.values(currentLibrary).filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.titleBM.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.id.includes(searchTerm)
  );

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 md:p-10 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-slate-50 w-full max-w-7xl h-full max-h-[90vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-white/20 animate-in zoom-in duration-300">
        
        {/* Modal Header */}
        <div className="px-10 py-6 bg-white border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {t.library}
              </h2>
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button 
                  onClick={() => setEdition('SMM3')}
                  className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${edition === 'SMM3' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  SMM3
                </button>
                <button 
                  onClick={() => setEdition('SMM2')}
                  className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${edition === 'SMM2' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  SMM2
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">{t.smmTitle}</p>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input 
                type="text" 
                placeholder={t.searchLib}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl shadow-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-medium text-xs"
              />
            </div>
            <button 
              onClick={onClose}
              className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-red-500 transition-all shadow-lg active:scale-90 shrink-0"
            >
              <span className="text-xl font-bold">×</span>
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Sidebar */}
          <div className="w-full lg:w-80 bg-white border-r border-slate-200 overflow-y-auto p-6 space-y-2 shrink-0">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{t.browseSections}</h3>
            {filteredSections.map(section => (
              <button
                key={section.id}
                onClick={() => setSelectedSectionId(section.id)}
                className={`w-full text-left p-3.5 rounded-xl transition-all border flex items-center gap-4 group ${
                  selectedSectionId === section.id 
                  ? (edition === 'SMM3' ? 'bg-blue-600 border-blue-600' : 'bg-indigo-600 border-indigo-600') + ' text-white shadow-lg' 
                  : 'bg-white border-slate-100 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                <span className={`text-[10px] font-black w-7 h-7 rounded flex items-center justify-center ${
                  selectedSectionId === section.id ? 'bg-white/20' : 'bg-slate-100 text-slate-500'
                }`}>
                  {section.id}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate">{lang === 'EN' ? section.title : section.titleBM}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Main Panel */}
          <div className="flex-1 overflow-y-auto p-10 bg-slate-50">
            {activeSection ? (
              <div className="max-w-4xl mx-auto space-y-10 animate-in slide-in-from-bottom-4 duration-300">
                <div className="bg-white border border-slate-200 rounded-[32px] p-10 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] pointer-events-none translate-x-10 -translate-y-10">
                     <div className={`w-full h-full rounded-full ${edition === 'SMM3' ? 'bg-blue-600' : 'bg-indigo-600'}`} />
                  </div>

                  <div className="mb-10">
                    <span className={`text-[9px] font-black uppercase tracking-widest mb-2 block ${edition === 'SMM3' ? 'text-blue-600' : 'text-indigo-600'}`}>
                      {edition} — Section {activeSection.id}
                    </span>
                    <h2 className="text-3xl font-black text-slate-900 leading-tight">
                      {lang === 'EN' ? activeSection.title : activeSection.titleBM}
                    </h2>
                  </div>

                  <section className="mb-12">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                       <span className={`w-1.5 h-1.5 rounded-full ${edition === 'SMM3' ? 'bg-blue-600' : 'bg-indigo-600'}`}></span> {t.preambles}
                    </h4>
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                      <ul className="space-y-3">
                        {(lang === 'EN' ? activeSection.preambles.en : activeSection.preambles.bm).map((p, i) => (
                          <li key={i} className="text-sm text-slate-600 font-medium flex gap-3">
                            <span className={`${edition === 'SMM3' ? 'text-blue-400' : 'text-indigo-400'} font-black`}>•</span> {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>

                  <section>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                       <span className={`w-1.5 h-1.5 rounded-full ${edition === 'SMM3' ? 'bg-blue-600' : 'bg-indigo-600'}`}></span> {t.measurementRules}
                    </h4>
                    <div className="overflow-hidden border border-slate-100 rounded-2xl shadow-sm overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                          <tr className="bg-slate-900 text-white">
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest border-r border-slate-700">Level One</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest border-r border-slate-700">Unit</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest border-r border-slate-700">Level Two</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Level Three</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {activeSection.rules.map((rule, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-6 text-sm font-bold text-slate-900 border-r border-slate-50 align-top">{rule.level1}</td>
                              <td className={`px-6 py-6 text-xs font-black border-r border-slate-50 align-top ${edition === 'SMM3' ? 'text-blue-600' : 'text-indigo-600'}`}>{rule.unit}</td>
                              <td className="px-6 py-6 text-xs text-slate-500 border-r border-slate-50 align-top">
                                <ul className="space-y-1.5">
                                  {rule.level2.map((l2, i) => <li key={i}>• {l2}</li>)}
                                </ul>
                              </td>
                              <td className="px-6 py-6 text-xs text-slate-400 align-top">
                                <ul className="space-y-1.5">
                                  {rule.level3?.map((l3, i) => <li key={i}>• {l3}</li>)}
                                </ul>
                                {rule.notes && (
                                  <div className="mt-4 p-3 bg-amber-50 rounded-lg text-[9px] text-amber-700 font-bold border border-amber-100 leading-relaxed">
                                     Note: {rule.notes}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-6">
                 <div className="text-6xl grayscale opacity-10">📖</div>
                 <div>
                   <h3 className="text-xl font-bold text-slate-300 uppercase tracking-tight">Select a Section</h3>
                   <p className="text-slate-400 text-xs max-w-xs mt-2 font-medium">Browse measurement rules from the {edition} manual on the left sidebar.</p>
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
