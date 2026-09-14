import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { COMPONENT_CONFIGS } from '../constants';

export const ProjectDetail: React.FC = () => {
  const { id } = useParams();

  const existingComponents = [
    { id: '1', name: 'Pad Footing F1', type: 'Pad Footing', status: 'Ready' },
    { id: '2', name: 'Column C2 - Grid A4', type: 'Column', status: 'Draft' },
    { id: '3', name: 'Ground Beam GB1', type: 'Ground Beam', status: 'Ready' },
  ];

  return (
    <div className="animate-in fade-in duration-500 max-w-7xl mx-auto py-8 px-4">
      <div className="mb-8">
        <Link to="/" className="text-sm text-slate-400 hover:text-blue-600 flex items-center gap-2 mb-4 font-medium transition-colors">
          <span>&larr;</span> Back to Dashboard
        </Link>
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Residential Block A</h2>
      </div>

      <section className="mb-12">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
           Add New Component
        </h3>
        <p className="text-slate-500 mb-8 text-sm">Select a building element to configure dimensions and visualize in 3D/AR.</p>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Object.values(COMPONENT_CONFIGS).map((config) => (
            <Link 
              key={config.id}
              to={`/editor/${id}?type=${config.id}`}
              className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col items-center text-center hover:shadow-lg hover:border-blue-400 hover:-translate-y-1 transition-all group"
            >
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-bold text-lg mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                {config.shortName}
              </div>
              <h4 className="text-xs font-bold text-slate-900 mb-1">{config.name}</h4>
              <span className="text-[10px] text-slate-400 font-medium">{config.category}</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold mb-6">Existing Components</h3>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Component Name</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {existingComponents.map((comp) => (
                <tr key={comp.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">{comp.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-500 font-medium">{comp.type}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      comp.status === 'Ready' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-slate-50 text-slate-500 border border-slate-100'
                    }`}>
                      {comp.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-3">
                    <Link to={`/editor/${id}`} className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold px-4 py-1.5 rounded-lg transition-all">Edit</Link>
                    <Link to={`/qr-result/${comp.id}`} className={`bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold px-4 py-1.5 rounded-lg transition-all ${comp.status === 'Draft' ? 'opacity-30 pointer-events-none' : ''}`}>View QR</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
