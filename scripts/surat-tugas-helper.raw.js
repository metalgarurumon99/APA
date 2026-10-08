/**
 * ==============================================================================
 * SURAT TUGAS HELPER JS - SISTEM AUTOMASI PEKERJAAN ADMINISTRASI (APA)
 * BPS KABUPATEN RAJA AMPAT
 * ==============================================================================
 */

(function () {
    const TIPE_SURAT_CONFIG = {
        surat_tugas: {
            label: 'Surat Tugas',
            flags: { has_spd: false, has_kendaraan: false, has_menginap: false, has_lampiran: false, has_visum: false },
            template: 'template-surat-tugas-spd-visum-kendaraan-menginap.docx'
        },
        surat_tugas_kendaraan: {
            label: 'Surat Tugas + Kendaraan',
            flags: { has_spd: false, has_kendaraan: true, has_menginap: false, has_lampiran: false, has_visum: false },
            template: 'template-surat-tugas-spd-visum-kendaraan-menginap.docx'
        },
        surat_tugas_visum_kendaraan: {
            label: 'Surat Tugas + Visum + Kendaraan',
            flags: { has_spd: false, has_kendaraan: true, has_menginap: false, has_lampiran: false, has_visum: true },
            template: 'template-surat-tugas-spd-visum-kendaraan-menginap.docx'
        },
        surat_tugas_lampiran: {
            label: 'Surat Tugas + Lampiran',
            flags: { has_spd: false, has_kendaraan: false, has_menginap: false, has_lampiran: true, has_visum: false },
            template: 'template-surat-tugas-lampiran.docx'
        },
        surat_tugas_spd_kendaraan: {
            label: 'Surat Tugas + SPD + Kendaraan',
            flags: { has_spd: true, has_kendaraan: true, has_menginap: false, has_lampiran: false, has_visum: false },
            template: 'template-surat-tugas-spd-visum-kendaraan-menginap.docx'
        },
        surat_tugas_spd_kendaraan_menginap: {
            label: 'Surat Tugas + SPD + Kendaraan + Menginap',
            flags: { has_spd: true, has_kendaraan: true, has_menginap: true, has_lampiran: false, has_visum: false },
            template: 'template-surat-tugas-spd-visum-kendaraan-menginap.docx'
        },
        surat_tugas_spd_visum_kendaraan_menginap: {
            label: 'Surat Tugas + SPD + Visum + Kendaraan + Menginap',
            flags: { has_spd: true, has_kendaraan: true, has_menginap: true, has_lampiran: false, has_visum: true },
            template: 'template-surat-tugas-spd-visum-kendaraan-menginap.docx'
        },
        surat_tugas_lampiran_spd_kendaraan: {
            label: 'Surat Tugas + Lampiran + SPD + Kendaraan',
            flags: { has_spd: true, has_kendaraan: true, has_menginap: false, has_lampiran: true, has_visum: false },
            template: 'template-surat-tugas-lampiran-spd-visum-kendaraan-menginap.docx'
        },
        surat_tugas_lampiran_spd_kendaraan_menginap: {
            label: 'Surat Tugas + Lampiran + SPD + Kendaraan + Menginap',
            flags: { has_spd: true, has_kendaraan: true, has_menginap: true, has_lampiran: true, has_visum: false },
            template: 'template-surat-tugas-lampiran-spd-visum-kendaraan-menginap.docx'
        },
        surat_tugas_lampiran_spd_visum_kendaraan_menginap: {
            label: 'Surat Tugas + Lampiran + SPD + Visum + Kendaraan + Menginap',
            flags: { has_spd: true, has_kendaraan: true, has_menginap: true, has_lampiran: true, has_visum: true },
            template: 'template-surat-tugas-lampiran-spd-visum-kendaraan-menginap.docx'
        }
    };

    const TEMPLATES_BASE64 = /*__TEMPLATES_BASE64__*/;

    const DEFAULT_KAMUS_POK = [
        { id: 1, kode_mak: '2901.BMA.006.051.A.524111', deskripsi: 'Belanja Perjalanan Dinas Biasa Subbagian Umum BPS Kabupaten Raja Ampat', tahun: 2026 },
        { id: 2, kode_mak: '2901.EBA.994.051.A.524111', deskripsi: 'Perjalanan Dinas Survei Angkatan Kerja Nasional (SAKERNAS) Semesteran', tahun: 2026 },
        { id: 3, kode_mak: '2901.EBA.994.051.B.524113', deskripsi: 'Perjalanan Dinas Survei Sosial Ekonomi Nasional (SUSENAS) Kor dan Konsumsi', tahun: 2026 },
        { id: 4, kode_mak: '2901.QDB.001.051.A.524111', deskripsi: 'Perjalanan Dinas Statistik Pertanian, Tanaman Pangan, Hortikultura, dan Perkebunan', tahun: 2026 },
        { id: 5, kode_mak: '2901.QDB.002.051.A.524111', deskripsi: 'Perjalanan Dinas Survei Perikanan dan Kelautan Wilayah Kepulauan Raja Ampat', tahun: 2026 },
        { id: 6, kode_mak: '2901.QDC.001.051.A.524111', deskripsi: 'Perjalanan Dinas Statistik Distribusi, Hotel, Restoran, dan Wisata Bahari', tahun: 2026 },
        { id: 7, kode_mak: '2901.QDC.002.051.A.524111', deskripsi: 'Perjalanan Dinas Survei Harga Produsen dan Konsumen Pedesaan', tahun: 2026 },
        { id: 8, kode_mak: '2901.QDD.003.051.A.524111', deskripsi: 'Perjalanan Dinas Neraca Wilayah, PDRB, dan Analisis Statistik Lintas Sektor', tahun: 2026 },
        { id: 9, kode_mak: '2901.QDE.004.051.A.524111', deskripsi: 'Perjalanan Dinas Integrasi Pengolahan, Diseminasi, dan Rekomendasi Statistik', tahun: 2026 },
        { id: 10, kode_mak: '2901.WA.001.051.A.524111', deskripsi: 'Perjalanan Dinas Pembinaan Desa Cinta Statistik (Desa Cantik) Raja Ampat', tahun: 2026 }
    ];

    const DEFAULT_MITRA = [
        { id: 1, mitra_nip: 'MITRA-2026-001', nama: 'Yohanes Mambrasar', jk: 'Laki-laki', alamat: 'Waisai Kota, Distrik Kota Waisai', jabatan: 'Mitra Statistik', posisi: 'Pencacah Lapangan' },
        { id: 2, mitra_nip: 'MITRA-2026-002', nama: 'Maria Dimara', jk: 'Perempuan', alamat: 'Kelurahan Sapordanko, Distrik Kota Waisai', jabatan: 'Mitra Statistik', posisi: 'Pencacah Lapangan' },
        { id: 3, mitra_nip: 'MITRA-2026-003', nama: 'Simon Mayor', jk: 'Laki-laki', alamat: 'Kampung Saonek, Distrik Waigeo Selatan', jabatan: 'Mitra Statistik', posisi: 'Pencacah Lapangan' },
        { id: 4, mitra_nip: 'MITRA-2026-004', nama: 'Naomi Fakdawer', jk: 'Perempuan', alamat: 'Kampung Warsambin, Distrik Teluk Mayalibit', jabatan: 'Mitra Statistik', posisi: 'Pemeriksa Lapangan' },
        { id: 5, mitra_nip: 'MITRA-2026-005', nama: 'Paulus Gaman', jk: 'Laki-laki', alamat: 'Kampung Yenbeser, Distrik Waigeo Selatan', jabatan: 'Mitra Statistik', posisi: 'Pencacah Lapangan' },
        { id: 6, mitra_nip: 'MITRA-2026-006', nama: 'Beatrix Burdam', jk: 'Perempuan', alamat: 'Waisai Kota, Distrik Kota Waisai', jabatan: 'Mitra Statistik', posisi: 'Pencacah Lapangan' },
        { id: 7, mitra_nip: 'MITRA-2026-007', nama: 'Markus Sauyai', jk: 'Laki-laki', alamat: 'Kampung Friwen, Distrik Waigeo Selatan', jabatan: 'Mitra Statistik', posisi: 'Pencacah Lapangan' },
        { id: 8, mitra_nip: 'MITRA-2026-008', nama: 'Sarah Arfan', jk: 'Perempuan', alamat: 'Kampung Lopintol, Distrik Teluk Mayalibit', jabatan: 'Mitra Statistik', posisi: 'Pencacah Lapangan' },
        { id: 9, mitra_nip: 'MITRA-2026-009', nama: 'Dominggus Rumbewas', jk: 'Laki-laki', alamat: 'Kampung Yembekaki, Distrik Waigeo Timur', jabatan: 'Mitra Statistik', posisi: 'Pencacah Lapangan' },
        { id: 10, mitra_nip: 'MITRA-2026-010', nama: 'Fransina Wader', jk: 'Perempuan', alamat: 'Waisai Kota, Distrik Kota Waisai', jabatan: 'Mitra Statistik', posisi: 'Pemeriksa Lapangan' }
    ];

    const INDO_MONTHS = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const SuratTugasHelper = {
        TIPE_SURAT_CONFIG,
        state: {
            pegawaiList: [],
            mitraList: [],
            riwayatJabatan: [],
            riwayatPangkat: [],
            riwayatGelar: [],
            kamusPok: [],
            suratTugasList: [],
            isSupabaseConnected: false
        },

        async initData() {
            const client = (window.APA_AUTH && typeof window.APA_AUTH.getClient === 'function') 
                ? window.APA_AUTH.getClient() 
                : window.supabaseClient;

            let loadedFromCloud = false;

            if (client) {
                try {
                    // Ambil data_pegawai & users
                    const { data: dp, error: errDp } = await client
                        .from('data_pegawai')
                        .select('*, users(full_name)');
                    
                    if (!errDp && dp && dp.length > 0) {
                        this.state.pegawaiList = dp.map(p => ({
                            pegawai_nip: p.pegawai_nip,
                            nama: (p.users && p.users.full_name) || p.username,
                            status_kepegawaian: p.status_kepegawaian || 'aktif',
                            tanggal_pensiun: p.tanggal_pensiun,
                            is_mitra: false
                        }));
                    }

                    // Ambil riwayat
                    const [resJ, resP, resG] = await Promise.all([
                        client.from('riwayat_jabatan').select('*').order('id', { ascending: false }),
                        client.from('riwayat_pangkat_golongan').select('*').order('id', { ascending: false }),
                        client.from('riwayat_gelar').select('*').order('id', { ascending: false })
                    ]);

                    if (resJ.data) this.state.riwayatJabatan = resJ.data;
                    if (resP.data) this.state.riwayatPangkat = resP.data;
                    if (resG.data) this.state.riwayatGelar = resG.data;

                    // Ambil kamus_pok
                    const { data: pokData, error: errPok } = await client.from('kamus_pok').select('*').order('id', { ascending: true });
                    if (!errPok && pokData && pokData.length > 0) {
                        this.state.kamusPok = pokData;
                    } else {
                        this.state.kamusPok = DEFAULT_KAMUS_POK;
                    }

                    // Ambil mitra
                    const { data: mData, error: errMitra } = await client.from('mitra').select('*').order('id', { ascending: true });
                    if (!errMitra && mData && mData.length > 0) {
                        this.state.mitraList = mData;
                    } else {
                        this.state.mitraList = DEFAULT_MITRA;
                    }

                    // Ambil surat_tugas
                    const { data: stData, error: errSt } = await client.from('surat_tugas').select('*').order('id', { ascending: false });
                    if (!errSt && stData) {
                        this.state.suratTugasList = stData;
                        loadedFromCloud = true;
                    }
                } catch (e) {
                    console.warn('Gagal memuat data dari Supabase, beralih ke cache lokal:', e);
                }
            }

            if (!loadedFromCloud) {
                this.state.suratTugasList = this.loadLocalSuratTugas();
                if (this.state.kamusPok.length === 0) this.state.kamusPok = DEFAULT_KAMUS_POK;
                if (this.state.mitraList.length === 0) this.state.mitraList = DEFAULT_MITRA;
            }

            if (this.state.pegawaiList.length === 0) {
                this.state.pegawaiList = this.getFallbackPegawai();
            }

            this.state.isSupabaseConnected = loadedFromCloud;
            return this.state;
        },

        loadLocalSuratTugas() {
            try {
                const raw = localStorage.getItem('apa_surat_tugas_data');
                return raw ? JSON.parse(raw) : [];
            } catch {
                return [];
            }
        },

        saveLocalSuratTugas(list) {
            try {
                localStorage.setItem('apa_surat_tugas_data', JSON.stringify(list));
            } catch (e) {
                console.error('Error saving local surat tugas:', e);
            }
        },

        getAllPersonel() {
            const combined = [];
            for (const p of this.state.pegawaiList) {
                const profile = this.getPegawaiProfileAtDate(p.pegawai_nip, new Date().toISOString());
                combined.push({
                    nip: p.pegawai_nip,
                    nama: profile.nama_bergelar || p.nama,
                    raw_nama: p.nama,
                    pangkat: profile.pangkat,
                    jabatan: profile.jabatan,
                    status_kepegawaian: p.status_kepegawaian,
                    tanggal_pensiun: p.tanggal_pensiun,
                    is_mitra: false,
                    tag_label: `${profile.nama_bergelar || p.nama} (PNS/PPPK)`
                });
            }
            for (const m of this.state.mitraList) {
                combined.push({
                    nip: m.mitra_nip,
                    nama: m.nama,
                    raw_nama: m.nama,
                    pangkat: 'Mitra Statistik',
                    jabatan: m.posisi || 'Pencacah Lapangan',
                    status_kepegawaian: 'aktif',
                    is_mitra: true,
                    tag_label: `${m.nama} (${m.mitra_nip})`
                });
            }
            return combined;
        },

        getPegawaiProfileAtDate(nip, tglSurat) {
            const mitra = this.state.mitraList.find(m => m.mitra_nip === nip);
            if (mitra) {
                return {
                    nama: mitra.nama,
                    nama_bergelar: mitra.nama,
                    nip: mitra.mitra_nip,
                    jabatan: mitra.posisi || 'Mitra Statistik Lapangan',
                    pangkat: 'Mitra Statistik',
                    is_mitra: true
                };
            }

            const peg = this.state.pegawaiList.find(p => p.pegawai_nip === nip);
            const rawNama = peg ? peg.nama : (nip || 'Pegawai BPS');

            const parseDate = (d) => {
                if (!d) return new Date('1970-01-01');
                const parts = d.split('/');
                if (parts.length === 3) return new Date(`${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`);
                return new Date(d);
            };

            const targetDate = tglSurat ? new Date(tglSurat) : new Date();

            // Riwayat Gelar
            const gelarList = this.state.riwayatGelar
                .filter(g => g.pegawai_nip === nip)
                .sort((a, b) => parseDate(b.tmt) - parseDate(a.tmt));
            
            const g = gelarList[0] || {};
            const gelarDepan = g.gelar_depan ? (g.gelar_depan.trim() + ' ') : '';
            const gelarBelakang = g.gelar_belakang ? (', ' + g.gelar_belakang.trim()) : '';
            const namaBergelar = `${gelarDepan}${rawNama}${gelarBelakang}`.trim();

            // Riwayat Jabatan
            const jabList = this.state.riwayatJabatan
                .filter(j => j.pegawai_nip === nip)
                .sort((a, b) => parseDate(b.tmt) - parseDate(a.tmt));
            const j = jabList.find(item => item.jenis === 'utama') || jabList[0] || {};
            const jabatan = j.jabatan || 'Statistisi BPS Kabupaten Raja Ampat';

            // Riwayat Pangkat
            const pangList = this.state.riwayatPangkat
                .filter(p => p.pegawai_nip === nip)
                .sort((a, b) => parseDate(b.tmt) - parseDate(a.tmt));
            const p = pangList[0] || {};
            const pangkat = p.pangkat ? `${p.pangkat} (${p.golongan})` : 'Penata Muda (IIIa)';

            return {
                nama: rawNama,
                nama_bergelar: namaBergelar,
                nip,
                jabatan,
                pangkat,
                is_mitra: false
            };
        },

        getPenandatanganAtDate(tglSurat) {
            const date = tglSurat ? new Date(tglSurat) : new Date();
            const year = date.getFullYear();
            const month = date.getMonth() + 1;

            if (year < 2026 || (year === 2026 && month <= 3)) {
                return {
                    nip: '196803201994012001',
                    nama: 'Ir. Nurhaida Sirun',
                    jabatan: 'Kepala Badan Pusat Statistik Kabupaten Raja Ampat'
                };
            } else if (year === 2026 && month <= 6) {
                return {
                    nip: '198904192012111001',
                    nama: 'Andrie Wardani, SST',
                    jabatan: 'Plt. Kepala Badan Pusat Statistik Kabupaten Raja Ampat'
                };
            } else {
                return {
                    nip: '198604072009022004',
                    nama: 'Frida Irian S. Ompusunggu, SST, M.Ing.',
                    jabatan: 'Kepala Badan Pusat Statistik Kabupaten Raja Ampat'
                };
            }
        },

        getPPK() {
            return {
                nip: '199510152018021001',
                nama: 'Abdillah Humam, SST',
                jabatan: 'Pejabat Pembuat Komitmen'
            };
        },

        parseIndonesianDateRange(text) {
            if (!text || typeof text !== 'string') {
                const now = new Date();
                return {
                    startDate: now,
                    endDate: now,
                    daysCount: 1,
                    text: this.formatDateIndo(now)
                };
            }

            text = text.trim();
            const currentYear = new Date().getFullYear();
            const yearMatch = text.match(/20\d{2}/);
            const year = yearMatch ? parseInt(yearMatch[0], 10) : currentYear;

            // Pattern: "25 s.d. 27 Maret"
            const rangePattern = /(\d{1,2})\s*(?:s\.?d\.?|-|sampai)\s*(\d{1,2})\s+([A-Za-z]+)/i;
            const matchRange = text.match(rangePattern);

            if (matchRange) {
                const d1 = parseInt(matchRange[1], 10);
                const d2 = parseInt(matchRange[2], 10);
                const monthStr = matchRange[3].toLowerCase();
                const mIdx = INDO_MONTHS.findIndex(m => m.toLowerCase().startsWith(monthStr.slice(0, 3)));
                const month = mIdx !== -1 ? mIdx : 2;

                const startDate = new Date(year, month, d1);
                const endDate = new Date(year, month, d2);
                const diffDays = Math.max(1, Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1);

                return { startDate, endDate, daysCount: diffDays, text };
            }

            // Pattern: "30 Maret s.d. 1 April"
            const crossMonthPattern = /(\d{1,2})\s+([A-Za-z]+)\s*(?:s\.?d\.?|-|sampai)\s*(\d{1,2})\s+([A-Za-z]+)/i;
            const matchCross = text.match(crossMonthPattern);
            if (matchCross) {
                const d1 = parseInt(matchCross[1], 10);
                const m1Idx = INDO_MONTHS.findIndex(m => m.toLowerCase().startsWith(matchCross[2].toLowerCase().slice(0, 3)));
                const d2 = parseInt(matchCross[3], 10);
                const m2Idx = INDO_MONTHS.findIndex(m => m.toLowerCase().startsWith(matchCross[4].toLowerCase().slice(0, 3)));

                const startDate = new Date(year, m1Idx !== -1 ? m1Idx : 2, d1);
                const endDate = new Date(year, m2Idx !== -1 ? m2Idx : 3, d2);
                const diffDays = Math.max(1, Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1);

                return { startDate, endDate, daysCount: diffDays, text };
            }

            // Single date: "25 Maret 2026"
            const singlePattern = /(\d{1,2})\s+([A-Za-z]+)/i;
            const matchSingle = text.match(singlePattern);
            if (matchSingle) {
                const d1 = parseInt(matchSingle[1], 10);
                const mIdx = INDO_MONTHS.findIndex(m => m.toLowerCase().startsWith(matchSingle[2].toLowerCase().slice(0, 3)));
                const startDate = new Date(year, mIdx !== -1 ? mIdx : 2, d1);
                return { startDate, endDate: startDate, daysCount: 1, text };
            }

            const now = new Date();
            return { startDate: now, endDate: now, daysCount: 1, text };
        },

        formatDateIndo(dateObj) {
            if (!dateObj) return '';
            const d = new Date(dateObj);
            return `${d.getDate()} ${INDO_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
        },

        checkScheduleConflicts(nipList, startDate, endDate, excludeId = null) {
            if (!nipList || nipList.length === 0 || !startDate || !endDate) return [];
            const conflicts = [];
            const sTime = new Date(startDate).getTime();
            const eTime = new Date(endDate).getTime();

            for (const st of this.state.suratTugasList) {
                if (excludeId && String(st.id) === String(excludeId)) continue;
                
                const otherNips = Array.isArray(st.pegawai_nip_list) ? st.pegawai_nip_list : [];
                const commonNips = nipList.filter(nip => otherNips.includes(nip));

                if (commonNips.length > 0) {
                    const otherRange = this.parseIndonesianDateRange(st.waktu_pelaksanaan || st.tgl_mulai);
                    const otherSTime = otherRange.startDate.getTime();
                    const otherETime = otherRange.endDate.getTime();

                    if (sTime <= otherETime && eTime >= otherSTime) {
                        for (const nip of commonNips) {
                            const person = this.getAllPersonel().find(p => p.nip === nip);
                            const name = person ? person.nama : nip;
                            conflicts.push({
                                nip,
                                name,
                                perihal: st.perihal,
                                waktu: st.waktu_pelaksanaan,
                                nomor_surat: st.nomor_surat || 'Belum Bernomor',
                                status: st.status
                            });
                        }
                    }
                }
            }
            return conflicts;
        },

        checkRetirement(nipList, targetDate) {
            if (!nipList || nipList.length === 0) return [];
            const warnings = [];
            const tDate = targetDate ? new Date(targetDate) : new Date();

            for (const nip of nipList) {
                const person = this.state.pegawaiList.find(p => p.pegawai_nip === nip);
                if (person) {
                    if (person.status_kepegawaian === 'pensiun') {
                        warnings.push({
                            nip,
                            nama: person.nama,
                            alasan: 'Pegawai berstatus pensiun di sistem kepegawaian'
                        });
                    } else if (person.tanggal_pensiun) {
                        const pensiunDate = new Date(person.tanggal_pensiun);
                        if (tDate >= pensiunDate) {
                            warnings.push({
                                nip,
                                nama: person.nama,
                                alasan: `Pegawai telah melewati batas tanggal pensiun (${person.tanggal_pensiun})`
                            });
                        }
                    }
                }
            }
            return warnings;
        },

        generateNomorSurat(tahun, nomorUrut, tglSurat) {
            const date = tglSurat ? new Date(tglSurat) : new Date();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const yyyy = String(tahun || date.getFullYear());
            const num = String(nomorUrut).padStart(3, '0');
            return `B-${num}/668870-92800/KP-650/${mm}/${yyyy}`;
        },

        generateNomorSPD(tahun, nomorUrut, kodeMak, tglSurat) {
            const date = tglSurat ? new Date(tglSurat) : new Date();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const yyyy = String(tahun || date.getFullYear());
            const num = String(nomorUrut).padStart(3, '0');
            
            let makCode = '524111';
            if (kodeMak) {
                const parts = kodeMak.split('.');
                makCode = parts[parts.length - 1] || '524111';
            }
            return `B-${num}/668870-92800/SPPD-${makCode}/${mm}/${yyyy}`;
        },

        base64ToArrayBuffer(base64) {
            const binaryString = window.atob(base64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes.buffer;
        },

        async loadTemplateBuffer(templateFilename) {
            const client = (window.APA_AUTH && typeof window.APA_AUTH.getClient === 'function') 
                ? window.APA_AUTH.getClient() 
                : window.supabaseClient;

            if (client) {
                try {
                    const { data, error } = await client.storage
                        .from('template')
                        .download(templateFilename);
                    if (!error && data) {
                        return await data.arrayBuffer();
                    }
                } catch (e) {}
            }

            try {
                const resp = await fetch(`Assets/templates/${templateFilename}`);
                if (resp.ok) {
                    return await resp.arrayBuffer();
                }
            } catch (e) {}

            try {
                const resp2 = await fetch(`Buckets/${templateFilename}`);
                if (resp2.ok) {
                    return await resp2.arrayBuffer();
                }
            } catch (e) {}

            if (templateFilename.includes('lampiran') && templateFilename.includes('spd')) {
                return this.base64ToArrayBuffer(TEMPLATES_BASE64.spd);
            } else if (templateFilename.includes('lampiran')) {
                return this.base64ToArrayBuffer(TEMPLATES_BASE64.lampiran);
            } else {
                return this.base64ToArrayBuffer(TEMPLATES_BASE64.tunggal);
            }
        },

        async generateDocxBlob(surat) {
            if (!window.PizZip || !window.docxtemplater) {
                throw new Error('Library PizZip dan Docxtemplater belum dimuat.');
            }

            const tipeKey = surat.tipe_surat || 'surat_tugas';
            const tipeConf = TIPE_SURAT_CONFIG[tipeKey] || TIPE_SURAT_CONFIG.surat_tugas;
            const flags = tipeConf.flags;
            const templateFilename = tipeConf.template;

            const templateBuffer = await this.loadTemplateBuffer(templateFilename);
            const zip = new window.PizZip(templateBuffer);

            // Normalisasi backslash ke forward slash untuk format standar OpenXML docx
            Object.keys(zip.files).forEach(f => {
                if (f.includes('\\')) {
                    const norm = f.replace(/\\/g, '/');
                    const fileObj = zip.file(f);
                    if (fileObj) {
                        zip.file(norm, fileObj.asArrayBuffer());
                        delete zip.files[f];
                    }
                }
            });

            const doc = new window.docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true
            });

            const dateRange = this.parseIndonesianDateRange(surat.waktu_pelaksanaan);
            const tglSuratIndo = surat.tgl_surat ? this.formatDateIndo(surat.tgl_surat) : this.formatDateIndo(new Date());
            const tahun = new Date(surat.tgl_surat || new Date()).getFullYear();

            const nipList = Array.isArray(surat.pegawai_nip_list) ? surat.pegawai_nip_list : [];
            const bertugasObj = surat.bertugas_sebagai || {};

            const ulList = nipList.map((nip, idx) => {
                const prof = this.getPegawaiProfileAtDate(nip, surat.tgl_surat);
                const role = bertugasObj[nip] || 'Petugas Lapangan';
                return {
                    no: idx + 1,
                    nama: prof.nama_bergelar || prof.nama,
                    nip: prof.nip,
                    nama_nip: `${prof.nama_bergelar || prof.nama}\nNIP. ${prof.nip}`,
                    pangkat: prof.pangkat,
                    jabatan: prof.jabatan,
                    bertugas_sebagai: role
                };
            });

            const firstPeg = ulList[0] || {
                nama: 'Pegawai BPS',
                nip: '-',
                nama_nip: 'Pegawai BPS',
                pangkat: '-',
                jabatan: 'Statistisi',
                bertugas_sebagai: 'Petugas Lapangan'
            };

            let signatory = null;
            if (surat.penandatangan_nip) {
                const sProf = this.getPegawaiProfileAtDate(surat.penandatangan_nip, surat.tgl_surat);
                signatory = {
                    nip: sProf.nip,
                    nama: sProf.nama_bergelar || sProf.nama,
                    jabatan: sProf.jabatan
                };
            } else {
                signatory = this.getPenandatanganAtDate(surat.tgl_surat);
            }

            const ppk = this.getPPK();
            const numResp = Math.max(1, parseInt(surat.jumlah_responden, 10) || 5);
            const respRows = [];
            for (let r = 1; r <= numResp; r++) {
                respRows.push({
                    no: r,
                    tgl: `.... / .... / ${tahun}`,
                    nama_responden: `Responden / Lokasi Sasaran Ke-${r}`
                });
            }

            const contextData = {
                no: surat.nomor_urut || 1,
                nomor_surat: surat.nomor_surat || 'B-001/668870-92800/KP-650/04/2026',
                menimbang: surat.menimbang || 'Bahwa dalam rangka kelancaran pelaksanaan kegiatan administrasi dan statistik di lingkungan BPS Kabupaten Raja Ampat, dipandang perlu untuk menugaskan pegawai yang bersangkutan.',
                nama: firstPeg.nama,
                jabatan: firstPeg.jabatan,
                perihal: surat.perihal || 'Pelaksanaan Tugas Lapangan',
                tempat_tujuan: surat.tempat_tujuan || 'Distrik Kota Waisai, Raja Ampat',
                untuk_text: `Melaksanakan ${surat.perihal || 'kegiatan dinas'} di ${surat.tempat_tujuan || 'wilayah Kabupaten Raja Ampat'}`,
                waktu_pelaksanaan: surat.waktu_pelaksanaan || dateRange.text,
                tahun: tahun,
                mak_pembebanan: surat.pok_id || '2901.BMA.006.051.A.524111',
                tgl_surat: tglSuratIndo,
                jabatan_penandatangan: signatory.jabatan,
                penandatangan: signatory.nama,
                nip_penandatangan: signatory.nip,
                has_spd: flags.has_spd,
                nomor_spd: surat.nomor_spd || `B-001/668870-92800/SPPD-524111/04/${tahun}`,
                nama_ppk: ppk.nama,
                nip_ppk: ppk.nip,
                nip: firstPeg.nip,
                nama_nip: firstPeg.nama_nip,
                pangkat: firstPeg.pangkat,
                angkutan: surat.alat_angkutan || 'Kendaraan Dinas / Roda Dua',
                hari: dateRange.daysCount || 1,
                ul: ulList,
                kendaraan: flags.has_kendaraan ? [{ angkutan: surat.alat_angkutan || 'Kendaraan Dinas' }] : false,
                menginap: flags.has_menginap ? [{ status: true }] : false,
                visum: flags.has_visum ? { r: respRows } : false
            };

            doc.render(contextData);

            return doc.getZip().generate({
                type: 'blob',
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            });
        },

        async renderPreviewTo(blob, containerEl) {
            if (!window.docx || typeof window.docx.renderAsync !== 'function') {
                containerEl.innerHTML = '<div style="padding:20px;text-align:center;color:#ef4444;">Library docx-preview belum tersedia.</div>';
                return;
            }

            containerEl.innerHTML = '<div style="padding:40px;text-align:center;color:#64748b;"><div class="spinner" style="margin:0 auto 12px;"></div>Memuat pratinjau dokumen Word...</div>';

            try {
                containerEl.innerHTML = '';
                await window.docx.renderAsync(blob, containerEl, null, {
                    className: 'docx-preview-wrapper',
                    inWrapper: true,
                    ignoreWidth: false,
                    ignoreHeight: false
                });
            } catch (err) {
                console.error('Error docx preview:', err);
                containerEl.innerHTML = `<div style="padding:30px;color:#ef4444;text-align:center;">
                    <p style="font-weight:700;margin-bottom:6px;">Pratinjau visual memerlukan penyesuaian browser.</p>
                    <p style="font-size:0.85rem;color:#64748b;">Gunakan tombol <b>Download .docx</b> atau <b>Buka di Word & Print</b> di bawah untuk melihat dokumen lengkap.</p>
                </div>`;
            }
        },

        async uploadPreviewAndOpen(blob, filename = 'Surat_Tugas.docx') {
            const client = (window.APA_AUTH && typeof window.APA_AUTH.getClient === 'function') 
                ? window.APA_AUTH.getClient() 
                : window.supabaseClient;

            const randomKey = `preview_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.docx`;

            if (client) {
                try {
                    const { error: upErr } = await client.storage
                        .from('surat-tugas-preview')
                        .upload(randomKey, blob, { contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', upsert: true });

                    if (!upErr) {
                        const { data: signData } = await client.storage
                            .from('surat-tugas-preview')
                            .createSignedUrl(randomKey, 600);

                        if (signData && signData.signedUrl) {
                            setTimeout(async () => {
                                try {
                                    await client.storage.from('surat-tugas-preview').remove([randomKey]);
                                } catch (_) {}
                            }, 30000);

                            window.open(signData.signedUrl, '_blank');
                            return { success: true, method: 'signed_url', url: signData.signedUrl };
                        }
                    }
                } catch (e) {
                    console.warn('Storage preview upload error, fallback ke local download:', e);
                }
            }

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 10000);
            return { success: true, method: 'direct_download' };
        },

        downloadBlob(blob, filename) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 10000);
        },

        async saveBatchSuratTugas(items) {
            const client = (window.APA_AUTH && typeof window.APA_AUTH.getClient === 'function') 
                ? window.APA_AUTH.getClient() 
                : window.supabaseClient;

            let inserted = [];

            if (client) {
                try {
                    const { data, error } = await client
                        .from('surat_tugas')
                        .insert(items)
                        .select();
                    if (!error && data) {
                        inserted = data;
                    }
                } catch (e) {
                    console.warn('Insert Supabase gagal, simpan ke lokal:', e);
                }
            }

            if (inserted.length === 0) {
                const currentLocal = this.loadLocalSuratTugas();
                let nextId = currentLocal.reduce((max, r) => Math.max(max, parseInt(r.id, 10) || 0), 0) + 1;
                
                const prepared = items.map(item => ({
                    ...item,
                    id: nextId++,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }));

                const merged = [...prepared, ...currentLocal];
                this.saveLocalSuratTugas(merged);
                this.state.suratTugasList = merged;
                return prepared;
            }

            this.state.suratTugasList = [...inserted, ...this.state.suratTugasList];
            return inserted;
        },

        async updateSuratTugas(id, fields) {
            const client = (window.APA_AUTH && typeof window.APA_AUTH.getClient === 'function') 
                ? window.APA_AUTH.getClient() 
                : window.supabaseClient;

            if (client) {
                try {
                    const { data, error } = await client
                        .from('surat_tugas')
                        .update({ ...fields, updated_at: new Date().toISOString() })
                        .eq('id', id)
                        .select();
                    if (!error && data && data.length > 0) {
                        const idx = this.state.suratTugasList.findIndex(s => String(s.id) === String(id));
                        if (idx !== -1) this.state.suratTugasList[idx] = data[0];
                        return data[0];
                    }
                } catch (e) {
                    console.warn('Update cloud gagal, simpan ke lokal:', e);
                }
            }

            const current = this.loadLocalSuratTugas();
            const idx = current.findIndex(s => String(s.id) === String(id));
            if (idx !== -1) {
                current[idx] = { ...current[idx], ...fields, updated_at: new Date().toISOString() };
                this.saveLocalSuratTugas(current);
                this.state.suratTugasList = current;
                return current[idx];
            }
            return null;
        },

        async deleteSuratTugas(id) {
            const client = (window.APA_AUTH && typeof window.APA_AUTH.getClient === 'function') 
                ? window.APA_AUTH.getClient() 
                : window.supabaseClient;

            if (client) {
                try {
                    await client.from('surat_tugas').delete().eq('id', id);
                } catch (e) {
                    console.warn('Delete cloud error:', e);
                }
            }

            const current = this.loadLocalSuratTugas().filter(s => String(s.id) !== String(id));
            this.saveLocalSuratTugas(current);
            this.state.suratTugasList = this.state.suratTugasList.filter(s => String(s.id) !== String(id));
            return true;
        },

        exportToExcel(list = this.state.suratTugasList) {
            if (!window.XLSX) {
                alert('Library SheetJS (XLSX) belum dimuat.');
                return;
            }

            const exportData = list.map((item, idx) => {
                const nips = Array.isArray(item.pegawai_nip_list) ? item.pegawai_nip_list : [];
                const names = nips.map(nip => {
                    const p = this.getAllPersonel().find(x => x.nip === nip);
                    return p ? p.nama : nip;
                }).join(', ');

                const tipeConf = TIPE_SURAT_CONFIG[item.tipe_surat] || {};

                return {
                    'No': idx + 1,
                    'Nomor Surat': item.nomor_surat || '-',
                    'Nomor SPD': item.nomor_spd || '-',
                    'Tanggal Surat': item.tgl_surat || '-',
                    'Waktu Pelaksanaan': item.waktu_pelaksanaan || '-',
                    'Perihal': item.perihal || '-',
                    'Tempat Tujuan': item.tempat_tujuan || '-',
                    'Pegawai / Mitra': names,
                    'Menimbang': item.menimbang || '-',
                    'Alat Angkutan': item.alat_angkutan || '-',
                    'POK / MAK': item.pok_id || '-',
                    'Tipe Surat': tipeConf.label || item.tipe_surat || 'Surat Tugas',
                    'Status': item.status || 'menunggu',
                    'Pengaju': item.created_by || 'user'
                };
            });

            const ws = window.XLSX.utils.json_to_sheet(exportData);
            const wb = window.XLSX.utils.book_new();
            window.XLSX.utils.book_append_sheet(wb, ws, 'Daftar Surat Tugas');
            window.XLSX.writeFile(wb, `Daftar_Surat_Tugas_BPS_Raja_Ampat_${Date.now()}.xlsx`);
        },

        async parseExcelFile(file) {
            if (!window.XLSX) {
                throw new Error('Library SheetJS belum tersedia.');
            }

            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = new Uint8Array(e.target.result);
                        const workbook = window.XLSX.read(data, { type: 'array' });
                        const firstSheet = workbook.SheetNames[0];
                        const rows = window.XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);
                        
                        const allPersons = this.getAllPersonel();
                        const parsedRows = rows.map((r, i) => {
                            const notes = [];
                            const perihal = r['Perihal'] || r['perihal'] || '';
                            const tujuan = r['Tempat Tujuan'] || r['tempat_tujuan'] || r['Tujuan'] || '';
                            const waktu = r['Waktu Pelaksanaan'] || r['waktu_pelaksanaan'] || r['Waktu'] || '';
                            const namaCol = r['Pegawai / Mitra'] || r['Pegawai'] || r['Nama'] || '';

                            if (!perihal) notes.push('Perihal kosong');
                            if (!tujuan) notes.push('Tujuan kosong');
                            if (!waktu) notes.push('Waktu kosong');

                            const matchedNips = [];
                            if (namaCol) {
                                const splitted = String(namaCol).split(/[,;]/).map(s => s.trim().toLowerCase());
                                for (const part of splitted) {
                                    const match = allPersons.find(p => 
                                        p.nama.toLowerCase().includes(part) || 
                                        p.raw_nama.toLowerCase().includes(part) || 
                                        p.nip.toLowerCase().includes(part)
                                    );
                                    if (match) {
                                        matchedNips.push(match.nip);
                                    }
                                }
                            }

                            if (matchedNips.length === 0) {
                                notes.push('Pegawai tidak ditemukan');
                            }

                            return {
                                rowNum: i + 1,
                                perihal,
                                tempat_tujuan: tujuan,
                                waktu_pelaksanaan: waktu,
                                pegawai_nip_list: matchedNips,
                                raw_nama: namaCol,
                                menimbang: r['Menimbang'] || '',
                                alat_angkutan: r['Alat Angkutan'] || 'Kendaraan Dinas',
                                pok_id: r['POK / MAK'] || r['MAK'] || '2901.BMA.006.051.A.524111',
                                tipe_surat: 'surat_tugas',
                                isValid: notes.length === 0,
                                notes: notes.join(', ') || 'Valid dan siap diimpor'
                            };
                        });

                        resolve(parsedRows);
                    } catch (err) {
                        reject(err);
                    }
                };
                reader.onerror = reject;
                reader.readAsArrayBuffer(file);
            });
        },

        async downloadBulkZip(list, onProgress = null) {
            if (!window.JSZip) {
                alert('Library JSZip belum tersedia.');
                return;
            }

            const zip = new window.JSZip();
            const folder = zip.folder('Surat_Tugas_BPS_Raja_Ampat');

            for (let i = 0; i < list.length; i++) {
                const item = list[i];
                if (onProgress) onProgress(i + 1, list.length);
                try {
                    const blob = await this.generateDocxBlob(item);
                    const cleanNomor = (item.nomor_surat || `ST_${item.id}`).replace(/[/\\?%*:|"<>]/g, '_');
                    const filename = `${String(i + 1).padStart(2, '0')}_${cleanNomor}.docx`;
                    folder.file(filename, blob);
                } catch (e) {
                    console.warn(`Gagal generate DOCX baris ke-${i + 1}:`, e);
                }
            }

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            this.downloadBlob(zipBlob, `Kumpulan_Surat_Tugas_${Date.now()}.zip`);
        },

        getFallbackPegawai() {
            return [
                { pegawai_nip: '198904192012111001', nama: 'Andrie Wardani', status_kepegawaian: 'aktif', is_mitra: false },
                { pegawai_nip: '198303182011011007', nama: 'Derek Mandowen', status_kepegawaian: 'aktif', is_mitra: false },
                { pegawai_nip: '197912122010032002', nama: 'Frida Buratehi', status_kepegawaian: 'aktif', is_mitra: false },
                { pegawai_nip: '199209162014121001', nama: 'Maulana Tahir', status_kepegawaian: 'aktif', is_mitra: false },
                { pegawai_nip: '199510152018021001', nama: 'Abdillah Humam', status_kepegawaian: 'aktif', is_mitra: false },
                { pegawai_nip: '198804022011011007', nama: 'Ikbal Ismail', status_kepegawaian: 'aktif', is_mitra: false },
                { pegawai_nip: '199207162019031001', nama: 'Lestari Irfandi Amir', status_kepegawaian: 'aktif', is_mitra: false },
                { pegawai_nip: '199610012019011003', nama: 'Bagas Indra Sakti', status_kepegawaian: 'aktif', is_mitra: false },
                { pegawai_nip: '199504162018022001', nama: 'Sausan Zulfa Faizah', status_kepegawaian: 'aktif', is_mitra: false },
                { pegawai_nip: '197809102007011002', nama: 'Muchammad Ali Jumati', status_kepegawaian: 'aktif', is_mitra: false },
                { pegawai_nip: '198211202011012011', nama: 'Novalin P. Wapai', status_kepegawaian: 'aktif', is_mitra: false },
                { pegawai_nip: '198801242011012016', nama: 'Gerda Y. Kalasuat', status_kepegawaian: 'aktif', is_mitra: false },
                { pegawai_nip: '199903302019121001', nama: 'Rizal Akbar Komarudin', status_kepegawaian: 'aktif', is_mitra: false },
                { pegawai_nip: '199801062019122001', nama: 'Jandriana Ramandei', status_kepegawaian: 'aktif', is_mitra: false },
                { pegawai_nip: '198908262012112001', nama: 'Elok Agustina', status_kepegawaian: 'aktif', is_mitra: false },
                { pegawai_nip: '199902212021042001', nama: 'Zidna Inayatika', status_kepegawaian: 'aktif', is_mitra: false },
                { pegawai_nip: '199903302022011001', nama: 'Haidar Nabil', status_kepegawaian: 'aktif', is_mitra: false },
                { pegawai_nip: '199803012022032017', nama: 'Syayu Hanana Yohana Stefani', status_kepegawaian: 'aktif', is_mitra: false },
                { pegawai_nip: '200003232023021002', nama: 'M. Aris Munandar', status_kepegawaian: 'aktif', is_mitra: false },
                { pegawai_nip: '200103272023102002', nama: 'Dwi Ayu Andriani', status_kepegawaian: 'aktif', is_mitra: false },
                { pegawai_nip: '200107052024121001', nama: 'Figri Al - Rasjid Abdullah', status_kepegawaian: 'aktif', is_mitra: false },
                { pegawai_nip: '196803201994012001', nama: 'Nurhaida Sirun', status_kepegawaian: 'pensiun', tanggal_pensiun: '3/31/2026', is_mitra: false },
                { pegawai_nip: '200204152026031001', nama: 'M. Khusen Ali Al Anjabi', status_kepegawaian: 'aktif', is_mitra: false },
                { pegawai_nip: '200404122026032001', nama: 'Arikhza Saputri', status_kepegawaian: 'aktif', is_mitra: false },
                { pegawai_nip: '198604072009022004', nama: 'Frida Irian S. Ompusunggu', status_kepegawaian: 'aktif', is_mitra: false }
            ];
        }
    };

    window.SuratTugasHelper = SuratTugasHelper;
})();
