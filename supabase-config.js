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
    window.supabaseClient = null;

    if (window.supabase) {
        try {
            window.supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
            console.log("Supabase Global Client berhasil diinisialisasi.");
        } catch (err) {
            console.error("Gagal menginisialisasi Supabase Global Client:", err);
        }
    } else {
        console.warn("Library Supabase JS belum dimuat. Pastikan tag script CDN @supabase/supabase-js dipanggil sebelum supabase-config.js.");
    }

    // Utility Helper Autentikasi & Sesi Global
    window.APA_AUTH = {
        getClient: () => window.supabaseClient,
        
        // Ambil data sesi pengguna saat ini
        getCurrentUser: () => {
            try {
                return JSON.parse(localStorage.getItem('apa_user') || sessionStorage.getItem('apa_user') || 'null');
            } catch {
                return null;
            }
        },
        
        // Simpan sesi login
        setSession: (userData, rememberMe = false) => {
            const storage = rememberMe ? localStorage : sessionStorage;
            storage.setItem('apa_user', JSON.stringify(userData));
        },
        
        // Hapus sesi / logout
        logout: (redirectUrl = 'login.html') => {
            localStorage.removeItem('apa_user');
            sessionStorage.removeItem('apa_user');
            if (redirectUrl) {
                window.location.href = redirectUrl;
            }
        }
    };
})();
