# SIA Pengeluaran Kos

Sistem Informasi Akuntansi Pengeluaran Kas dan Biaya Operasional Usaha Sewa Kos.

## 🌐 Live Demo

Aplikasi dapat diakses secara online melalui link berikut:

👉 **[Lihat Live Demo Sistem](https://github.com/taniazefanya03/SIA-Kos-Putri-Harmoni-Residence)**

> Silakan buka link di atas untuk mencoba sistem secara langsung tanpa perlu menjalankan aplikasi melalui VS Code.



## Teknologi

- HTML5
- CSS murni + Tailwind CSS CDN
- Vanilla JavaScript ES6
- Font Awesome CDN
- Supabase JS v2 CDN
- Supabase PostgreSQL

Tidak membutuhkan `npm install`, bundler, atau proses build.

## Menjalankan aplikasi

### Cara 1 — Langsung

Buka `index.html` dengan browser.

### Cara 2 — VS Code + Live Server

1. Buka folder `sia-pengeluaran-kos` di VS Code.
2. Install ekstensi Live Server jika belum ada.
3. Klik kanan `index.html`.
4. Pilih **Open with Live Server**.

## Mode lokal

Aplikasi otomatis berjalan menggunakan `localStorage` jika Supabase belum dikonfigurasi. Ini memungkinkan seluruh UI, CRUD, dashboard, laporan, dan kategori diuji langsung dari `index.html`.

Data mode lokal tersimpan di browser dan tidak dikirim ke server.

## Mengaktifkan Supabase

1. Buat project baru di Supabase.
2. Buka **SQL Editor**.
3. Jalankan seluruh isi `schema.sql`.
4. Ambil:
   - Project URL
   - Project API anon/public key
5. Sebelum memuat `app.js`, Anda dapat mengatur konfigurasi dari console browser:

```js
window.SIA_SUPABASE_URL = "https://PROJECT-ID.supabase.co";
window.SIA_SUPABASE_ANON_KEY = "YOUR-ANON-KEY";
```

Untuk penggunaan permanen, cara sederhana tanpa build adalah menambahkan dua baris tersebut ke `index.html`, tepat sebelum:

```html
<script src="supabase-config.js"></script>
```

Contoh:

```html
<script>
  window.SIA_SUPABASE_URL = "https://PROJECT-ID.supabase.co";
  window.SIA_SUPABASE_ANON_KEY = "PASTE_ANON_PUBLIC_KEY";
</script>
<script src="supabase-config.js"></script>
```

> Jangan masukkan `service_role` key ke browser. Gunakan hanya anon/public key.

## Modul

- Dashboard
  - Total pengeluaran bulan berjalan
  - Total utilitas
  - Kategori terbesar
  - Jumlah transaksi
  - Distribusi kategori
  - 5 transaksi terbaru
- Pengeluaran Kas
  - Create
  - Read
  - Update
  - Delete
  - Pencarian
  - Filter kategori, bulan, status
- Laporan Akuntansi
  - Rekap harian
  - Rekap bulanan
  - Rekap tahunan
  - Rekap per kategori
  - Buku kas keluar dengan akumulasi
- Kategori Biaya
  - CRUD kategori
- Supabase
  - CRUD `cash_disbursements`
  - CRUD `expense_categories`

## Catatan keamanan

`schema.sql` menyediakan policy `anon` yang sangat terbuka agar aplikasi demo/browser dapat langsung melakukan CRUD setelah memasukkan anon key. Untuk sistem produksi, tambahkan autentikasi Supabase dan ubah RLS policy agar hanya pengguna berwenang yang dapat membaca/mengubah data.

## Struktur

```text
sia-pengeluaran-kos/
├── index.html
├── style.css
├── app.js
├── supabase-config.js
├── schema.sql
└── README.md
```


## Data dummy bawaan

Saat pertama kali dijalankan tanpa Supabase, aplikasi otomatis membuat data dummy:
- 30 transaksi pengeluaran
- Periode Juli–September 2026
- Semua kategori operasional terwakili
- Metode Kas dan Transfer Bank
- Status Lunas dan Belum Lunas
- Unit/kamar dan transaksi umum

Data dummy hanya dibuat jika `localStorage` belum memiliki data transaksi. Setelah itu data tidak ditimpa lagi.

## Kustomisasi tampilan properti
Dashboard sekarang menggunakan tampilan visual bergaya premium dengan foto properti, nama kos, alamat, kartu ringkasan, dan metadata properti. Nilai contoh dapat diganti di `app.js` pada bagian `PROPERTY_PROFILE`.

Untuk mengganti foto dashboard, ubah URL `src` pada elemen `.property-photo` di `index.html` dengan foto properti kos Anda sendiri. Jika ingin tetap bisa dibuka tanpa internet, simpan foto lokal di folder proyek lalu gunakan path seperti `assets/kos.jpg`.

### Profil visual kos (demo)
Dashboard versi terbaru dibuat lebih visual seperti dashboard bisnis modern: foto properti, badge **Kos Putri**, nama kos, alamat, kapasitas kamar, fasilitas, status properti, serta ringkasan pengeluaran.

Profil contoh yang dipakai saat ini:
- Nama: **Kost Harmoni Residence**
- Jenis: **Kos Putri**
- Alamat: **Jl. Cempaka Raya No. 18, Semarang**
- Kapasitas: **24 kamar**
- Fasilitas: **Wi-Fi, CCTV, Parkir**
- Jam admin: **08.00–20.00**

> Data profil di atas adalah data contoh/demo dan dapat diganti langsung di `app.js` pada objek `PROPERTY_PROFILE`. Foto dashboard menggunakan gambar ilustrasi dari Unsplash dan tetap memiliki fallback gradient jika koneksi internet tidak tersedia.
