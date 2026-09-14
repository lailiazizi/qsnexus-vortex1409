import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Workspace } from './pages/Workspace';
import { ARResult } from './pages/ARResult';
import { MobileAR } from './pages/MobileAR';
import { Editor } from './pages/Editor';
import { ProjectDetail } from './pages/ProjectDetail';
import { Login } from './pages/Login';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout><Dashboard /></Layout>} />
        <Route path="/workspace/:id" element={<Layout><Workspace /></Layout>} />
        <Route path="/editor/:id" element={<Layout><Editor /></Layout>} />
        <Route path="/project/:id" element={<Layout><ProjectDetail /></Layout>} />
        <Route path="/qr-result/:id" element={<Layout><ARResult /></Layout>} />
        <Route path="/login" element={<Login />} />
        
        {/* AR Viewer is standalone without standard layout for maximum screen immersion */}
        <Route path="/ar/:id" element={<MobileAR />} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
