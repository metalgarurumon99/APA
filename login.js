// login.js — Diekstrak dari login.html (cacheable)
// =====================================================================
        // CLIENT SUPABASE GLOBAL
        // Konfigurasi URL & Anon Key diambil dari file terpusat 'supabase-config.js'.
        // =====================================================================
        function getSupabase() {
            return window.supabaseClient || (window.APA_AUTH && window.APA_AUTH.getClient());
        }

        // State Penyimpanan Sesi Sementara (password lama hanya di memori sementara, tidak pernah ke localStorage)
        let currentAuthSession = null;
        let pendingOldPassword = null;

        // =====================================================================
        // UTILITAS TAMPILAN FORM & ERROR HANDLING
        // =====================================================================
        function togglePasswordInput(inputId, iconId) {
            const input = document.getElementById(inputId);
            const icon = document.getElementById(iconId);
            const isPwd = input.type === 'password';

            input.type = isPwd ? 'text' : 'password';

            if (isPwd) {
                icon.innerHTML = `
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                `;
            } else {
                icon.innerHTML = `
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                `;
            }
        }

        function showFieldError(inputId, errorId, message) {
            const inputEl = document.getElementById(inputId);
            const errorEl = document.getElementById(errorId);
            
            inputEl.classList.add('is-invalid');
            errorEl.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
            `;
            const msgSpan = document.createElement('span');
            msgSpan.textContent = String(message ?? '');
            errorEl.appendChild(msgSpan);
            errorEl.classList.add('show');
        }

        function clearFieldError(inputId, errorId) {
            const inputEl = document.getElementById(inputId);
            const errorEl = document.getElementById(errorId);
            
            inputEl.classList.remove('is-invalid');
            errorEl.classList.remove('show');
            errorEl.innerHTML = '';
        }

        function showGlobalError(bannerId, textId, message) {
            const banner = document.getElementById(bannerId);
            const text = document.getElementById(textId);
            text.textContent = message;
            banner.classList.remove('show');
            void banner.offsetWidth; // Trigger reflow untuk animasi shake
            banner.classList.add('show');
        }

        function hideGlobalError(bannerId) {
            const banner = document.getElementById(bannerId);
            banner.classList.remove('show');
        }

        // Hapus error field secara instan saat input diketik
        document.getElementById('usernameInput').addEventListener('input', function() {
            clearFieldError('usernameInput', 'usernameError');
            hideGlobalError('loginErrorBanner');
        });

        document.getElementById('passwordInput').addEventListener('input', function() {
            clearFieldError('passwordInput', 'passwordError');
            hideGlobalError('loginErrorBanner');
        });

        document.getElementById('newPasswordInput').addEventListener('input', function() {
            clearFieldError('newPasswordInput', 'newPasswordError');
            hideGlobalError('cpErrorBanner');
            validateNewPasswordRules();
        });

        document.getElementById('confirmPasswordInput').addEventListener('input', function() {
            clearFieldError('confirmPasswordInput', 'confirmPasswordError');
            hideGlobalError('cpErrorBanner');
        });

        // Validasi real-time checklist aturan password baru
        function validateNewPasswordRules() {
            const val = document.getElementById('newPasswordInput').value;
            const hasLength = val.length >= 6;
            const hasLetter = /[A-Za-z]/.test(val);
            const hasNumber = /[0-9]/.test(val);
            const hasCombo = hasLetter && hasNumber;

            const ruleLength = document.getElementById('ruleLength');
            const ruleCombo = document.getElementById('ruleCombo');

            if (hasLength) {
                ruleLength.classList.add('valid');
                ruleLength.querySelector('.rule-icon').textContent = '✓';
            } else {
                ruleLength.classList.remove('valid');
                ruleLength.querySelector('.rule-icon').textContent = '○';
            }

            if (hasCombo) {
                ruleCombo.classList.add('valid');
                ruleCombo.querySelector('.rule-icon').textContent = '✓';
            } else {
                ruleCombo.classList.remove('valid');
                ruleCombo.querySelector('.rule-icon').textContent = '○';
            }

            return hasLength && hasCombo;
        }

        // =====================================================================
        // ALUR LOGIKA AUTENTIKASI LOGIN
        // =====================================================================
        async function handleLoginSubmit(event) {
            event.preventDefault();
            hideGlobalError('loginErrorBanner');

            const usernameInput = document.getElementById('usernameInput');
            const passwordInput = document.getElementById('passwordInput');
            const username = usernameInput.value.trim();
            const password = passwordInput.value;

            let hasEmpty = false;
            if (!username) {
                showFieldError('usernameInput', 'usernameError', 'Username wajib diisi');
                hasEmpty = true;
            }
            if (!password) {
                showFieldError('passwordInput', 'passwordError', 'Password wajib diisi');
                hasEmpty = true;
            }

            if (hasEmpty) {
                if (!username) usernameInput.focus();
                else passwordInput.focus();
                return;
            }

            // State Loading Tombol
            const submitBtn = document.getElementById('loginSubmitBtn');
            const btnText = document.getElementById('loginBtnText');
            const btnArrowIcon = document.getElementById('loginBtnArrowIcon');
            const btnSpinner = document.getElementById('loginBtnSpinner');

            submitBtn.disabled = true;
            btnText.textContent = 'Memverifikasi...';
            btnArrowIcon.style.display = 'none';
            btnSpinner.style.display = 'block';

            try {
                let authResult = null;

                // Autentikasi resmi melalui Supabase Auth (auth.users + JWT)
                const sb = getSupabase();
                if (sb) {
                    const internalEmail = window.APA_AUTH
                        ? window.APA_AUTH.usernameToEmail(username)
                        : `${username.toLowerCase()}@apa.bps9108.local`;

                    const { data: signInData, error: signInError } = await sb.auth.signInWithPassword({
                        email: internalEmail,
                        password: password
                    });

                    if (signInError || !signInData || !signInData.session) {
                        authResult = {
                            success: false,
                            message: "Username atau password salah"
                        };
                    } else {
                        if (window.APA_AUTH && window.APA_AUTH.syncAuthHeaders) {
                            window.APA_AUTH.syncAuthHeaders(signInData.session.access_token);
                        }
                        const { data: profileRes, error: profileErr } = await sb.rpc('get_my_profile_session');
                        if (profileErr || !profileRes || !profileRes.success) {
                            await sb.auth.signOut().catch(() => {});
                            authResult = {
                                success: false,
                                message: (profileRes && profileRes.message) || (profileErr && profileErr.message) || "Gagal memuat profil akun"
                            };
                        } else {
                            authResult = profileRes;
                        }
                    }
                } else {
                    authResult = {
                        success: false,
                        message: "Layanan autentikasi database tidak tersedia. Periksa koneksi internet Anda dan coba lagi."
                    };
                }

                // Reset State Tombol
                submitBtn.disabled = false;
                btnSpinner.style.display = 'none';
                btnArrowIcon.style.display = 'inline-block';
                btnText.textContent = 'Login';

                if (!authResult || !authResult.success) {
                    // Tampilkan pesan error saat username atau password salah
                    showGlobalError('loginErrorBanner', 'loginErrorBannerText', authResult?.message || 'Username atau password salah');
                    usernameInput.classList.add('is-invalid');
                    passwordInput.classList.add('is-invalid');
                    return;
                }

                // Simpan Sesi Pengguna (jangan pernah simpan password plaintext ke storage)
                const rememberMe = Boolean(document.getElementById('rememberMe')?.checked);
                currentAuthSession = { ...authResult.user };
                pendingOldPassword = authResult.user.must_change_password ? password : null;

                if (window.APA_AUTH) {
                    window.APA_AUTH.setSession(currentAuthSession, rememberMe);
                }

                // Jalankan Motion Berhasil Login yang Elegan
                playLoginSuccessMotion(currentAuthSession);

            } catch (err) {
                console.error("Kesalahan proses login:", err);
                submitBtn.disabled = false;
                btnSpinner.style.display = 'none';
                btnArrowIcon.style.display = 'inline-block';
                btnText.textContent = 'Login';
                showGlobalError('loginErrorBanner', 'loginErrorBannerText', 'Terjadi gangguan koneksi. Silakan periksa jaringan.');
            }
        }

        // =====================================================================
        // MOTION BERHASIL LOGIN YANG ELEGAN
        // =====================================================================
        function playLoginSuccessMotion(user) {
            const overlay = document.getElementById('successMotionOverlay');
            const title = document.getElementById('successTitleText');
            const subtitle = document.getElementById('successSubtitleText');
            const card = document.getElementById('mainFloatingCard');

            // Beri efek pendar zamrud pada kartu
            card.style.borderColor = '#10b981';
            card.style.boxShadow = '0 35px 80px rgba(6, 78, 59, 0.45), 0 0 50px rgba(52, 211, 153, 0.5), inset 0 1px 3px #ffffff';

            title.textContent = `Selamat Datang, ${user.full_name.split(' ')[0]}`;

            if (user.must_change_password) {
                subtitle.textContent = 'Mengalihkan ke pengaturan keamanan akun...';
            } else {
                subtitle.textContent = 'Menyiapkan profil pegawai Anda...';
            }

            overlay.classList.add('show');

            // Durasi motion 1.4 detik sebelum transisi kartu
            setTimeout(() => {
                overlay.classList.remove('show');

                if (user.must_change_password) {
                    // Transisi kartu login ke tampilan kartu Ganti Password Baru
                    transitionToChangePasswordView(user);
                } else {
                    // Login Sukses Pengguna Reguler -> Alihkan langsung ke Halaman Profil
                    overlay.classList.add('show');
                    subtitle.textContent = 'Membuka Halaman Profil...';
                    setTimeout(() => {
                        window.location.href = 'profile.html';
                    }, 600);
                }
            }, 1400);
        }

        // Transisi halus ke form ganti password
        function transitionToChangePasswordView(user) {
            const loginView = document.getElementById('loginView');
            const cpView = document.getElementById('changePasswordView');
            const userFullNameEl = document.getElementById('cpUserFullName');
            const card = document.getElementById('mainFloatingCard');

            userFullNameEl.textContent = user.full_name;

            // Kembalikan border putih glassmorphism
            card.style.borderColor = 'rgba(255, 255, 255, 0.95)';
            card.style.boxShadow = '0 30px 65px rgba(2, 44, 34, 0.28), 0 0 40px rgba(45, 212, 191, 0.28), inset 0 1px 2px rgba(255, 255, 255, 0.95)';

            loginView.classList.remove('active');
            loginView.classList.add('hidden');

            cpView.classList.remove('hidden');
            cpView.classList.add('active');

            // Fokus ke field password baru
            setTimeout(() => {
                document.getElementById('newPasswordInput').focus();
            }, 300);
        }

        // =====================================================================
        // ALUR LOGIKA GANTI PASSWORD PERTAMA KALI
        // =====================================================================
        async function handleChangePasswordSubmit(event) {
            event.preventDefault();
            hideGlobalError('cpErrorBanner');

            const newPwdInput = document.getElementById('newPasswordInput');
            const confirmPwdInput = document.getElementById('confirmPasswordInput');
            const newPwd = newPwdInput.value;
            const confirmPwd = confirmPwdInput.value;

            let hasError = false;

            // Validasi Password Baru
            if (!newPwd) {
                showFieldError('newPasswordInput', 'newPasswordError', 'Password baru wajib diisi');
                hasError = true;
            } else if (!validateNewPasswordRules()) {
                showFieldError('newPasswordInput', 'newPasswordError', 'Password harus minimal 6 karakter kombinasi huruf & angka');
                hasError = true;
            }

            // Validasi Konfirmasi Password
            if (!confirmPwd) {
                showFieldError('confirmPasswordInput', 'confirmPasswordError', 'Konfirmasi password wajib diisi');
                hasError = true;
            } else if (newPwd && newPwd !== confirmPwd) {
                showFieldError('confirmPasswordInput', 'confirmPasswordError', 'Konfirmasi password tidak cocok');
                hasError = true;
            }

            if (hasError) return;

            // State Loading
            const cpBtn = document.getElementById('cpSubmitBtn');
            const cpBtnText = document.getElementById('cpBtnText');
            const cpBtnArrowIcon = document.getElementById('cpBtnArrowIcon');
            const cpBtnSpinner = document.getElementById('cpBtnSpinner');

            cpBtn.disabled = true;
            cpBtnText.textContent = 'Menyimpan...';
            cpBtnArrowIcon.style.display = 'none';
            cpBtnSpinner.style.display = 'block';

            try {
                let updateResult = null;

                const sb = getSupabase();
                if (sb) {
                    const { error: pwdErr } = await sb.auth.updateUser({ password: newPwd });
                    if (pwdErr) {
                        console.error("Supabase auth.updateUser gagal:", pwdErr.message);
                        updateResult = {
                            success: false,
                            message: "Gagal mengubah password: " + pwdErr.message
                        };
                    } else {
                        const { data: markData, error: markErr } = await sb.rpc('mark_password_changed');
                        if (markErr) {
                            console.warn("mark_password_changed warning:", markErr.message);
                        }
                        updateResult = markData || { success: true, message: "Password berhasil diperbarui" };
                    }
                } else {
                    updateResult = {
                        success: false,
                        message: "Layanan database tidak tersedia. Periksa koneksi internet Anda dan coba lagi."
                    };
                }

                cpBtn.disabled = false;
                cpBtnSpinner.style.display = 'none';
                cpBtnArrowIcon.style.display = 'inline-block';
                cpBtnText.textContent = 'Simpan Password & Masuk';

                if (!updateResult || !updateResult.success) {
                    showGlobalError('cpErrorBanner', 'cpErrorBannerText', updateResult?.message || 'Gagal mengubah password');
                    return;
                }

                // Sukses Update Password — hapus password lama dari memori segera
                pendingOldPassword = null;
                currentAuthSession.must_change_password = false;
                const rememberMe = Boolean(document.getElementById('rememberMe')?.checked);
                if (window.APA_AUTH) {
                    window.APA_AUTH.setSession(currentAuthSession, rememberMe);
                }

                const overlay = document.getElementById('successMotionOverlay');
                const title = document.getElementById('successTitleText');
                const subtitle = document.getElementById('successSubtitleText');

                title.textContent = 'Password Berhasil Dibuat!';
                subtitle.textContent = 'Akun Anda telah diamankan. Mengalihkan ke Halaman Profil...';
                overlay.classList.add('show');

                setTimeout(() => {
                    window.location.href = 'profile.html';
                }, 1400);

            } catch (err) {
                console.error("Gagal update password:", err);
                cpBtn.disabled = false;
                cpBtnSpinner.style.display = 'none';
                cpBtnArrowIcon.style.display = 'inline-block';
                cpBtnText.textContent = 'Simpan Password & Masuk';
                showGlobalError('cpErrorBanner', 'cpErrorBannerText', 'Gagal memproses perubahan password. Periksa koneksi.');
            }
        }

        function handleForgotPasswordClick() {
            const username = document.getElementById('usernameInput').value.trim();
            if (username) {
                alert(`Silakan hubungi administrator sistem untuk mereset akun "${username}".`);
            } else {
                showFieldError('usernameInput', 'usernameError', 'Ketikkan username Anda terlebih dahulu');
                document.getElementById('usernameInput').focus();
            }
        }
