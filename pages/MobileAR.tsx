import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ProjectComponent, ComponentType } from '../types';
import { ZapparARView } from '../components/ZapparARView';
import LZString from 'lz-string';

export const MobileAR: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [components, setComponents] = useState<ProjectComponent[]>([]);
  const [drawingUrl, setDrawingUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // 1. Check for saved or cached drawing
    if (id) {
      const savedDrawing = localStorage.getItem(`iseeqs_drawing_${id}`);
      if (savedDrawing) {
        setDrawingUrl(savedDrawing);
      }
    }

    // 2. Gather search params from location.search, window.location.search, and hash
    const searchString = location.search || window.location.search;
    const params = new URLSearchParams(searchString);
    
    // Also check for query parameters inside window.location.hash
    let urlData = params.get('data');
    let urlTargetUrl = params.get('targetUrl');

    if (!urlData && window.location.hash.includes('?')) {
      const hashQuery = window.location.hash.split('?')[1];
      const hashParams = new URLSearchParams(hashQuery);
      urlData = hashParams.get('data');
      urlTargetUrl = hashParams.get('targetUrl');
    }

    // ✅ Restore target URL to localStorage so ZapparARView can find it
    if (urlTargetUrl) {
      const decoded = decodeURIComponent(urlTargetUrl);
      localStorage.setItem(`iseeqs_target_url_${id}`, decoded);
    }

    // ✅ Restore project components from URL payload (QR Code)
    if (urlData) {
      try {
        const decompressed = LZString.decompressFromEncodedURIComponent(urlData);
        if (decompressed) {
          const parsed = JSON.parse(decompressed);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setComponents(parsed);
            setReady(true);
            return;
          }
        }
      } catch (e) {
        console.error('Failed to parse URL data:', e);
      }
    }

    // ✅ Fallback to localStorage
    const saved = localStorage.getItem(`iseeqs_project_${id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setComponents(parsed);
          setReady(true);
          return;
        }
      } catch {
        // fallback
      }
    }

    // Default Demo Pad Footing & Column structure
    const demoData: ProjectComponent[] = [
      {
        id: 'pf-demo',
        name: 'Pad Footing PF-1',
        type: 'pad-footing' as ComponentType,
        status: 'Ready',
        dimensions: { x: 1200, y: 1200, z: 400 },
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        includeReinforcement: true,
        showMeasurements: true,
        lastEdited: 'now'
      },
      {
        id: 'st-demo',
        name: 'Stump ST-1',
        type: 'stump' as ComponentType,
        status: 'Ready',
        dimensions: { x: 250, y: 250, z: 900 },
        position: { x: 0, y: 0, z: 650 },
        rotation: { x: 0, y: 0, z: 0 },
        includeReinforcement: true,
        showMeasurements: true,
        lastEdited: 'now'
      }
    ];
    setComponents(demoData);
    setReady(true);
  }, [id, location.search]);

  if (!ready) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
        <p className="text-sm opacity-60">Loading AR...</p>
      </div>
    );
  }

  return (
    <ZapparARView
      components={components}
      drawingUrl={drawingUrl}
      projectId={id}
      onClose={() => navigate(`/workspace/${id}`)}
    />
  );
};
