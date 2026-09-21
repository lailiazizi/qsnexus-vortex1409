// Cloud persistence for QS Nexus (Supabase Storage + Postgres).
// The browser copy (IndexedDB / localStorage) stays as an offline fallback;
// these helpers make sure the marker and the model also reach the cloud,
// and they report real success / failure instead of assuming it worked.

import { supabase, isSupabaseConfigured, MARKER_BUCKET } from '../supabase';

const TABLE = 'projects';

export interface CloudResult<T = void> {
  ok: boolean;
  error?: string;
  data?: T;
}

export interface CloudProject {
  components: any[];
  calibration?: any;
  markerPath: string | null;
  markerName: string | null;
  updatedAt?: string;
}

const NOT_CONFIGURED: CloudResult<never> = {
  ok: false,
  error: 'Cloud storage is not configured (missing Supabase URL / anon key).'
};

const msg = (e: any): string => e?.message || e?.error_description || String(e);

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
  const binary = atob(base64 || '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function extensionFor(mime: string): string {
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  return 'png';
}

/** Upload the marker image to Storage, then record its path on the project row. */
export async function uploadMarkerToCloud(
  projectId: string,
  dataUrl: string,
  fileName: string
): Promise<CloudResult<{ path: string }>> {
  if (!isSupabaseConfigured || !supabase) return NOT_CONFIGURED;
  try {
    const blob = dataUrlToBlob(dataUrl);
    // Unique path per upload: no overwrite permission needed, no stale browser cache.
    const path = `${projectId}/marker-${Date.now()}.${extensionFor(blob.type)}`;

    const { error: uploadError } = await supabase.storage
      .from(MARKER_BUCKET)
      .upload(path, blob, { contentType: blob.type, upsert: false, cacheControl: '3600' });
    if (uploadError) return { ok: false, error: `File upload failed: ${uploadError.message}` };

    const { error: dbError } = await supabase.from(TABLE).upsert(
      {
        project_id: projectId,
        marker_path: path,
        marker_name: fileName,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'project_id' }
    );
    if (dbError) return { ok: false, error: `File uploaded, but saving the record failed: ${dbError.message}` };

    return { ok: true, data: { path } };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

/** Save the model (components + calibration) for a project. */
export async function saveProjectToCloud(
  projectId: string,
  components: any[],
  calibration?: any
): Promise<CloudResult> {
  if (!isSupabaseConfigured || !supabase) return NOT_CONFIGURED;
  try {
    const { error } = await supabase.from(TABLE).upsert(
      {
        project_id: projectId,
        components,
        calibration: calibration ?? null,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'project_id' }
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

/** Load a project row. `data: null` means the query worked but nothing is saved yet. */
export async function loadProjectFromCloud(projectId: string): Promise<CloudResult<CloudProject | null>> {
  if (!isSupabaseConfigured || !supabase) return NOT_CONFIGURED;
  try {
    const { data, error } = await supabase.from(TABLE).select('*').eq('project_id', projectId).maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: true, data: null };
    return {
      ok: true,
      data: {
        components: Array.isArray(data.components) ? data.components : [],
        calibration: data.calibration ?? undefined,
        markerPath: data.marker_path ?? null,
        markerName: data.marker_name ?? null,
        updatedAt: data.updated_at
      }
    };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

/** Forget the marker on the project row (the old file is left in Storage). */
export async function clearMarkerInCloud(projectId: string): Promise<CloudResult> {
  if (!isSupabaseConfigured || !supabase) return NOT_CONFIGURED;
  try {
    const { error } = await supabase
      .from(TABLE)
      .update({ marker_path: null, marker_name: null, updated_at: new Date().toISOString() })
      .eq('project_id', projectId);
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

export function getMarkerPublicUrl(path: string): string | null {
  if (!supabase) return null;
  return supabase.storage.from(MARKER_BUCKET).getPublicUrl(path).data.publicUrl || null;
}

/**
 * Download a marker and return it as a data URL, so the rest of the app can treat it exactly
 * like a locally uploaded image. Falls back to the public URL if the download is blocked.
 */
export async function fetchMarkerAsDataUrl(path: string): Promise<string | null> {
  const publicUrl = getMarkerPublicUrl(path);
  if (!publicUrl) return null;
  try {
    const res = await fetch(publicUrl);
    if (!res.ok) return publicUrl;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return publicUrl;
  }
}
