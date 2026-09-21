import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ProjectComponent, ComponentType } from '../types';
import { ZapparARView } from '../components/ZapparARView';
import { getDrawingFromDb, getProjectFromDb } from '../utils/drawingDatabase';
import { loadProjectFromCloud, fetchMarkerAsDataUrl } from '../utils/cloudSync';
import { isSupabaseConfigured } from '../supabase';
import LZString from 'lz-string';

const DEMO_COMPONENTS: ProjectComponent[] = [
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

const CLOUD_TIMEOUT_MS = 8000;

export const MobileAR: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [components, setComponents] = useState<ProjectComponent[]>([]);
  const [drawingUrl, setDrawingUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // 1. URL parameters (QR payload / targetUrl), same behaviour as before
      const searchString = location.search || window.location.search;
      const params = new URLSearchParams(searchString);
      let urlData = params.get('data');
      let urlTargetUrl = params.get('targetUrl');

      if (!urlData && window.location.hash.includes('?')) {
        const hashQuery = window.location.hash.split('?')[1];
        const hashParams = new URLSearchParams(hashQuery);
        urlData = hashParams.get('data');
        urlTargetUrl = hashParams.get('targetUrl');
      }

      if (urlTargetUrl) {
        localStorage.setItem(`iseeqs_target_url_${id}`, decodeURIComponent(urlTargetUrl));
      }

      let urlComponents: ProjectComponent[] | null = null;
      if (urlData) {
        try {
          const decompressed = LZString.decompressFromEncodedURIComponent(urlData);
          if (decompressed) {
            const parsed = JSON.parse(decompressed);
            if (Array.isArray(parsed) && parsed.length > 0) urlComponents = parsed;
          }
        } catch (e) {
          console.error('Failed to parse URL data:', e);
        }
      }

      // 2. Cloud (Supabase). A phone that never opened this project has nothing stored locally,
      //    so the cloud copy is the one that matters. Wait for it (with a timeout) before starting AR.
      let cloudComponents: ProjectComponent[] | null = null;
      let cloudDrawing: string | null = null;
      let cloudError: string | null = null;
      let cloudRowFound = false;

      if (id && isSupabaseConfigured) {
        const res = await Promise.race([
          loadProjectFromCloud(id),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), CLOUD_TIMEOUT_MS))
        ]);
        if (cancelled) return;

        if (res === null) {
          cloudError = 'Cloud request timed out.';
        } else if (!res.ok) {
          cloudError = res.error || 'Cloud request failed.';
        } else if (res.data) {
          cloudRowFound = true;
          if (res.data.components && res.data.components.length > 0) {
            cloudComponents = res.data.components as ProjectComponent[];
          }
          if (res.data.markerPath) {
            cloudDrawing = await fetchMarkerAsDataUrl(res.data.markerPath);
            if (cancelled) return;
          }
        }
      }

      // 3. Marker image: cloud first, then this device (localStorage, then IndexedDB)
      let finalDrawing: string | null = cloudDrawing;
      if (!finalDrawing && id) {
        finalDrawing = localStorage.getItem(`iseeqs_drawing_${id}`) || (await getDrawingFromDb(id));
        if (cancelled) return;
      }

      // 4. Model: URL payload > cloud > localStorage > IndexedDB > demo
      let finalComponents: ProjectComponent[] | null = urlComponents || cloudComponents;

      if (!finalComponents) {
        const saved = localStorage.getItem(`iseeqs_project_${id}`);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) finalComponents = parsed;
          } catch {
            // ignore, try next source
          }
        }
      }

      if (!finalComponents && id) {
        const projectRecord = await getProjectFromDb(id);
        if (cancelled) return;
        if (projectRecord && projectRecord.components && projectRecord.components.length > 0) {
          finalComponents = projectRecord.components;
        }
      }

      let message: string | null = null;
      if (!finalComponents) {
        finalComponents = DEMO_COMPONENTS;
        if (isSupabaseConfigured) {
          message = cloudError
            ? `Cloud unavailable (${cloudError}). Showing demo model.`
            : cloudRowFound
            ? 'This project has no components saved yet. Showing demo model.'
            : 'Project not found in the cloud. Showing demo model.';
        }
      } else if (cloudError) {
        message = `Cloud unavailable (${cloudError}). Using data saved on this device.`;
      }

      if (cancelled) return;
      setDrawingUrl(finalDrawing);
      setComponents(finalComponents);
      setNotice(message);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [id, location.search]);

  // Auto-hide the notice
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 8000);
    return () => clearTimeout(t);
  }, [notice]);

  if (!ready) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
        <p className="text-sm opacity-60">Loading AR...</p>
      </div>
    );
  }

  return (
    <>
      {notice && (
        <div className="fixed top-3 left-3 right-3 z-[100] pointer-events-none flex justify-center">
          <div className="bg-amber-500/95 text-slate-900 text-[11px] font-bold px-3 py-2 rounded-xl shadow-lg max-w-md text-center">
            {notice}
          </div>
        </div>
      )}
      <ZapparARView
        components={components}
        drawingUrl={drawingUrl}
        projectId={id}
        onClose={() => navigate(`/workspace/${id}`)}
      />
    </>
  );
};

