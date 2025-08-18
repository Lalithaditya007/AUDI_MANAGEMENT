// Utility functions for constructing absolute image URLs
// Ensures consistent handling of relative paths stored in DB

export function buildImageUrl(raw) {
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw; // already absolute
  let rel = raw;
  // Normalize backslashes and trim spaces
  rel = rel.trim().replace(/\\/g, '/');
  // If it already starts with /uploads keep, else prepend appropriate path
  if (!rel.startsWith('/')) {
    if (rel.startsWith('uploads')) rel = '/' + rel; else rel = '/uploads/events/' + rel;
  }
  // Collapse duplicate slashes
  rel = rel.replace(/\/\/+/g, '/');
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:5001').replace(/\/$/, '');
  return base + rel;
}

export function buildAuditoriumImage(raw) {
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  let rel = raw.trim().replace(/\\/g, '/');
  if (!rel.startsWith('/')) {
    if (rel.startsWith('uploads')) rel = '/' + rel; else rel = '/uploads/auditorium/' + rel;
  }
  rel = rel.replace(/\/\/+/g, '/');
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:5001').replace(/\/$/, '');
  return base + rel;
}
