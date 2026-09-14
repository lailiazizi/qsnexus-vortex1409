// Fallback target uploader & storage handler for AR targets

export async function uploadTarget(projectId: string, buffer: ArrayBuffer): Promise<string | null> {
  try {
    // If a server endpoint exists:
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const reader = new FileReader();
    return new Promise((resolve) => {
      reader.onloadend = () => {
        const base64data = reader.result as string;
        try {
          localStorage.setItem(`iseeqs_target_data_${projectId}`, base64data);
        } catch (e) {
          console.warn('Local storage quota limit reached for raw target', e);
        }
        const syntheticUrl = `data:application/octet-stream;base64,${base64data.split(',')[1] || ''}`;
        resolve(syntheticUrl);
      };
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error('Error handling target upload:', err);
    return null;
  }
}
