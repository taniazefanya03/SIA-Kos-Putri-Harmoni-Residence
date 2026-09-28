/* SIA Pengeluaran Kos - Vanilla JS SPA */

const state = {
  page: "dashboard",
  categories: [],
  transactions: [],
  filters: {
    search: "",
    category: "",
    month: "",
    status: ""
  },
  report: {
    period: "monthly",
    date: "",
    month: "",
    year: ""
  },
  deleteTargetId: null
};

const PROPERTY_PROFILE = {
  name: "Kost Harmoni Residence",
  type: "Kos Putri",
  address: "Jl. Cempaka Raya No. 18, Semarang",
  city: "Semarang, Jawa Tengah",
  phone: "0812-0000-0000",
  rooms: 24,
  facilities: ["Wi-Fi", "CCTV", "Parkir"],
  adminHours: "08.00–20.00",
  note: "Hunian nyaman · Administrasi operasional terpusat"
};

const PAGE_META = {
  dashboard: ["Dashboard", "Ringkasan pengeluaran operasional usaha kos"],
  transactions: ["Pengeluaran Kas", "Kelola transaksi bukti kas keluar"],
  reports: ["Laporan Akuntansi", "Rekap dan buku kas keluar"],
  categories: ["Kategori Biaya", "Master kategori biaya operasional"]
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function todayISO() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function monthISO() {
  return todayISO().slice(0, 7);
}

function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit", month: "short", year: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function categoryName(id) {
  return state.categories.find(c => String(c.id) === String(id))?.name || "Kategori tidak ditemukan";
}

function showToast(message, type = "success") {
  const container = $("#toast-container");
  const icon = type === "success" ? "fa-circle-check" : type === "error" ? "fa-circle-exclamation" : "fa-circle-info";
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<i class="fa-solid ${icon}"></i><span>${escapeHtml(message)}</span>`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function setLoading(button, loading, text = "Memproses...") {
  if (!button) return;
  if (loading) {
    button.dataset.originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${text}`;
  } else {
    button.disabled = false;
    button.innerHTML = button.dataset.originalText || "Simpan";
  }
}

function setConnectionStatus() {
  const pill = $("#connection-status");
  const text = $("#connection-text");
  if (SUPABASE_ENABLED) {
    pill.classList.remove("offline");
    pill.classList.add("online");
    text.textContent = "Supabase Terhubung";
  } else {
    pill.classList.remove("online");
    pill.classList.add("offline");
    text.textContent = "Mode Lokal";
  }
}

async function loadAllData() {
  try {
    const [categories, transactions] = await Promise.all([
      fetchCategories(),
      fetchTransactions()
    ]);
    state.categories = categories;
    state.transactions = transactions;
    renderAll();
  } catch (error) {
    console.error(error);
    showToast(`Gagal memuat data: ${error.message || "Kesalahan tidak diketahui"}`, "error");
  }
}

function renderAll() {
  populateCategorySelects();
  renderDashboard();
  renderTransactions();
  renderCategories();
  renderReport();
}

function navigate(page) {
  if (!PAGE_META[page]) return;
  state.page = page;

  $$(".page-section").forEach(section => {
    section.classList.toggle("hidden", section.id !== `page-${page}`);
  });

  $$(".nav-item").forEach(item => item.classList.toggle("active", item.dataset.page === page));

  $("#page-title").textContent = PAGE_META[page][0];
  $("#page-subtitle").textContent = PAGE_META[page][1];

  closeSidebar();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setupNavigation() {
  $$("[data-page]").forEach(el => {
    el.addEventListener("click", () => navigate(el.dataset.page));
  });

  $("#mobile-menu").addEventListener("click", openSidebar);
  $("#sidebar-overlay").addEventListener("click", closeSidebar);
}

function openSidebar() {
  $("#sidebar").classList.remove("-translate-x-full");
  $("#sidebar-overlay").classList.remove("hidden");
}

function closeSidebar() {
  $("#sidebar").classList.add("-translate-x-full");
  $("#sidebar-overlay").classList.add("hidden");
}

function populateCategorySelects() {
  const filter = $("#filter-category");
  const transaction = $("#transaction-category");

  const currentFilter = filter.value;
  filter.innerHTML = `<option value="">Semua Kategori</option>` +
    state.categories.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join("");
  filter.value = currentFilter;

  const currentTransaction = transaction.value;
  transaction.innerHTML = `<option value="">Pilih kategori...</option>` +
    state.categories.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join("");
  transaction.value = currentTransaction;
}

function renderDashboard() {
  const month = monthISO();
  const monthly = state.transactions.filter(t => String(t.transaction_date).startsWith(month));
  const total = monthly.reduce((sum, t) => sum + Number(t.amount), 0);

  const utilityCategory = state.categories.find(c => c.name.toLowerCase().includes("utilitas"));
  const utilityTotal = monthly
    .filter(t => utilityCategory && String(t.category_id) === String(utilityCategory.id))
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const groups = groupByCategory(monthly);
  const largest = Object.entries(groups).sort((a, b) => b[1].total - a[1].total)[0];

  $("#stat-month-total").textContent = formatRupiah(total);
  $("#stat-utility-total").textContent = formatRupiah(utilityTotal);
  $("#stat-largest-category").textContent = largest ? largest[1].name : "-";
  $("#stat-largest-amount").textContent = largest ? formatRupiah(largest[1].total) : "Rp 0";
  $("#stat-month-count").textContent = monthly.length.toLocaleString("id-ID");

  const unpaidTotal = monthly
    .filter(t => t.payment_status === "Belum Lunas")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  $("#sidebar-kos-name").textContent = PROPERTY_PROFILE.name;
  $("#sidebar-property-type").textContent = PROPERTY_PROFILE.type;
  $("#sidebar-kos-address").textContent = PROPERTY_PROFILE.city;
  $("#sidebar-full-address").textContent = PROPERTY_PROFILE.address;
  $("#hero-kos-name").textContent = PROPERTY_PROFILE.name;
  $("#hero-kos-address").textContent = PROPERTY_PROFILE.address;
  $("#overview-property-name").textContent = PROPERTY_PROFILE.name;
  $("#overview-property-address").textContent = PROPERTY_PROFILE.address;
  $("#overview-property-type").textContent = PROPERTY_PROFILE.type;
  $("#hero-month-total").textContent = formatRupiah(total);
  $("#hero-month-count").textContent = monthly.length.toLocaleString("id-ID");
  $("#hero-month-count-label").textContent = `${monthly.length.toLocaleString("id-ID")} transaksi`;
  $("#hero-utility-total").textContent = formatRupiah(utilityTotal);
  $("#hero-unpaid-total").textContent = formatRupiah(unpaidTotal);
  $("#hero-largest-category").textContent = largest ? largest[1].name.replace("Biaya ", "") : "-";
  const dashDate = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${todayISO()}T00:00:00`));
  $("#dashboard-date-label").textContent = dashDate;

  const distribution = $("#category-distribution");
  if (!monthly.length) {
    distribution.innerHTML = emptyState("fa-chart-pie", "Belum ada pengeluaran", "Belum ada transaksi pada bulan berjalan.");
  } else {
    distribution.innerHTML = Object.values(groups)
      .sort((a, b) => b.total - a.total)
      .map(group => {
        const percent = total ? (group.total / total) * 100 : 0;
        return `
          <div>
            <div class="mb-1.5 flex items-center justify-between gap-3">
              <span class="truncate text-xs font-bold text-slate-700">${escapeHtml(group.name)}</span>
              <span class="whitespace-nowrap text-xs font-extrabold text-slate-900">${formatRupiah(group.total)} <span class="font-semibold text-slate-400">(${percent.toFixed(1)}%)</span></span>
            </div>
            <div class="progress-track"><div class="progress-fill" style="width:${Math.min(percent, 100)}%"></div></div>
          </div>`;
      }).join("");
  }

  const recent = [...state.transactions]
    .sort((a, b) => `${b.transaction_date}-${b.created_at || ""}`.localeCompare(`${a.transaction_date}-${a.created_at || ""}`))
    .slice(0, 5);

  $("#recent-transactions").innerHTML = recent.length ? recent.map(t => `
    <div class="flex items-center justify-between gap-3 px-5 py-3">
      <div class="min-w-0">
        <p class="truncate text-xs font-extrabold text-slate-800">${escapeHtml(t.proof_number)}</p>
        <p class="truncate text-[11px] text-slate-400">${escapeHtml(categoryName(t.category_id))} · ${formatDate(t.transaction_date)}</p>
      </div>
      <strong class="whitespace-nowrap text-xs text-burgundy">${formatRupiah(t.amount)}</strong>
    </div>`).join("") : emptyState("fa-receipt", "Belum ada transaksi", "Transaksi baru akan muncul di sini.");
}

function groupByCategory(transactions) {
  return transactions.reduce((acc, t) => {
    const id = t.category_id || "uncategorized";
    if (!acc[id]) {
      acc[id] = { name: categoryName(id), total: 0, count: 0 };
    }
    acc[id].total += Number(t.amount);
    acc[id].count += 1;
    return acc;
  }, {});
}

function emptyState(icon, title, text) {
  return `<div class="px-5 py-10 text-center">
    <div class="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400"><i class="fa-solid ${icon}"></i></div>
    <p class="mt-3 text-sm font-bold text-slate-600">${escapeHtml(title)}</p>
    <p class="mt-1 text-xs text-slate-400">${escapeHtml(text)}</p>
  </div>`;
}

function getFilteredTransactions() {
  const { search, category, month, status } = state.filters;
  const needle = search.trim().toLowerCase();

  return state.transactions.filter(t => {
    const matchesSearch = !needle || [
      t.proof_number, t.unit_name, t.description, categoryName(t.category_id)
    ].some(v => String(v || "").toLowerCase().includes(needle));

    const matchesCategory = !category || String(t.category_id) === String(category);
    const matchesMonth = !month || String(t.transaction_date).startsWith(month);
    const matchesStatus = !status || t.payment_status === status;

    return matchesSearch && matchesCategory && matchesMonth && matchesStatus;
  });
}

function renderTransactions() {
  const list = getFilteredTransactions();
  const body = $("#transaction-table-body");

  if (!list.length) {
    body.innerHTML = `<tr><td colspan="9">${emptyState("fa-file-circle-xmark", "Tidak ada transaksi", "Sesuaikan filter atau tambahkan pengeluaran baru.")}</td></tr>`;
  } else {
    body.innerHTML = list.map(t => `
      <tr>
        <td class="font-extrabold text-slate-800">${escapeHtml(t.proof_number)}</td>
        <td>${formatDate(t.transaction_date)}</td>
        <td><span class="badge bg-emerald-50 text-emerald-800">${escapeHtml(categoryName(t.category_id))}</span></td>
        <td>${escapeHtml(t.unit_name || "Umum")}</td>
        <td class="max-w-[250px]"><span class="line-clamp-2">${escapeHtml(t.description)}</span></td>
        <td><span class="badge badge-method">${escapeHtml(t.payment_method)}</span></td>
        <td><span class="badge ${t.payment_status === "Lunas" ? "badge-paid" : "badge-unpaid"}">${escapeHtml(t.payment_status)}</span></td>
        <td class="text-right font-extrabold text-slate-900">${formatRupiah(t.amount)}</td>
        <td>
          <div class="flex justify-center gap-1">
            <button data-edit="${escapeHtml(t.id)}" class="rounded-lg p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700" title="Edit"><i class="fa-solid fa-pen"></i></button>
            <button data-delete="${escapeHtml(t.id)}" class="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700" title="Hapus"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>`).join("");
  }

  $("#transaction-count").textContent = `${list.length.toLocaleString("id-ID")} transaksi`;
  $("#transaction-total").textContent = `Total: ${formatRupiah(list.reduce((s, t) => s + Number(t.amount), 0))}`;

  $$("[data-edit]").forEach(btn => btn.addEventListener("click", () => openTransactionModal(btn.dataset.edit)));
  $$("[data-delete]").forEach(btn => btn.addEventListener("click", () => requestDelete(btn.dataset.delete)));
}

function setupTransactionFilters() {
  $("#transaction-search").addEventListener("input", e => {
    state.filters.search = e.target.value;
    renderTransactions();
  });
  $("#filter-category").addEventListener("change", e => {
    state.filters.category = e.target.value;
    renderTransactions();
  });
  $("#filter-month").addEventListener("change", e => {
    state.filters.month = e.target.value;
    renderTransactions();
  });
  $("#filter-status").addEventListener("change", e => {
    state.filters.status = e.target.value;
    renderTransactions();
  });
}

function resetTransactionForm() {
  $("#transaction-form").reset();
  $("#transaction-id").value = "";
  $("#transaction-date").value = todayISO();
  $("#payment-method").value = "Kas";
  $("#payment-status").value = "Lunas";
  $("#transaction-modal-title").textContent = "Tambah Pengeluaran";
  populateCategorySelects();
}

function openTransactionModal(id = null) {
  resetTransactionForm();
  if (id) {
    const t = state.transactions.find(item => String(item.id) === String(id));
    if (!t) return;
    $("#transaction-modal-title").textContent = "Edit Pengeluaran";
    $("#transaction-id").value = t.id;
    $("#proof-number").value = t.proof_number;
    $("#transaction-date").value = t.transaction_date;
    $("#transaction-category").value = t.category_id;
    $("#unit-name").value = t.unit_name || "";
    $("#transaction-description").value = t.description || "";
    $("#transaction-amount").value = t.amount;
    $("#payment-method").value = t.payment_method;
    $("#payment-status").value = t.payment_status;
  }
  $("#transaction-modal").classList.remove("hidden");
  setTimeout(() => $("#proof-number").focus(), 50);
}

function closeTransactionModal() {
  $("#transaction-modal").classList.add("hidden");
}

async function saveTransaction(event) {
  event.preventDefault();
  const button = event.submitter;
  const payload = {
    proof_number: $("#proof-number").value.trim(),
    transaction_date: $("#transaction-date").value,
    category_id: $("#transaction-category").value,
    unit_name: $("#unit-name").value.trim() || null,
    description: $("#transaction-description").value.trim(),
    amount: Number($("#transaction-amount").value),
    payment_method: $("#payment-method").value,
    payment_status: $("#payment-status").value
  };

  if (!payload.proof_number || !payload.transaction_date || !payload.category_id || !payload.description || payload.amount <= 0) {
    showToast("Lengkapi data wajib dan pastikan jumlah lebih dari Rp 0.", "error");
    return;
  }

  setLoading(button, true, "Menyimpan...");
  try {
    const id = $("#transaction-id").value;
    if (id) {
      await updateTransaction(id, payload);
      showToast("Transaksi berhasil diperbarui.");
    } else {
      await createTransaction(payload);
      showToast("Transaksi berhasil ditambahkan.");
    }
    closeTransactionModal();
    await loadAllData();
  } catch (error) {
    console.error(error);
    showToast(`Gagal menyimpan transaksi: ${error.message}`, "error");
  } finally {
    setLoading(button, false);
  }
}

function requestDelete(id) {
  state.deleteTargetId = id;
  $("#confirm-modal").classList.remove("hidden");
}

function closeConfirm() {
  state.deleteTargetId = null;
  $("#confirm-modal").classList.add("hidden");
}

async function confirmDelete() {
  if (!state.deleteTargetId) return;
  const button = $("#confirm-delete");
  setLoading(button, true, "Menghapus...");
  try {
    await deleteTransaction(state.deleteTargetId);
    closeConfirm();
    showToast("Transaksi berhasil dihapus.");
    await loadAllData();
  } catch (error) {
    showToast(`Gagal menghapus: ${error.message}`, "error");
  } finally {
    setLoading(button, false);
  }
}

function renderCategories() {
  const list = $("#category-list");
  if (!state.categories.length) {
    list.innerHTML = emptyState("fa-layer-group", "Belum ada kategori", "Tambahkan kategori biaya terlebih dahulu.");
    return;
  }

  list.innerHTML = state.categories.map(c => {
    const count = state.transactions.filter(t => String(t.category_id) === String(c.id)).length;
    return `
      <div class="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><i class="fa-solid fa-tag"></i></span>
            <p class="text-sm font-extrabold text-slate-800">${escapeHtml(c.name)}</p>
          </div>
          <p class="mt-1 pl-10 text-xs text-slate-400">${escapeHtml(c.description || "Tidak ada keterangan")} · ${count} transaksi</p>
        </div>
        <div class="flex gap-1">
          <button data-category-edit="${escapeHtml(c.id)}" class="btn-secondary !min-h-9 !px-3 !py-1.5 text-xs"><i class="fa-solid fa-pen"></i> Edit</button>
          <button data-category-delete="${escapeHtml(c.id)}" class="btn-secondary !min-h-9 !px-3 !py-1.5 text-xs !text-rose-700 hover:!bg-rose-50"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>`;
  }).join("");

  $$("[data-category-edit]").forEach(btn => btn.addEventListener("click", () => editCategory(btn.dataset.categoryEdit)));
  $$("[data-category-delete]").forEach(btn => btn.addEventListener("click", () => deleteCategoryHandler(btn.dataset.categoryDelete)));
}

function editCategory(id) {
  const c = state.categories.find(item => String(item.id) === String(id));
  if (!c) return;
  $("#category-id").value = c.id;
  $("#category-name").value = c.name;
  $("#category-description").value = c.description || "";
  $("#cancel-category").classList.remove("hidden");
  $("#category-name").focus();
}

function resetCategoryForm() {
  $("#category-form").reset();
  $("#category-id").value = "";
  $("#cancel-category").classList.add("hidden");
}

async function saveCategory(event) {
  event.preventDefault();
  const payload = {
    name: $("#category-name").value.trim(),
    description: $("#category-description").value.trim() || null
  };
  if (!payload.name) return showToast("Nama kategori wajib diisi.", "error");

  const id = $("#category-id").value;
  try {
    if (id) {
      await updateCategory(id, payload);
      showToast("Kategori berhasil diperbarui.");
    } else {
      await createCategory(payload);
      showToast("Kategori berhasil ditambahkan.");
    }
    resetCategoryForm();
    await loadAllData();
  } catch (error) {
    showToast(`Gagal menyimpan kategori: ${error.message}`, "error");
  }
}

async function deleteCategoryHandler(id) {
  const c = state.categories.find(item => String(item.id) === String(id));
  if (!c) return;
  if (!confirm(`Hapus kategori "${c.name}"?`)) return;

  try {
    await deleteCategory(id);
    showToast("Kategori berhasil dihapus.");
    await loadAllData();
  } catch (error) {
    showToast(`Gagal menghapus kategori: ${error.message}`, "error");
  }
}

function renderReport() {
  const period = state.report.period;
  const filtered = getReportTransactions();

  const total = filtered.reduce((sum, t) => sum + Number(t.amount), 0);
  $("#report-total").textContent = formatRupiah(total);
  $("#report-count").textContent = filtered.length.toLocaleString("id-ID");
  $("#report-average").textContent = formatRupiah(filtered.length ? total / filtered.length : 0);

  const groups = groupByCategory(filtered);
  $("#report-period-label").textContent = reportLabel();

  $("#report-category-body").innerHTML = Object.values(groups).sort((a,b) => b.total - a.total).map(group => {
    const percent = total ? group.total / total * 100 : 0;
    return `<tr>
      <td class="font-bold text-slate-800">${escapeHtml(group.name)}</td>
      <td>${group.count}</td>
      <td class="text-right font-extrabold">${formatRupiah(group.total)}</td>
      <td class="text-right">${percent.toFixed(1)}%</td>
    </tr>`;
  }).join("") || `<tr><td colspan="4">${emptyState("fa-file-invoice", "Belum ada data", "Tidak ada transaksi pada periode yang dipilih.")}</td></tr>`;

  const chronological = [...filtered].sort((a, b) =>
    String(a.transaction_date).localeCompare(String(b.transaction_date)) ||
    String(a.created_at || "").localeCompare(String(b.created_at || ""))
  );
  let accumulated = 0;
  $("#cash-book-body").innerHTML = chronological.map(t => {
    accumulated += Number(t.amount);
    return `<tr>
      <td>${formatDate(t.transaction_date)}</td>
      <td class="font-bold">${escapeHtml(t.proof_number)}</td>
      <td>${escapeHtml(t.description)}</td>
      <td class="text-right font-bold">${formatRupiah(t.amount)}</td>
      <td class="text-right font-extrabold text-burgundy">${formatRupiah(accumulated)}</td>
    </tr>`;
  }).join("") || `<tr><td colspan="5">${emptyState("fa-book", "Belum ada data", "Buku kas keluar kosong untuk periode ini.")}</td></tr>`;

  $("#report-date-wrapper").classList.toggle("hidden", period !== "daily");
  $("#report-month-wrapper").classList.toggle("hidden", period !== "monthly");
  $("#report-year-wrapper").classList.toggle("hidden", period !== "yearly");
}

function getReportTransactions() {
  const { period, date, month, year } = state.report;
  return state.transactions.filter(t => {
    const d = String(t.transaction_date);
    if (period === "daily") return date ? d === date : true;
    if (period === "yearly") return year ? d.startsWith(String(year)) : true;
    return month ? d.startsWith(month) : true;
  });
}

function reportLabel() {
  const { period, date, month, year } = state.report;
  if (period === "daily") return date ? `Tanggal ${formatDate(date)}` : "Semua tanggal";
  if (period === "yearly") return year ? `Tahun ${year}` : "Semua tahun";
  if (month) {
    const [y, m] = month.split("-");
    return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(Number(y), Number(m)-1, 1));
  }
  return "Semua bulan";
}

function setupReport() {
  $("#report-date").value = todayISO();
  $("#report-month").value = monthISO();
  $("#report-year").value = new Date().getFullYear();

  $("#report-period").addEventListener("change", e => {
    state.report.period = e.target.value;
    renderReport();
  });
  $("#report-date").addEventListener("change", e => { state.report.date = e.target.value; renderReport(); });
  $("#report-month").addEventListener("change", e => { state.report.month = e.target.value; renderReport(); });
  $("#report-year").addEventListener("change", e => { state.report.year = e.target.value; renderReport(); });
  $("#refresh-report").addEventListener("click", () => renderReport());

  state.report.date = $("#report-date").value;
  state.report.month = $("#report-month").value;
  state.report.year = $("#report-year").value;
}

function setupModal() {
  $("#add-transaction").addEventListener("click", () => openTransactionModal());
  $("#quick-add").addEventListener("click", () => {
    navigate("transactions");
    openTransactionModal();
  });
  $("#close-transaction-modal").addEventListener("click", closeTransactionModal);
  $("#cancel-transaction").addEventListener("click", closeTransactionModal);
  $("#transaction-form").addEventListener("submit", saveTransaction);
  $("#confirm-cancel").addEventListener("click", closeConfirm);
  $("#confirm-delete").addEventListener("click", confirmDelete);

  $("#transaction-modal").addEventListener("click", e => {
    if (e.target.id === "transaction-modal") closeTransactionModal();
  });
  $("#confirm-modal").addEventListener("click", e => {
    if (e.target.id === "confirm-modal") closeConfirm();
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      closeTransactionModal();
      closeConfirm();
    }
  });
}

function setupCategories() {
  $("#category-form").addEventListener("submit", saveCategory);
  $("#cancel-category").addEventListener("click", resetCategoryForm);
}

async function init() {
  $("#today-label").textContent = new Intl.DateTimeFormat("id-ID", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric"
  }).format(new Date());

  setConnectionStatus();
  setupNavigation();
  setupTransactionFilters();
  setupModal();
  setupCategories();
  setupReport();

  if (!SUPABASE_ENABLED) {
    showToast("Mode lokal aktif. Data dummy pengeluaran sudah disiapkan.", "info");
  } else {
    try {
      await testSupabaseConnection();
      showToast("Supabase berhasil terhubung.", "success");
    } catch (error) {
      console.error(error);
      showToast("Supabase gagal diakses. Periksa URL, anon key, dan schema SQL.", "error");
    }
  }

  await loadAllData();
  navigate("dashboard");
}

document.addEventListener("DOMContentLoaded", init);
