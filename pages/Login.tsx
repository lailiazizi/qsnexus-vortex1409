import React from 'react';
import { Link } from 'react-router-dom';

export const Login: React.FC = () => {
  return (
    <div className="fixed inset-0 flex flex-col md:flex-row overflow-hidden">
      {/* Left side: Branding */}
      <div className="hidden md:flex flex-1 bg-gradient-to-br from-blue-600 to-indigo-800 text-white p-16 flex-col justify-center">
        <h1 className="text-6xl font-black mb-6 tracking-tighter">ISeeQS</h1>
        <p className="text-xl text-blue-100 mb-4 font-medium">Visualizing Quantity Surveying in Augmented Reality.</p>
        <p className="text-lg text-blue-200/80 max-w-lg leading-relaxed">
          Bridge the gap between 2D technical drawings and 3D structural models. 
          Designed specifically for QS students and engineering professionals.
        </p>
        <div className="mt-20 flex gap-4">
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">AR</div>
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">3D</div>
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">QS</div>
        </div>
      </div>

      {/* Right side: Form */}
      <div className="flex-1 bg-white p-8 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="md:hidden mb-12">
            <h1 className="text-4xl font-black text-blue-600 tracking-tighter">ISeeQS</h1>
          </div>
          
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h2>
            <p className="text-slate-500 font-medium">Please enter your details to sign in.</p>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
              <input 
                type="email" 
                placeholder="student@university.edu"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition-all font-medium" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
              <input 
                type="password" 
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition-all font-medium" 
              />
            </div>

            <div className="flex items-center justify-between text-xs font-bold">
              <label className="flex items-center gap-2 text-slate-500 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded text-blue-600 border-slate-300" />
                Remember me
              </label>
              <button className="text-blue-600 hover:underline">Forgot password?</button>
            </div>

            <Link 
              to="/" 
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl text-center shadow-xl shadow-blue-100 transition-all hover:-translate-y-0.5"
            >
              Sign In
            </Link>

            <div className="text-center text-xs text-slate-400 font-bold pt-6 border-t border-slate-50">
              Don't have an account? <button className="text-blue-600 hover:underline ml-1">Sign up</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
