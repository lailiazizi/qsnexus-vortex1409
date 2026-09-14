import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Project, ProjectComponent, Language } from '../types';
import { TEXTBOOK_INFO, TRANSLATIONS } from '../constants';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('iseeqs_lang') as Language) || 'EN';
  });

  useEffect(() => {
    const handleLang = (e: any) => setLang(e.detail);
    window.addEventListener('langChange', handleLang);
    return () => window.removeEventListener('langChange', handleLang);
  }, []);

  const t = TRANSLATIONS[lang];

  const [projects, setProjects] = useState<Project[]>([
    {
      id: 'example-house',
      name: 'Single-Storey House',
      description: 'A complete foundation and sub-structure assembly for a standard residential house, including footings, stumps, and ground slabs.',
      status: 'Active',
      lastEdited: 'Reference Project',
      isExample: true,
      components: []
    },
    {
      id: '1',
      name: 'Residential Block A',
      description: 'Structural analysis for the main foundation layout including pad footings.',
      status: 'Active',
      lastEdited: '2 hours ago',
      components: []
    }
  ]);

  const createNewProject = () => {
    const newId = Date.now().toString();
    const newProject: Project = {
      id: newId,
      name: 'New Project ' + (projects.length + 1),
      description: 'Project created for structural visualization.',
      status: 'Draft',
      lastEdited: 'Just now',
      components: []
    };
    setProjects([newProject, ...projects]);
    navigate(`/workspace/${newId}`);
  };

  const loadExample = (id: string) => {
    if (id === 'example-house') {
      const exampleComponents: ProjectComponent[] = [
        {
          id: 'pf-1',
          name: 'Pad Footing PF-1',
          type: 'pad-footing',
          status: 'Ready',
          dimensions: { x: 1200, y: 1200, z: 400 },
          position: { x: -1500, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          includeReinforcement: true,
          showMeasurements: true,
          lastEdited: 'Ref'
        },
        {
          id: 'st-1',
          name: 'Stump ST-1',
          type: 'stump',
          status: 'Ready',
          dimensions: { x: 250, y: 250, z: 900 },
          position: { x: -1500, y: 0, z: 650 },
          rotation: { x: 0, y: 0, z: 0 },
          includeReinforcement: true,
          showMeasurements: true,
          lastEdited: 'Ref'
        },
        {
          id: 'pf-2',
          name: 'Pad Footing PF-2',
          type: 'pad-footing',
          status: 'Ready',
          dimensions: { x: 1200, y: 1200, z: 400 },
          position: { x: 1500, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          includeReinforcement: true,
          showMeasurements: true,
          lastEdited: 'Ref'
        },
        {
          id: 'st-2',
          name: 'Stump ST-2',
          type: 'stump',
          status: 'Ready',
          dimensions: { x: 250, y: 250, z: 900 },
          position: { x: 1500, y: 0, z: 650 },
          rotation: { x: 0, y: 0, z: 0 },
          includeReinforcement: true,
          showMeasurements: true,
          lastEdited: 'Ref'
        },
        {
          id: 'gb-1',
          name: 'Ground Beam GB-1',
          type: 'ground-beam',
          status: 'Ready',
          dimensions: { x: 3000, y: 250, z: 450 },
          position: { x: 0, y: 0, z: 1100 },
          rotation: { x: 0, y: 0, z: 0 },
          includeReinforcement: true,
          showMeasurements: true,
          lastEdited: 'Ref'
        },
        {
          id: 'gs-1',
          name: 'Ground Slab GS-1',
          type: 'ground-slab',
          status: 'Ready',
          dimensions: { x: 4000, y: 4000, z: 150 },
          position: { x: 0, y: 0, z: 1325 },
          rotation: { x: 0, y: 0, z: 0 },
          includeReinforcement: false,
          showMeasurements: true,
          lastEdited: 'Ref'
        }
      ];
      localStorage.setItem(`iseeqs_project_${id}`, JSON.stringify(exampleComponents));
      navigate(`/workspace/${id}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-12 px-6">
      {/* Local Storage Disclaimer Banner */}
      <div className="mb-10 p-6 bg-slate-900 border-b-4 border-blue-500 rounded-[32px] shadow-xl flex flex-col md:flex-row items-center gap-6 animate-in slide-in-from-top duration-500">
         <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 text-2xl shrink-0 border border-blue-500/20">
            ℹ️
         </div>
         <div className="text-center md:text-left">
            <h4 className="text-sm font-black text-white uppercase tracking-widest mb-1">{t.disclaimerTitle}</h4>
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed max-w-2xl">
               {t.disclaimerText}
            </p>
         </div>
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-start mb-12 gap-8">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">My Projects</h2>
          <p className="text-slate-500 font-medium mt-2">Manage your Quantity Surveying visualization projects.</p>
        </div>
        <div className="flex flex-col items-end gap-4 w-full lg:w-auto">
          <button 
            onClick={createNewProject}
            className="w-full lg:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-200 active:scale-95"
          >
            <span className="text-xl">+</span> CREATE NEW PROJECT
          </button>
          
          <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm">
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                Reference Source<br/>
                <span className="text-blue-600">RISM Textbook</span>
             </div>
             <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-white font-black text-[10px]">RISM</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {projects.map((project) => (
          <div key={project.id} className={`bg-white border rounded-[32px] p-8 flex flex-col hover:shadow-2xl transition-all group relative overflow-hidden ${project.isExample ? 'border-amber-200 bg-amber-50/20' : 'border-slate-100 hover:border-blue-200'}`}>
            {project.isExample && (
              <div className="absolute top-0 right-0 p-4">
                <span className="bg-amber-500 text-white text-[9px] font-black px-3 py-1 rounded-full shadow-lg">REFERENCE</span>
              </div>
            )}
            
            <div className="flex justify-between items-start mb-6">
              <div className="flex flex-col">
                <h4 className={`text-xl font-black group-hover:text-blue-600 transition-colors ${project.isExample ? 'text-amber-800' : 'text-slate-900'}`}>{project.name}</h4>
                <span className={`text-[10px] font-black uppercase tracking-widest mt-2 ${project.isExample ? 'text-amber-600' : 'text-slate-400'}`}>
                  {project.isExample ? 'Reference House Model' : project.status}
                </span>
              </div>
            </div>

            <p className="text-slate-500 text-sm flex-1 mb-8 leading-relaxed font-medium">
              {project.description}
            </p>

            <div className="flex items-center gap-3 mb-8">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold ${project.isExample ? 'bg-amber-200 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                    {i}
                  </div>
                ))}
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                {project.isExample ? 'Verified Model' : 'Draft Assembly'}
              </span>
            </div>

            <div className="pt-6 border-t border-slate-50 flex justify-between items-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase">{project.isExample ? 'Standard Reference' : project.lastEdited}</span>
              <button 
                onClick={() => project.isExample ? loadExample(project.id) : navigate(`/workspace/${project.id}`)}
                className={`text-xs font-black px-6 py-3 rounded-xl transition-all border shadow-sm ${
                  project.isExample 
                  ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600' 
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-600 hover:text-white hover:border-blue-600'
                }`}
              >
                {project.isExample ? 'LOAD HOUSE MODEL' : 'OPEN WORKSPACE'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
