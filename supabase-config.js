/**
 * SIA PENGELUARAN KOS
 * Konfigurasi Supabase + CRUD.
 *
 * Agar koneksi Supabase aktif:
 * 1. Buat project di Supabase.
 * 2. Jalankan schema.sql di SQL Editor.
 * 3. Isi SUPABASE_URL dan SUPABASE_ANON_KEY dengan nilai dari
 *    Project Settings > API.
 *
 * Aplikasi tetap bisa dipakai langsung tanpa konfigurasi Supabase.
 * Dalam kondisi tersebut data disimpan di localStorage browser.
 */

const SUPABASE_URL = window.SIA_SUPABASE_URL || "https://plvtgyyvkykssbiawsif.supabase.co";
const SUPABASE_ANON_KEY = window.SIA_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdnRneXl2a3lrc3NiaWF3c2lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NzQ0MzAsImV4cCI6MjEwNjE1MDQzMH0.rJqQmEkjFjqrTCDrGcBBCJ8kTjGlK1CLigcs-GS8tlw";

const SUPABASE_ENABLED = Boolean(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  window.supabase &&
  typeof window.supabase.createClient === "function"
);

const dbClient = SUPABASE_ENABLED
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const LOCAL_KEYS = {
  transactions: "sia_kos_cash_disbursements_v1",
  categories: "sia_kos_expense_categories_v1"
};

const DEFAULT_CATEGORIES = [
  { id: "local-utilitas", name: "Biaya Utilitas", description: "Listrik, air, internet/Wi-Fi" },
  { id: "local-pemeliharaan", name: "Biaya Pemeliharaan & Perbaikan", description: "Servis AC, plumbing, cat, dan perbaikan lainnya" },
  { id: "local-kebersihan", name: "Biaya Kebersihan & Keamanan", description: "Gaji marbot/penjaga, keamanan lingkungan, sampah" },
  { id: "local-perlengkapan", name: "Biaya Perlengkapan Kos", description: "Sabun, perlengkapan kamar mandi, alat kebersihan" },
  { id: "local-lainnya", name: "Biaya Operasional Lainnya", description: "Biaya operasional lain di luar kategori utama" }
];

function localRead(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error("Gagal membaca localStorage:", error);
    return fallback;
  }
}

function localWrite(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function localUuid(prefix = "local") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeCategory(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    created_at: row.created_at || null
  };
}

function normalizeTransaction(row) {
  return {
    id: row.id,
    proof_number: row.proof_number,
    transaction_date: row.transaction_date,
    category_id: row.category_id,
    unit_name: row.unit_name || "",
    description: row.description || "",
    amount: Number(row.amount || 0),
    payment_method: row.payment_method,
    payment_status: row.payment_status,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null
  };
}


const DEMO_TRANSACTIONS = [
  { id:"demo-001", proof_number:"BKK-2026-0901", transaction_date:"2026-09-01", category_id:"local-utilitas", unit_name:"Umum", description:"Pembayaran listrik gedung kos periode September", amount:1850000, payment_method:"Transfer Bank", payment_status:"Lunas", created_at:"2026-09-01T08:15:00+07:00" },
  { id:"demo-002", proof_number:"BKK-2026-0902", transaction_date:"2026-09-02", category_id:"local-kebersihan", unit_name:"Umum", description:"Honor penjaga kos bulan September", amount:1500000, payment_method:"Kas", payment_status:"Lunas", created_at:"2026-09-02T09:00:00+07:00" },
  { id:"demo-003", proof_number:"BKK-2026-0903", transaction_date:"2026-09-03", category_id:"local-utilitas", unit_name:"Umum", description:"Tagihan internet Wi-Fi bulan September", amount:550000, payment_method:"Transfer Bank", payment_status:"Lunas", created_at:"2026-09-03T10:20:00+07:00" },
  { id:"demo-004", proof_number:"BKK-2026-0904", transaction_date:"2026-09-04", category_id:"local-perlengkapan", unit_name:"Umum", description:"Pembelian sabun, pel, sikat dan cairan pembersih", amount:475000, payment_method:"Kas", payment_status:"Lunas", created_at:"2026-09-04T11:10:00+07:00" },
  { id:"demo-005", proof_number:"BKK-2026-0905", transaction_date:"2026-09-05", category_id:"local-pemeliharaan", unit_name:"Kamar 103", description:"Servis AC kamar 103 dan penggantian kapasitor", amount:625000, payment_method:"Transfer Bank", payment_status:"Lunas", created_at:"2026-09-05T13:30:00+07:00" },
  { id:"demo-006", proof_number:"BKK-2026-0906", transaction_date:"2026-09-06", category_id:"local-kebersihan", unit_name:"Umum", description:"Iuran kebersihan dan pengangkutan sampah", amount:350000, payment_method:"Kas", payment_status:"Lunas", created_at:"2026-09-06T08:40:00+07:00" },
  { id:"demo-007", proof_number:"BKK-2026-0907", transaction_date:"2026-09-08", category_id:"local-utilitas", unit_name:"Umum", description:"Pembayaran air PDAM bulan September", amount:725000, payment_method:"Transfer Bank", payment_status:"Lunas", created_at:"2026-09-08T09:25:00+07:00" },
  { id:"demo-008", proof_number:"BKK-2026-0908", transaction_date:"2026-09-10", category_id:"local-lainnya", unit_name:"Umum", description:"Transportasi pembelian kebutuhan operasional", amount:180000, payment_method:"Kas", payment_status:"Lunas", created_at:"2026-09-10T10:05:00+07:00" },
  { id:"demo-009", proof_number:"BKK-2026-0909", transaction_date:"2026-09-11", category_id:"local-pemeliharaan", unit_name:"Kamar 207", description:"Perbaikan kran dan saluran air kamar 207", amount:290000, payment_method:"Kas", payment_status:"Lunas", created_at:"2026-09-11T15:10:00+07:00" },
  { id:"demo-010", proof_number:"BKK-2026-0910", transaction_date:"2026-09-13", category_id:"local-perlengkapan", unit_name:"Kamar 105", description:"Penggantian tirai kamar dan gantungan pakaian", amount:320000, payment_method:"Transfer Bank", payment_status:"Lunas", created_at:"2026-09-13T11:45:00+07:00" },
  { id:"demo-011", proof_number:"BKK-2026-0911", transaction_date:"2026-09-15", category_id:"local-utilitas", unit_name:"Umum", description:"Pembelian token listrik cadangan", amount:950000, payment_method:"Transfer Bank", payment_status:"Lunas", created_at:"2026-09-15T08:55:00+07:00" },
  { id:"demo-012", proof_number:"BKK-2026-0912", transaction_date:"2026-09-17", category_id:"local-kebersihan", unit_name:"Umum", description:"Pembelian kantong sampah dan alat kebersihan", amount:265000, payment_method:"Kas", payment_status:"Lunas", created_at:"2026-09-17T14:20:00+07:00" },
  { id:"demo-013", proof_number:"BKK-2026-0913", transaction_date:"2026-09-19", category_id:"local-pemeliharaan", unit_name:"Kamar 201", description:"Pengecatan ulang dinding kamar 201", amount:875000, payment_method:"Transfer Bank", payment_status:"Belum Lunas", created_at:"2026-09-19T09:35:00+07:00" },
  { id:"demo-014", proof_number:"BKK-2026-0914", transaction_date:"2026-09-21", category_id:"local-perlengkapan", unit_name:"Umum", description:"Stok perlengkapan kamar mandi dan pewangi", amount:410000, payment_method:"Kas", payment_status:"Lunas", created_at:"2026-09-21T10:30:00+07:00" },
  { id:"demo-015", proof_number:"BKK-2026-0915", transaction_date:"2026-09-22", category_id:"local-lainnya", unit_name:"Umum", description:"Biaya administrasi bank dan kebutuhan administrasi", amount:125000, payment_method:"Transfer Bank", payment_status:"Lunas", created_at:"2026-09-22T12:10:00+07:00" },
  { id:"demo-016", proof_number:"BKK-2026-0916", transaction_date:"2026-09-24", category_id:"local-utilitas", unit_name:"Umum", description:"Pembayaran tambahan listrik area bersama", amount:625000, payment_method:"Transfer Bank", payment_status:"Lunas", created_at:"2026-09-24T09:15:00+07:00" },
  { id:"demo-017", proof_number:"BKK-2026-0917", transaction_date:"2026-09-25", category_id:"local-pemeliharaan", unit_name:"Kamar 110", description:"Penggantian lampu dan fitting kamar 110", amount:215000, payment_method:"Kas", payment_status:"Lunas", created_at:"2026-09-25T16:05:00+07:00" },
  { id:"demo-018", proof_number:"BKK-2026-0918", transaction_date:"2026-09-26", category_id:"local-kebersihan", unit_name:"Umum", description:"Honor petugas kebersihan tambahan", amount:450000, payment_method:"Kas", payment_status:"Belum Lunas", created_at:"2026-09-26T08:30:00+07:00" },

  { id:"demo-019", proof_number:"BKK-2026-0801", transaction_date:"2026-08-02", category_id:"local-utilitas", unit_name:"Umum", description:"Pembayaran listrik bulan Agustus", amount:1725000, payment_method:"Transfer Bank", payment_status:"Lunas", created_at:"2026-08-02T08:15:00+07:00" },
  { id:"demo-020", proof_number:"BKK-2026-0802", transaction_date:"2026-08-04", category_id:"local-kebersihan", unit_name:"Umum", description:"Honor penjaga kos bulan Agustus", amount:1500000, payment_method:"Kas", payment_status:"Lunas", created_at:"2026-08-04T09:00:00+07:00" },
  { id:"demo-021", proof_number:"BKK-2026-0803", transaction_date:"2026-08-07", category_id:"local-utilitas", unit_name:"Umum", description:"Tagihan air dan internet bulan Agustus", amount:1180000, payment_method:"Transfer Bank", payment_status:"Lunas", created_at:"2026-08-07T10:20:00+07:00" },
  { id:"demo-022", proof_number:"BKK-2026-0804", transaction_date:"2026-08-12", category_id:"local-pemeliharaan", unit_name:"Kamar 204", description:"Perbaikan plafon dan lampu kamar 204", amount:740000, payment_method:"Transfer Bank", payment_status:"Lunas", created_at:"2026-08-12T13:30:00+07:00" },
  { id:"demo-023", proof_number:"BKK-2026-0805", transaction_date:"2026-08-18", category_id:"local-perlengkapan", unit_name:"Umum", description:"Pembelian stok alat kebersihan", amount:385000, payment_method:"Kas", payment_status:"Lunas", created_at:"2026-08-18T11:10:00+07:00" },
  { id:"demo-024", proof_number:"BKK-2026-0806", transaction_date:"2026-08-23", category_id:"local-lainnya", unit_name:"Umum", description:"Biaya transportasi dan administrasi operasional", amount:235000, payment_method:"Kas", payment_status:"Lunas", created_at:"2026-08-23T15:10:00+07:00" },

  { id:"demo-025", proof_number:"BKK-2026-0701", transaction_date:"2026-07-03", category_id:"local-utilitas", unit_name:"Umum", description:"Pembayaran listrik bulan Juli", amount:1680000, payment_method:"Transfer Bank", payment_status:"Lunas", created_at:"2026-07-03T08:10:00+07:00" },
  { id:"demo-026", proof_number:"BKK-2026-0702", transaction_date:"2026-07-05", category_id:"local-kebersihan", unit_name:"Umum", description:"Honor penjaga dan kebersihan bulan Juli", amount:1950000, payment_method:"Kas", payment_status:"Lunas", created_at:"2026-07-05T09:20:00+07:00" },
  { id:"demo-027", proof_number:"BKK-2026-0703", transaction_date:"2026-07-09", category_id:"local-pemeliharaan", unit_name:"Kamar 102", description:"Servis AC kamar 102", amount:520000, payment_method:"Transfer Bank", payment_status:"Lunas", created_at:"2026-07-09T13:00:00+07:00" },
  { id:"demo-028", proof_number:"BKK-2026-0704", transaction_date:"2026-07-15", category_id:"local-perlengkapan", unit_name:"Umum", description:"Pembelian perlengkapan kamar mandi", amount:450000, payment_method:"Kas", payment_status:"Lunas", created_at:"2026-07-15T11:00:00+07:00" },
  { id:"demo-029", proof_number:"BKK-2026-0705", transaction_date:"2026-07-21", category_id:"local-utilitas", unit_name:"Umum", description:"Pembayaran internet Wi-Fi", amount:550000, payment_method:"Transfer Bank", payment_status:"Lunas", created_at:"2026-07-21T10:10:00+07:00" },
  { id:"demo-030", proof_number:"BKK-2026-0706", transaction_date:"2026-07-27", category_id:"local-lainnya", unit_name:"Umum", description:"Kebutuhan administrasi usaha kos", amount:175000, payment_method:"Kas", payment_status:"Lunas", created_at:"2026-07-27T14:30:00+07:00" }
];

async function seedLocalCategories() {
  let categories = localRead(LOCAL_KEYS.categories, []);
  if (!categories.length) {
    categories = DEFAULT_CATEGORIES.map(c => ({ ...c, created_at: new Date().toISOString() }));
    localWrite(LOCAL_KEYS.categories, categories);
  }

  // Seed demo transactions only when local storage has no transaction data yet.
  // Once the user starts editing data, the seed is not re-applied.
  const transactions = localRead(LOCAL_KEYS.transactions, null);
  if (transactions === null) {
    localWrite(LOCAL_KEYS.transactions, DEMO_TRANSACTIONS);
  }

  return categories;
}

/**
 * Contoh data awal untuk mode lokal. Hanya dimasukkan ketika belum ada
 * transaksi tersimpan, sehingga tidak menimpa data pengguna.
 */
async function seedLocalTransactions(categories) {
  let transactions = localRead(LOCAL_KEYS.transactions, null);
  if (transactions !== null) return transactions;

  const byName = (name) => categories.find(c => c.name === name)?.id;
  const year = new Date().getFullYear();
  const month = new Date().getMonth();
  const date = (monthOffset, day) => {
    const d = new Date(year, month + monthOffset, day);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const samples = [
    ["BKK-DEMO-001", date(0, 2), "Biaya Utilitas", "Umum", "Pembayaran tagihan listrik area kos", 1250000, "Transfer Bank", "Lunas"],
    ["BKK-DEMO-002", date(0, 4), "Biaya Utilitas", "Umum", "Tagihan air PDAM", 385000, "Transfer Bank", "Lunas"],
    ["BKK-DEMO-003", date(0, 5), "Biaya Kebersihan & Keamanan", "Umum", "Honor petugas kebersihan", 750000, "Kas", "Lunas"],
    ["BKK-DEMO-004", date(0, 7), "Biaya Perlengkapan Kos", "Umum", "Pembelian sabun dan perlengkapan kamar mandi", 275000, "Kas", "Lunas"],
    ["BKK-DEMO-005", date(0, 9), "Biaya Utilitas", "Umum", "Langganan internet/Wi-Fi", 450000, "Transfer Bank", "Lunas"],
    ["BKK-DEMO-006", date(0, 11), "Biaya Pemeliharaan & Perbaikan", "Kamar 103", "Servis AC kamar 103", 425000, "Transfer Bank", "Lunas"],
    ["BKK-DEMO-007", date(0, 13), "Biaya Operasional Lainnya", "Umum", "Pembelian alat tulis dan administrasi", 95000, "Kas", "Lunas"],
    ["BKK-DEMO-008", date(0, 15), "Biaya Kebersihan & Keamanan", "Umum", "Iuran keamanan lingkungan", 200000, "Kas", "Belum Lunas"],
    ["BKK-DEMO-009", date(0, 18), "Biaya Pemeliharaan & Perbaikan", "Kamar 202", "Perbaikan keran dan saluran air", 310000, "Kas", "Lunas"],
    ["BKK-DEMO-010", date(0, 20), "Biaya Perlengkapan Kos", "Umum", "Pembelian lampu LED dan baterai remote", 180000, "Kas", "Lunas"],
    ["BKK-DEMO-011", date(-1, 3), "Biaya Utilitas", "Umum", "Tagihan listrik bulan sebelumnya", 1180000, "Transfer Bank", "Lunas"],
    ["BKK-DEMO-012", date(-1, 8), "Biaya Kebersihan & Keamanan", "Umum", "Honor penjaga kos", 750000, "Kas", "Lunas"],
    ["BKK-DEMO-013", date(-1, 14), "Biaya Pemeliharaan & Perbaikan", "Kamar 105", "Pengecatan ulang kamar 105", 850000, "Transfer Bank", "Lunas"],
    ["BKK-DEMO-014", date(-2, 6), "Biaya Utilitas", "Umum", "Tagihan air dan listrik", 1540000, "Transfer Bank", "Lunas"],
    ["BKK-DEMO-015", date(-2, 19), "Biaya Operasional Lainnya", "Umum", "Biaya administrasi bank", 25000, "Kas", "Lunas"]
  ];

  transactions = samples.map((row, index) => ({
    id: `demo-${index + 1}`,
    proof_number: row[0],
    transaction_date: row[1],
    category_id: byName(row[2]),
    unit_name: row[3],
    description: row[4],
    amount: row[5],
    payment_method: row[6],
    payment_status: row[7],
    created_at: new Date(`${row[1]}T10:00:00`).toISOString(),
    updated_at: new Date(`${row[1]}T10:00:00`).toISOString()
  })).filter(t => t.category_id);

  localWrite(LOCAL_KEYS.transactions, transactions);
  return transactions;
}

/* =========================
   CATEGORY CRUD
   ========================= */

async function fetchCategories() {
  if (!SUPABASE_ENABLED) return (await seedLocalCategories()).map(normalizeCategory);

  const { data, error } = await dbClient
    .from("expense_categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data || []).map(normalizeCategory);
}

async function createCategory(payload) {
  if (!SUPABASE_ENABLED) {
    const categories = localRead(LOCAL_KEYS.categories, []);
    const row = { id: localUuid("cat"), ...payload, created_at: new Date().toISOString() };
    categories.push(row);
    localWrite(LOCAL_KEYS.categories, categories);
    return normalizeCategory(row);
  }

  const { data, error } = await dbClient
    .from("expense_categories")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return normalizeCategory(data);
}

async function updateCategory(id, payload) {
  if (!SUPABASE_ENABLED) {
    const categories = localRead(LOCAL_KEYS.categories, []);
    const index = categories.findIndex(item => String(item.id) === String(id));
    if (index < 0) throw new Error("Kategori tidak ditemukan.");
    categories[index] = { ...categories[index], ...payload };
    localWrite(LOCAL_KEYS.categories, categories);
    return normalizeCategory(categories[index]);
  }

  const { data, error } = await dbClient
    .from("expense_categories")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return normalizeCategory(data);
}

async function deleteCategory(id) {
  if (!SUPABASE_ENABLED) {
    const transactions = localRead(LOCAL_KEYS.transactions, []);
    if (transactions.some(item => String(item.category_id) === String(id))) {
      throw new Error("Kategori sudah digunakan transaksi dan tidak dapat dihapus.");
    }
    const categories = localRead(LOCAL_KEYS.categories, []).filter(item => String(item.id) !== String(id));
    localWrite(LOCAL_KEYS.categories, categories);
    return true;
  }

  const { error } = await dbClient.from("expense_categories").delete().eq("id", id);
  if (error) throw error;
  return true;
}

/* =========================
   TRANSACTION CRUD
   ========================= */

async function fetchTransactions() {
  if (!SUPABASE_ENABLED) {
    const categories = await seedLocalCategories();
    await seedLocalTransactions(categories);
    return localRead(LOCAL_KEYS.transactions, [])
      .map(normalizeTransaction)
      .sort((a, b) => String(b.transaction_date).localeCompare(String(a.transaction_date)));
  }

  const { data, error } = await dbClient
    .from("cash_disbursements")
    .select("*")
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(normalizeTransaction);
}

async function createTransaction(payload) {
  if (!SUPABASE_ENABLED) {
    const transactions = localRead(LOCAL_KEYS.transactions, []);
    const row = {
      id: localUuid("trx"),
      ...payload,
      amount: Number(payload.amount),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    transactions.push(row);
    localWrite(LOCAL_KEYS.transactions, transactions);
    return normalizeTransaction(row);
  }

  const { data, error } = await dbClient
    .from("cash_disbursements")
    .insert({ ...payload, amount: Number(payload.amount) })
    .select()
    .single();

  if (error) throw error;
  return normalizeTransaction(data);
}

async function updateTransaction(id, payload) {
  if (!SUPABASE_ENABLED) {
    const transactions = localRead(LOCAL_KEYS.transactions, []);
    const index = transactions.findIndex(item => String(item.id) === String(id));
    if (index < 0) throw new Error("Transaksi tidak ditemukan.");
    transactions[index] = {
      ...transactions[index],
      ...payload,
      amount: Number(payload.amount),
      updated_at: new Date().toISOString()
    };
    localWrite(LOCAL_KEYS.transactions, transactions);
    return normalizeTransaction(transactions[index]);
  }

  const { data, error } = await dbClient
    .from("cash_disbursements")
    .update({ ...payload, amount: Number(payload.amount) })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return normalizeTransaction(data);
}

async function deleteTransaction(id) {
  if (!SUPABASE_ENABLED) {
    const transactions = localRead(LOCAL_KEYS.transactions, []).filter(item => String(item.id) !== String(id));
    localWrite(LOCAL_KEYS.transactions, transactions);
    return true;
  }

  const { error } = await dbClient.from("cash_disbursements").delete().eq("id", id);
  if (error) throw error;
  return true;
}

async function testSupabaseConnection() {
  if (!SUPABASE_ENABLED) {
    return { enabled: false, ok: true, message: "Mode lokal aktif" };
  }

  const { error } = await dbClient.from("expense_categories").select("id").limit(1);
  if (error) throw error;
  return { enabled: true, ok: true, message: "Terhubung ke Supabase" };
}
