// ═══════════════════════════════════════════════
// config.js — Sistem Automasi Pekerjaan Administrasi (APA)
// BPS Kabupaten Raja Ampat (9201)
// ═══════════════════════════════════════════════

const SUPABASE_URL = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url) 
  || 'https://dxbeernfohpidaaqlnjp.supabase.co';

const SUPABASE_ANON_KEY = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.anonKey) 
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4YmVlcm5mb2hwaWRhYXFsbmpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzOTgzNDIsImV4cCI6MjEwNjk3NDM0Mn0.ZE23RO8OvsuFWyq5L6FKp4JhMcSDfKVp_rhIos8aFgw';

const SUPABASE_HEADERS = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
  'Content-Type': 'application/json'
};

const ADMIN_USERS = ['admin'];

function userHasRole(session, role) {
  if (!session) return false;
  if (Array.isArray(session.roles) && session.roles.includes(role)) return true;
  if (session.role === role) return true;
  if (role === 'admin' && ADMIN_USERS.includes(session.username)) return true;
  if (role === 'user') return true;
  return false;
}

function getUserRoles(session) {
  if (!session) return ['user'];
  if (Array.isArray(session.roles) && session.roles.length) return session.roles;
  if (session.role) {
    return session.role === 'admin' ? ['admin', 'user'] : [session.role];
  }
  if (ADMIN_USERS.includes(session.username)) return ['admin', 'user'];
  return ['user'];
}

window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
window.SUPABASE_HEADERS = SUPABASE_HEADERS;
window.userHasRole = userHasRole;
window.getUserRoles = getUserRoles;
