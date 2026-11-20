/**
 * ==============================================================================
 * KONFIGURASI GLOBAL SUPABASE - SISTEM AUTOMASI PEKERJAAN ADMINISTRASI (APA)
 * ==============================================================================
 * File ini bertindak sebagai Single Source of Truth (konfigurasi terpusat).
 * Setiap halaman aplikasi yang membutuhkan koneksi ke database cukup menyertakan:
 *   1. CDN Supabase JS: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *   2. File ini:        <script src="supabase-config.js"></script>
 *
 * Objek Supabase otomatis tersedia secara global melalui:
 *   - `window.supabaseClient`
 *   - `window.SUPABASE_CONFIG`
 *   - `window.APA_AUTH`
 */

(function () {
    const SUPABASE_CONFIG = {
        url: "https://dxbeernfohpidaaqlnjp.supabase.co",
        anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4YmVlcm5mb2hwaWRhYXFsbmpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzOTgzNDIsImV4cCI6MjEwNjk3NDM0Mn0.ZE23RO8OvsuFWyq5L6FKp4JhMcSDfKVp_rhIos8aFgw"
    };

    window.SUPABASE_CONFIG = SUPABASE_CONFIG;
    window.SUPABASE_URL = SUPABASE_CONFIG.url;
    window.SUPABASE_ANON_KEY = SUPABASE_CONFIG.anonKey;
    window.SUPABASE_HEADERS = window.SUPABASE_HEADERS || {
        'apikey': SUPABASE_CONFIG.anonKey,
        'Authorization': 'Bearer ' + SUPABASE_CONFIG.anonKey,
        'Content-Type': 'application/json'
    };
    window.supabaseClient = null;

    function syncAuthHeaders(accessToken) {
        window.SUPABASE_HEADERS.Authorization = 'Bearer ' + (accessToken || SUPABASE_CONFIG.anonKey);
    }

    let authReadyPromise = Promise.resolve(null);

    if (window.supabase) {
        try {
            window.supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
            authReadyPromise = window.supabaseClient.auth.getSession()
                .then(({ data }) => {
                    const token = data && data.session ? data.session.access_token : null;
                    syncAuthHeaders(token);
                    return data ? data.session : null;
                })
                .catch(() => null);

            window.supabaseClient.auth.onAuthStateChange((_event, session) => {
                syncAuthHeaders(session ? session.access_token : null);
            });
            console.log("Supabase Global Client berhasil diinisialisasi.");
        } catch (err) {
            console.error("Gagal menginisialisasi Supabase Global Client:", err);
        }
    } else {
        console.warn("Library Supabase JS belum dimuat. Pastikan tag script CDN @supabase/supabase-js dipanggil sebelum supabase-config.js.");
    }

    // Utility Helper Autentikasi & Sesi Global
    window.APA_AUTH = {
        EMAIL_DOMAIN: 'apa.bps9108.local',
        ready: authReadyPromise,
        getClient: () => window.supabaseClient,
        syncAuthHeaders,

        usernameToEmail: (username) => {
            const clean = String(username || '').trim().toLowerCase();
            if (!clean) return '';
            return clean.includes('@') ? clean : `${clean}@apa.bps9108.local`;
        },

        getAccessToken: async () => {
            if (!window.supabaseClient) return null;
            try {
                const { data } = await window.supabaseClient.auth.getSession();
                const token = data && data.session ? data.session.access_token : null;
                syncAuthHeaders(token);
                return token;
            } catch {
                return null;
            }
        },
        
        // Ambil data sesi pengguna saat ini
        getCurrentUser: () => {
            try {
                return JSON.parse(localStorage.getItem('apa_user') || sessionStorage.getItem('apa_user') || 'null');
            } catch {
                return null;
            }
        },
        
        // Simpan sesi login (bersihkan storage lain agar tidak saling menimpa, dan jangan pernah simpan password plaintext)
        setSession: (userData, rememberMe = false) => {
            const safeData = userData && typeof userData === 'object' ? { ...userData } : userData;
            if (safeData && typeof safeData === 'object') {
                delete safeData.password;
                delete safeData.enteredOldPassword;
                delete safeData.password_hash;
            }
            const targetStorage = rememberMe ? localStorage : sessionStorage;
            const otherStorage = rememberMe ? sessionStorage : localStorage;
            otherStorage.removeItem('apa_user');
            targetStorage.setItem('apa_user', JSON.stringify(safeData));
        },
        
        // Hapus sesi / logout (termasuk signOut Supabase Auth)
        logout: async (redirectUrl = 'login.html') => {
            try {
                if (window.supabaseClient) {
                    await window.supabaseClient.auth.signOut();
                }
            } catch (_) {}
            syncAuthHeaders(null);
            localStorage.removeItem('apa_user');
            localStorage.removeItem('apa_users_store');
            sessionStorage.removeItem('apa_user');
            if (redirectUrl) {
                window.location.href = redirectUrl;
            }
        }
    };
})();
