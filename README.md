# Rinsey

Rinsey adalah aplikasi manajemen laundry untuk membantu operasional bisnis
tetap rapi dalam satu tempat. Kelola pelanggan, pesanan, pembayaran, stok,
layanan, dan anggota tim melalui dashboard yang sederhana.

## Fitur

- Dashboard ringkasan operasional dan keuangan.
- Manajemen pelanggan dan riwayat transaksi.
- Pelacakan status pesanan laundry.
- Pencatatan pemasukan dan pengeluaran.
- Manajemen stok.
- Pengaturan layanan dan harga.
- Dukungan banyak anggota tim dengan role `owner`, `admin`, `kasir`, dan
  `staff`.
- Autentikasi dan penyimpanan data menggunakan Supabase.
- Pembayaran online melalui integrasi Midtrans.

## Teknologi

- React 19
- Vite
- React Router
- Supabase (Auth, PostgreSQL, dan Row Level Security)
- Express
- Midtrans
- Recharts
- Lucide React

## Menjalankan secara lokal

### Prasyarat

- Node.js 20 atau versi yang lebih baru
- npm
- Project Supabase

### Instalasi

```bash
git clone https://github.com/cutzhraa/rinsey.git
cd rinsey
npm install
```

Buat file `.env` di root project, lalu isi variabel berikut:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Jalankan aplikasi dalam mode development:

```bash
npm run dev
```

Aplikasi tersedia di `http://localhost:5173`.

## Database Supabase

Migration database berada di [`supabase/migrations`](./supabase/migrations).
Jalankan migration tersebut pada project Supabase sebelum menggunakan fitur
aplikasi yang membutuhkan data pelanggan, transaksi, keuangan, stok, atau
anggota tim.

## Perintah yang tersedia

| Perintah | Kegunaan |
| --- | --- |
| `npm run dev` | Menjalankan server development Vite |
| `npm run build` | Membuat build production |
| `npm run preview` | Meninjau build production secara lokal |
| `npm run lint` | Menjalankan ESLint |

## Struktur project

```text
src/
├── components/       Komponen UI bersama
├── lib/              Konfigurasi Supabase dan helper akses
└── pages/            Halaman aplikasi
supabase/migrations/  Struktur dan kebijakan database
server/               API server untuk kebutuhan backend
api/                  Endpoint serverless
```

## Deployment

Build aplikasi dengan:

```bash
npm run build
```

Project ini dapat dideploy ke platform yang mendukung aplikasi Vite, seperti
Vercel. Pastikan environment variable Supabase sudah ditambahkan pada
konfigurasi project deployment.

## Lisensi

Lisensi project belum ditentukan.
