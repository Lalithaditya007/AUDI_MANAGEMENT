// Utility functions for constructing absolute image URLs
// Ensures consistent handling of relative paths stored in DB

export function buildImageUrl(raw) {
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw; // already absolute (CDN or full URL)
  let rel = raw.trim().replace(/\\/g, '/');

  // Strip any leading origin accidentally stored
  rel = rel.replace(/^https?:\/\/[^/]+/, '');

  // Ensure a single leading slash for /uploads paths or add default events prefix
  if (!rel.startsWith('/')) rel = rel.startsWith('uploads') ? '/' + rel : `/uploads/events/${rel}`;

  // If someone stored just a filename (no directory) we already prefixed /uploads/events/
  // Accept also cases like events/filename or auditorium/filename
  if (/^\/(events|auditorium)\//.test(rel)) {
    // Prepend /uploads if missing
    rel = '/uploads' + rel;
  }

  // De-duplicate /uploads/uploads/
  rel = rel.replace(/\/uploads\/uploads\//g, '/uploads/');
  rel = rel.replace(/\/\/+/g, '/');

  // Base resolution: prefer explicit env, then server URL, then window origin (runtime), then localhost
  let base = (import.meta.env.VITE_API_URL || import.meta.env.VITE_SERVER_URL || '').replace(/\/$/, '');
  if (!base) {
    try { if (typeof window !== 'undefined' && window.location?.origin) base = window.location.origin; } catch(_) { /* ignore */ }
  }
  if (!base) base = 'http://localhost:5001';

  const finalUrl = base + rel;
  if (import.meta.env.VITE_IMAGE_DEBUG === 'true') {
    // eslint-disable-next-line no-console
    console.debug('[IMG] buildImageUrl raw:', raw, '->', finalUrl);
  }
  return finalUrl;
}

export function buildAuditoriumImage(raw) {
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  let rel = raw.trim().replace(/\\/g, '/');
  rel = rel.replace(/^https?:\/\/[^/]+/, '');
  if (!rel.startsWith('/')) rel = rel.startsWith('uploads') ? '/' + rel : `/uploads/auditorium/${rel}`;
  if (/^\/(events|auditorium)\//.test(rel)) rel = '/uploads' + rel; // normalise missing /uploads
  rel = rel.replace(/\/uploads\/uploads\//g, '/uploads/').replace(/\/\/+/g, '/');
  let base = (import.meta.env.VITE_API_URL || import.meta.env.VITE_SERVER_URL || '').replace(/\/$/, '');
  if (!base) { try { if (typeof window !== 'undefined') base = window.location.origin; } catch(_) {} }
  if (!base) base = 'http://localhost:5001';
  const finalUrl = base + rel;
  if (import.meta.env.VITE_IMAGE_DEBUG === 'true') {
    // eslint-disable-next-line no-console
    console.debug('[IMG] buildAuditoriumImage raw:', raw, '->', finalUrl);
  }
  return finalUrl;
}

// Generic builder for any user-upload (profile photos, etc.) placed under /uploads
// Does NOT force an events or auditorium subdirectory; only ensures one leading /uploads/
export function buildUploadImage(raw) {
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  let rel = raw.trim().replace(/\\/g, '/');
  rel = rel.replace(/^https?:\/\/[^/]+/, '');
  if (!rel.startsWith('/')) rel = rel.startsWith('uploads') ? '/' + rel : `/uploads/${rel}`;
  if (/^\/(events|auditorium)\//.test(rel)) rel = '/uploads' + rel;
  rel = rel.replace(/\/uploads\/uploads\//g, '/uploads/').replace(/\/\/+/g, '/');
  let base = (import.meta.env.VITE_API_URL || import.meta.env.VITE_SERVER_URL || '').replace(/\/$/, '');
  if (!base) { try { if (typeof window !== 'undefined') base = window.location.origin; } catch(_) {} }
  if (!base) base = 'http://localhost:5001';
  const finalUrl = base + rel;
  if (import.meta.env.VITE_IMAGE_DEBUG === 'true') {
    // eslint-disable-next-line no-console
    console.debug('[IMG] buildUploadImage raw:', raw, '->', finalUrl);
  }
  return finalUrl;
}
