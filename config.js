// ═══════════════════════════════════════════════════════════════════════════════
// config.js — Adapter Kompatibilitas Sistem Automasi Pekerjaan Administrasi (APA)
// BPS Kabupaten Raja Ampat
// ═══════════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // Sumber kebenaran tunggal (Single Source of Truth) dari supabase-config.js
  const cfg = window.SUPABASE_CONFIG || {
    url: 'https://dxbeernfohpidaaqlnjp.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4YmVlcm5mb2hwaWRhYXFsbmpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzOTgzNDIsImV4cCI6MjEwNjk3NDM0Mn0.ZE23RO8OvsuFWyq5L6FKp4JhMcSDfKVp_rhIos8aFgw'
  };

  const headers = {
    'apikey': cfg.anonKey,
    'Authorization': 'Bearer ' + cfg.anonKey,
    'Content-Type': 'application/json'
  };

  const adminUsers = ['admin', 'rizal.akbar'];

  function userHasRole(session, role) {
    if (!session) return false;
    if (Array.isArray(session.roles) && session.roles.includes(role)) return true;
    if (session.role === role) return true;
    if (role === 'admin' && (adminUsers.includes(session.username) || session.role === 'admin')) return true;
    if (role === 'user') return true;
    return false;
  }

  function getUserRoles(session) {
    if (!session) return ['user'];
    if (Array.isArray(session.roles) && session.roles.length) return session.roles;
    if (session.role) {
      return session.role === 'admin' ? ['admin', 'user'] : [session.role];
    }
    if (adminUsers.includes(session.username)) return ['admin', 'user'];
    return ['user'];
  }

  // Bind ke window agar bisa diakses baik lewat window.X maupun identifier global X
  window.SUPABASE_URL = cfg.url;
  window.SUPABASE_ANON_KEY = cfg.anonKey;
  window.SUPABASE_HEADERS = headers;
  window.ADMIN_USERS = adminUsers;
  window.userHasRole = userHasRole;
  window.getUserRoles = getUserRoles;
})();
