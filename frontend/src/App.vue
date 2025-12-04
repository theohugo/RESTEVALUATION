<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import EnterpriseList from "./components/EnterpriseList.vue";
import EnterpriseDetail from "./components/EnterpriseDetail.vue";

interface Enterprise {
  enterprisenumber: string;
  status: string | null;
  juridicalsituation: string | null;
  typeofenterprise: string | null;
  juridicalform: string | null;
  juridicalformcac: string | null;
  startdate: string | null;
  name: string | null;
}

interface EnterpriseDetail extends Enterprise {
  streetfr?: string | null;
  zipcode?: string | null;
  municipalityfr?: string | null;
}

interface Establishment {
  establishmentnumber: string;
  startdate: string | null;
  enterprisenumber: string | null;
}

const enterprises = ref<Enterprise[]>([]);
const selectedEnterprise = ref<EnterpriseDetail | null>(null);
const establishments = ref<Establishment[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const creating = ref(false);
const createForm = ref<{
  enterprisenumber: string;
  name: string | null;
  startdate: string | null;
  status: string | null;
  juridicalsituation: string | null;
  typeofenterprise: string | null;
  juridicalform: string | null;
  juridicalformcac: string | null;
}>({
  enterprisenumber: "",
  name: null,
  startdate: null,
  status: null,
  juridicalsituation: null,
  typeofenterprise: null,
  juridicalform: null,
  juridicalformcac: null,
});

const filterQuery = ref("");
const showCreateModal = ref(false);
const pageSize = ref(50);
const pageIndex = ref(0); // zero-based
const total = ref(0);

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// Fetch total count matching filter
async function loadTotal() {
  try {
    const params = new URLSearchParams();
    if (filterQuery.value.trim()) params.set("q", filterQuery.value.trim());
    const res = await fetch(
      `${API_URL}/enterprises/count?${params.toString()}`
    );
    if (!res.ok) throw new Error("Failed to fetch total");
    const data = await res.json();
    total.value = data.total ?? 0;
  } catch {
    total.value = 0;
  }
}

// Fetch enterprises with pagination and filter
async function loadEnterprises() {
  try {
    loading.value = true;
    error.value = null;

    const params = new URLSearchParams();
    params.set("take", String(pageSize.value));
    params.set("skip", String(pageIndex.value * pageSize.value));
    if (filterQuery.value.trim()) {
      params.set("q", filterQuery.value.trim());
    }

    const res = await fetch(`${API_URL}/enterprises?${params.toString()}`);
    if (!res.ok) {
      throw new Error("Failed to fetch enterprises");
    }

    const data: Enterprise[] = await res.json();
    enterprises.value = data;
  } catch (e: any) {
    error.value = e.message ?? "Unknown error";
  } finally {
    loading.value = false;
  }
}

// Convert to input date format (YYYY-MM-DD)
function toInputDate(value: string | null): string | null {
  if (!value) return null;
  // Accept 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:mm:ssZ'
  if (value.includes("T")) return value.split("T")[0];
  // Basic YYYY-MM-DD check
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// Fetch one enterprise details + establishments
async function selectEnterprise(ent: Enterprise) {
  try {
    selectedEnterprise.value = {
      ...ent,
    };
    establishments.value = [];
    error.value = null;

    const res = await fetch(
      `${API_URL}/enterprises/${encodeURIComponent(ent.enterprisenumber)}`
    );
    if (!res.ok) {
      throw new Error("Failed to fetch enterprise details");
    }
    const data = await res.json();
    // data contains enterprise + establishments + optional address fields
    const detail = data as EnterpriseDetail;
    selectedEnterprise.value = {
      ...detail,
      startdate: toInputDate(detail.startdate),
    } as EnterpriseDetail;
    establishments.value = (data.establishments ?? []).map((e: any) => ({
      ...e,
      startdate: toInputDate(e.startdate),
    }));
  } catch (e: any) {
    error.value = e.message ?? "Unknown error";
  }
}

async function saveEnterprise(
  updated: Partial<EnterpriseDetail> & { enterprisenumber: string }
) {
  try {
    loading.value = true;
    error.value = null;

    const res = await fetch(
      `${API_URL}/enterprises/${encodeURIComponent(updated.enterprisenumber)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      }
    );
    if (!res.ok) {
      throw new Error("Failed to update enterprise");
    }
    const data = await res.json();
    selectedEnterprise.value = {
      ...(data as EnterpriseDetail),
      startdate: toInputDate(data.startdate),
    } as EnterpriseDetail;

    // Update list item in enterprises
    const idx = enterprises.value.findIndex(
      (e) => e.enterprisenumber === updated.enterprisenumber
    );
    if (idx >= 0) {
      enterprises.value[idx] = {
        ...enterprises.value[idx],
        name: data.name ?? enterprises.value[idx].name,
        status: data.status,
        typeofenterprise: data.typeofenterprise,
        juridicalsituation: data.juridicalsituation,
        juridicalform: data.juridicalform,
        juridicalformcac: data.juridicalformcac,
        startdate: data.startdate,
      };
    }

    // Refresh establishments if returned
    establishments.value = (data.establishments ?? establishments.value).map(
      (e: any) => ({ ...e, startdate: toInputDate(e.startdate) })
    );
  } catch (e: any) {
    error.value = e.message ?? "Unknown error";
  } finally {
    loading.value = false;
  }
}

const createErrors = ref<string[]>([]);
const showCreateErrors = ref(false);

function nonMutatingCreateValid(): boolean {
  const f = createForm.value;
  const requiredMap: Record<string, string | null> = {
    enterprisenumber: f.enterprisenumber,
    name: f.name,
    status: f.status,
    juridicalsituation: f.juridicalsituation,
    typeofenterprise: f.typeofenterprise,
    juridicalform: f.juridicalform,
    juridicalformcac: f.juridicalformcac,
    startdate: f.startdate,
  };
  for (const val of Object.values(requiredMap)) {
    if (!val || (typeof val === "string" && val.trim() === "")) {
      return false;
    }
  }
  return true;
}
const isCreateValid = computed(() => nonMutatingCreateValid());

// Build errors only when submitting
function buildCreateErrors() {
  const f = createForm.value;
  const requiredMap: Record<string, string | null> = {
    enterprisenumber: f.enterprisenumber,
    name: f.name,
    status: f.status,
    juridicalsituation: f.juridicalsituation,
    typeofenterprise: f.typeofenterprise,
    juridicalform: f.juridicalform,
    juridicalformcac: f.juridicalformcac,
    startdate: f.startdate,
  };
  const errors: string[] = [];
  for (const [k, v] of Object.entries(requiredMap)) {
    if (!v || (typeof v === "string" && v.trim() === "")) {
      errors.push(k);
    }
  }
  createErrors.value = errors;
}

function openCreateModal() {
  // Reset state when opening
  showCreateErrors.value = false;
  createErrors.value = [];
  showCreateModal.value = true;
}

function onChangeCreateField() {
  // Hide summary while typing until next submit attempt
  if (showCreateErrors.value) {
    // Optionally rebuild live; or keep hidden until submit
    buildCreateErrors();
  }
}

async function createEnterpriseFront() {
  try {
    creating.value = true;
    error.value = null;

    // Validate before sending
    buildCreateErrors();
    showCreateErrors.value = true;
    if (createErrors.value.length > 0) {
      throw new Error("Veuillez remplir tous les champs requis.");
    }

    const res = await fetch(`${API_URL}/enterprises`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createForm.value),
    });
    if (!res.ok) {
      throw new Error("Failed to create enterprise");
    }
    const data = await res.json();

    // Prepend or update in list
    const idx = enterprises.value.findIndex(
      (e) => e.enterprisenumber === data.enterprisenumber
    );
    const listItem: Enterprise = {
      enterprisenumber: data.enterprisenumber,
      status: data.status,
      juridicalsituation: data.juridicalsituation,
      typeofenterprise: data.typeofenterprise,
      juridicalform: data.juridicalform,
      juridicalformcac: data.juridicalformcac,
      startdate: data.startdate,
      name: data.name,
    };
    if (idx >= 0) {
      enterprises.value[idx] = { ...enterprises.value[idx], ...listItem };
    } else {
      enterprises.value = [listItem, ...enterprises.value];
    }

    // Select created (normalize date for inputs)
    const detail = data as EnterpriseDetail;
    selectedEnterprise.value = {
      ...detail,
      startdate: toInputDate(detail.startdate),
    } as EnterpriseDetail;
    establishments.value = (data.establishments ?? []).map((e: any) => ({
      ...e,
      startdate: toInputDate(e.startdate),
    }));

    // Reset form and errors
    createForm.value = {
      enterprisenumber: "",
      name: null,
      startdate: null,
      status: null,
      juridicalsituation: null,
      typeofenterprise: null,
      juridicalform: null,
      juridicalformcac: null,
    };
    showCreateErrors.value = false;
    createErrors.value = [];
    showCreateModal.value = false;
  } catch (e: any) {
    error.value = e.message ?? "Unknown error";
  } finally {
    creating.value = false;
  }
}

async function createEstablishmentForSelected(payload: {
  establishmentnumber: string;
  startdate: string | null;
}) {
  if (!selectedEnterprise.value) return;
  try {
    loading.value = true;
    error.value = null;
    const res = await fetch(
      `${API_URL}/enterprises/${encodeURIComponent(
        selectedEnterprise.value.enterprisenumber
      )}/establishments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) throw new Error("Failed to create establishment");
    const created = await res.json();
    establishments.value = [
      ...establishments.value,
      { ...created, startdate: toInputDate(created.startdate) },
    ];
  } catch (e: any) {
    error.value = e.message ?? "Unknown error";
  } finally {
    loading.value = false;
  }
}

async function updateEstablishment(payload: {
  establishmentnumber: string;
  startdate: string | null;
}) {
  try {
    loading.value = true;
    error.value = null;
    const res = await fetch(
      `${API_URL}/establishments/${encodeURIComponent(
        payload.establishmentnumber
      )}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startdate: payload.startdate }),
      }
    );
    if (!res.ok) throw new Error("Failed to update establishment");
    const updated = await res.json();
    const normalized = {
      ...updated,
      startdate: toInputDate(updated.startdate),
    };
    establishments.value = establishments.value.map((e) =>
      e.establishmentnumber === normalized.establishmentnumber ? normalized : e
    );
  } catch (e: any) {
    error.value = e.message ?? "Unknown error";
  } finally {
    loading.value = false;
  }
}

async function deleteEstablishment(estNumber: string) {
  try {
    loading.value = true;
    error.value = null;
    const res = await fetch(
      `${API_URL}/establishments/${encodeURIComponent(estNumber)}`,
      { method: "DELETE" }
    );
    if (!res.ok && res.status !== 204)
      throw new Error("Failed to delete establishment");
    establishments.value = establishments.value.filter(
      (e) => e.establishmentnumber !== estNumber
    );
  } catch (e: any) {
    error.value = e.message ?? "Unknown error";
  } finally {
    loading.value = false;
  }
}

async function deleteSelectedEnterprise() {
  if (!selectedEnterprise.value) return;
  try {
    loading.value = true;
    error.value = null;
    const id = selectedEnterprise.value.enterprisenumber;
    const res = await fetch(
      `${API_URL}/enterprises/${encodeURIComponent(id)}`,
      { method: "DELETE" }
    );
    if (!res.ok && res.status !== 204)
      throw new Error("Failed to delete enterprise");
    // Remove from list and clear selection
    enterprises.value = enterprises.value.filter(
      (e) => e.enterprisenumber !== id
    );
    selectedEnterprise.value = null;
    establishments.value = [];
    // Refresh total and current page content
    await loadTotal();
    void loadEnterprises();
  } catch (e: any) {
    error.value = e.message ?? "Unknown error";
  } finally {
    loading.value = false;
  }
}

// Debounce filter changes to call backend and reset to first page
let filterTimer: number | undefined;
watch(filterQuery, () => {
  if (filterTimer) clearTimeout(filterTimer);
  filterTimer = window.setTimeout(async () => {
    pageIndex.value = 0;
    await loadTotal();
    void loadEnterprises();
  }, 300);
});

// React to page size changes
watch(pageSize, async () => {
  pageIndex.value = 0;
  await loadTotal();
  void loadEnterprises();
});

// React to page index changes
watch(pageIndex, () => {
  void loadEnterprises();
});

onMounted(async () => {
  await loadTotal();
  void loadEnterprises();
});

function onSelectEnterprise(ent: Enterprise) {
  void selectEnterprise(ent);
}

function prevPage() {
  if (pageIndex.value > 0) pageIndex.value--;
}
function nextPage() {
  const maxPage = Math.max(0, Math.ceil(total.value / pageSize.value) - 1);
  if (pageIndex.value < maxPage) pageIndex.value++;
}

async function saveAddress(payload: {
  streetfr: string | null;
  zipcode: string | null;
  municipalityfr: string | null;
}) {
  if (!selectedEnterprise.value) return;
  try {
    loading.value = true;
    error.value = null;

    const res = await fetch(
      `${API_URL}/enterprises/${encodeURIComponent(
        selectedEnterprise.value.enterprisenumber
      )}/address`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) throw new Error("Failed to save address");
    const data = await res.json();

    // Normalize and set selected enterprise + establishments
    const detail = data as EnterpriseDetail;
    selectedEnterprise.value = {
      ...detail,
      startdate: toInputDate(detail.startdate),
    } as EnterpriseDetail;
    establishments.value = (data.establishments ?? []).map((e: any) => ({
      ...e,
      startdate: toInputDate(e.startdate),
    }));

    // Also update the list item if present
    const idx = enterprises.value.findIndex(
      (e) => e.enterprisenumber === detail.enterprisenumber
    );
    if (idx >= 0) {
      enterprises.value[idx] = {
        ...enterprises.value[idx],
        startdate: detail.startdate,
        name: detail.name,
        status: detail.status,
        typeofenterprise: detail.typeofenterprise,
        juridicalsituation: detail.juridicalsituation,
        juridicalform: detail.juridicalform,
        juridicalformcac: detail.juridicalformcac,
      };
    }
  } catch (e: any) {
    error.value = e.message ?? "Unknown error";
  } finally {
    loading.value = false;
  }
}

// Edit modal state
const showEditModal = ref(false);
const editEnterpriseForm = ref<{
  enterprisenumber: string;
  name: string | null;
  status: string | null;
  juridicalsituation: string | null;
  typeofenterprise: string | null;
  juridicalform: string | null;
  juridicalformcac: string | null;
  startdate: string | null;
}>({
  enterprisenumber: "",
  name: null,
  status: null,
  juridicalsituation: null,
  typeofenterprise: null,
  juridicalform: null,
  juridicalformcac: null,
  startdate: null,
});
const editAddressForm = ref<{
  streetfr: string | null;
  zipcode: string | null;
  municipalityfr: string | null;
}>({
  streetfr: null,
  zipcode: null,
  municipalityfr: null,
});
const editEstablishments = ref<Establishment[]>([]);
const estCreateForm = ref<{
  establishmentnumber: string;
  startdate: string | null;
}>({
  establishmentnumber: "",
  startdate: null,
});

function openEditModal() {
  if (!selectedEnterprise.value) return;
  const e = selectedEnterprise.value;
  editEnterpriseForm.value = {
    enterprisenumber: e.enterprisenumber,
    name: e.name ?? null,
    status: e.status ?? null,
    juridicalsituation: e.juridicalsituation ?? null,
    typeofenterprise: e.typeofenterprise ?? null,
    juridicalform: e.juridicalform ?? null,
    juridicalformcac: e.juridicalformcac ?? null,
    startdate: toInputDate(e.startdate),
  };
  editAddressForm.value = {
    streetfr: e.streetfr ?? null,
    zipcode: e.zipcode ?? null,
    municipalityfr: e.municipalityfr ?? null,
  };
  editEstablishments.value = establishments.value.map((est) => ({
    ...est,
    startdate: toInputDate(est.startdate),
  }));
  estCreateForm.value = { establishmentnumber: "", startdate: null };
  showEditModal.value = true;
}

async function saveEnterpriseInModal() {
  await saveEnterprise({ ...editEnterpriseForm.value });
}

async function saveAddressInModal() {
  await saveAddress({ ...editAddressForm.value });
}

async function createEstInModal() {
  if (!estCreateForm.value.establishmentnumber) return;
  await createEstablishmentForSelected({ ...estCreateForm.value });
  // sync local list from global state
  editEstablishments.value = establishments.value.map((e) => ({ ...e }));
  estCreateForm.value = { establishmentnumber: "", startdate: null };
}

async function updateEstInModal(est: Establishment) {
  await updateEstablishment({
    establishmentnumber: est.establishmentnumber,
    startdate: est.startdate,
  });
  editEstablishments.value = establishments.value.map((e) => ({ ...e }));
}

async function deleteEstInModal(num: string) {
  await deleteEstablishment(num);
  editEstablishments.value = establishments.value.map((e) => ({ ...e }));
}

function clearSearch() {
  filterQuery.value = "";
}
</script>

<template>
  <div class="app">
    <header class="header">
      <h1>📊 KBO – Explorateur d'entreprises</h1>
      <p class="subtitle">Backend Node + Postgres · Front Vue 3</p>
    </header>

    <main class="layout">
      <section class="panel">
        <h2>Entreprises</h2>

        <!-- Toolbar: filter + create -->
        <div class="toolbar">
          <div class="searchbar">
            <span class="searchbar__icon" aria-hidden="true">
              <!-- search icon -->
              <svg width="16" height="16" viewBox="0 0 24 24">
                <circle
                  cx="11"
                  cy="11"
                  r="7"
                  stroke="currentColor"
                  stroke-width="2"
                  fill="none"
                />
                <path
                  d="M20 20l-3.5-3.5"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            </span>
            <input
              class="searchbar__input"
              v-model="filterQuery"
              placeholder="Filtrer par nom ou numéro"
              autocomplete="off"
            />
            <button
              class="btn btn-subtle btn-icon searchbar__clear"
              v-if="filterQuery"
              @click="clearSearch"
              title="Effacer"
            >
              <!-- close icon -->
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M6 6l12 12M6 18L18 6"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </div>

          <div class="pager">
            <label class="pager__label">Page size</label>
            <select class="input" v-model.number="pageSize">
              <option :value="25">25</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
            <button
              class="button"
              @click="prevPage"
              :disabled="pageIndex === 0"
            >
              Préc.
            </button>
            <button
              class="button"
              @click="nextPage"
              :disabled="pageIndex + 1 >= Math.ceil(total / pageSize)"
            >
              Suiv.
            </button>
            <span class="pager__info">
              Page {{ pageIndex + 1 }} /
              {{ Math.max(1, Math.ceil(total / pageSize)) }} ·
              {{ total }} résultats
            </span>
          </div>
          <button class="button" @click="openCreateModal">Créer</button>
        </div>

        <EnterpriseList
          :enterprises="enterprises"
          :selected-id="selectedEnterprise?.enterprisenumber ?? null"
          :loading="loading"
          :error="error"
          @select="onSelectEnterprise"
        />
      </section>

      <section class="panel panel--detail">
        <h2>Détails</h2>

        <EnterpriseDetail
          :enterprise="selectedEnterprise"
          :establishments="establishments"
          @edit="openEditModal"
        />
        <div v-if="selectedEnterprise" class="delete-enterprise">
          <button
            class="btn btn-danger btn-icon"
            @click="deleteSelectedEnterprise"
            title="Supprimer l'entreprise"
          >
            <!-- trash icon -->
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M9 3h6m-9 4h12m-1 0-1 13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7m3 4v7m6-7v7"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>
      </section>
    </main>

    <!-- Create enterprise modal -->
    <div
      v-if="showCreateModal"
      class="modal__backdrop"
      @click.self="showCreateModal = false"
    >
      <div class="modal">
        <div class="modal__header">
          <h3>Créer une entreprise</h3>
          <button
            class="btn btn-icon btn-subtle"
            @click="showCreateModal = false"
            title="Fermer"
          >
            <!-- close icon -->
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M6 6l12 12M6 18L18 6"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>

        <!-- Inline validation summary (only after submit attempt) -->
        <div v-if="showCreateErrors && createErrors.length" class="form-errors">
          <strong>Champs requis manquants:</strong>
          <ul>
            <li v-for="f in createErrors" :key="f">{{ f }}</li>
          </ul>
        </div>

        <div class="form-grid">
          <label
            >Numéro
            <input
              class="input"
              v-model="createForm.enterprisenumber"
              @input="onChangeCreateField"
              placeholder="EnterpriseNumber"
              autocomplete="off"
              required
            />
          </label>
          <label
            >Nom (FR)
            <input
              class="input"
              v-model="createForm.name"
              @input="onChangeCreateField"
              placeholder="Nom (FR)"
              autocomplete="off"
              required
            />
          </label>
          <label
            >Status
            <input
              class="input"
              v-model="createForm.status"
              @input="onChangeCreateField"
              placeholder="Status"
              autocomplete="off"
              required
            />
          </label>
          <label
            >Situation juridique
            <input
              class="input"
              v-model="createForm.juridicalsituation"
              @input="onChangeCreateField"
              placeholder="Situation juridique"
              autocomplete="off"
              required
            />
          </label>
          <label
            >Type
            <input
              class="input"
              v-model="createForm.typeofenterprise"
              @input="onChangeCreateField"
              placeholder="Type"
              autocomplete="off"
              required
            />
          </label>
          <label
            >Forme juridique
            <input
              class="input"
              v-model="createForm.juridicalform"
              @input="onChangeCreateField"
              placeholder="Forme juridique"
              autocomplete="off"
              required
            />
          </label>
          <label
            >Forme CAC
            <input
              class="input"
              v-model="createForm.juridicalformcac"
              @input="onChangeCreateField"
              placeholder="Forme CAC"
              autocomplete="off"
              required
            />
          </label>
          <label
            >Date de début
            <input
              class="input"
              v-model="createForm.startdate"
              @input="onChangeCreateField"
              type="date"
              required
            />
          </label>
        </div>
        <div class="modal__actions">
          <button class="btn btn-subtle" @click="showCreateModal = false">
            Annuler
          </button>
          <button
            class="btn btn-primary"
            :disabled="creating || !isCreateValid"
            @click="createEnterpriseFront"
          >
            {{ creating ? "Création..." : "Créer" }}
          </button>
        </div>
      </div>
    </div>

    <!-- Edit enterprise modal -->
    <div
      v-if="showEditModal"
      class="modal__backdrop"
      @click.self="showEditModal = false"
    >
      <div class="modal modal--wide">
        <div class="modal__header">
          <h3>Modifier l'entreprise</h3>
          <button
            class="btn btn-icon btn-subtle"
            @click="showEditModal = false"
            title="Fermer"
          >
            <!-- close icon -->
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M6 6l12 12M6 18L18 6"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>

        <div class="edit-grid">
          <!-- Enterprise section -->
          <section>
            <h4>Entreprise</h4>
            <div class="form-grid">
              <label
                >Nom<input
                  class="input"
                  v-model="editEnterpriseForm.name"
                  placeholder="Nom"
              /></label>
              <label
                >Status<input
                  class="input"
                  v-model="editEnterpriseForm.status"
                  placeholder="Status"
              /></label>
              <label
                >Situation juridique<input
                  class="input"
                  v-model="editEnterpriseForm.juridicalsituation"
                  placeholder="Situation juridique"
              /></label>
              <label
                >Type<input
                  class="input"
                  v-model="editEnterpriseForm.typeofenterprise"
                  placeholder="Type"
              /></label>
              <label
                >Forme juridique<input
                  class="input"
                  v-model="editEnterpriseForm.juridicalform"
                  placeholder="Forme juridique"
              /></label>
              <label
                >Forme CAC<input
                  class="input"
                  v-model="editEnterpriseForm.juridicalformcac"
                  placeholder="Forme CAC"
              /></label>
              <label
                >Date de début<input
                  class="input"
                  type="date"
                  v-model="editEnterpriseForm.startdate"
              /></label>
            </div>
            <div class="modal__actions">
              <button
                class="btn btn-primary"
                :disabled="loading"
                @click="saveEnterpriseInModal"
              >
                {{ loading ? "Enregistrement..." : "Enregistrer l'entreprise" }}
              </button>
            </div>
          </section>

          <div class="section-divider" aria-hidden="true"></div>
          <div class="section-divider__label">Adresse</div>

          <!-- Address section -->
          <section>
            <h4>Adresse (FR)</h4>
            <div class="form-grid">
              <label
                >Rue (FR)<input
                  class="input"
                  v-model="editAddressForm.streetfr"
                  placeholder="Rue"
              /></label>
              <label
                >Code postal<input
                  class="input"
                  v-model="editAddressForm.zipcode"
                  placeholder="Code postal"
              /></label>
              <label
                >Commune<input
                  class="input"
                  v-model="editAddressForm.municipalityfr"
                  placeholder="Commune"
              /></label>
            </div>
            <div class="modal__actions">
              <button
                class="btn btn-primary"
                :disabled="loading"
                @click="saveAddressInModal"
              >
                {{ loading ? "Enregistrement..." : "Enregistrer l'adresse" }}
              </button>
            </div>
          </section>

          <!-- Establishments section -->
          <section class="est-section">
            <h4>Établissements</h4>

            <div class="est-create">
              <input
                class="input"
                v-model="estCreateForm.establishmentnumber"
                placeholder="N° établissement"
              />
              <input
                class="input"
                type="date"
                v-model="estCreateForm.startdate"
              />
              <button
                class="btn btn-primary"
                :disabled="loading || !estCreateForm.establishmentnumber"
                @click="createEstInModal"
              >
                {{ loading ? "Ajout..." : "Ajouter" }}
              </button>
            </div>

            <table v-if="editEstablishments.length" class="table">
              <thead>
                <tr>
                  <th>EstablishmentNumber</th>
                  <th>Date début</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="est in editEstablishments"
                  :key="est.establishmentnumber"
                >
                  <td>{{ est.establishmentnumber }}</td>
                  <td>
                    <input class="input" type="date" v-model="est.startdate" />
                  </td>
                  <td class="cell-actions">
                    <button
                      class="btn btn-subtle btn-icon"
                      :disabled="loading"
                      @click="updateEstInModal(est)"
                      title="Mettre à jour"
                    >
                      <!-- save icon -->
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          d="M5 12l5 5L20 7"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          fill="none"
                        />
                      </svg>
                    </button>
                    <button
                      class="btn btn-danger btn-icon"
                      :disabled="loading"
                      @click="deleteEstInModal(est.establishmentnumber)"
                      title="Supprimer"
                    >
                      <!-- trash icon -->
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M9 3h6m-9 4h12m-1 0-1 13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7m3 4v7m6-7v7"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                        />
                      </svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-else class="placeholder">Aucun établissement.</p>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  background: #0f172a;
  color: #e5e7eb;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
  padding: 1.5rem;
  box-sizing: border-box;
}

.header {
  margin-bottom: 1.5rem;
}

.header h1 {
  font-size: 1.8rem;
  margin: 0 0 0.25rem;
}

.subtitle {
  margin: 0;
  color: #9ca3af;
  font-size: 0.95rem;
}

.layout {
  display: grid;
  grid-template-columns: 2fr 1.5fr;
  gap: 1.5rem;
}

.panel {
  background: #020617;
  border-radius: 0.75rem;
  padding: 1rem;
  border: 1px solid #1f2937;
  overflow: hidden;
}

.panel h2 {
  margin-top: 0;
  margin-bottom: 0.75rem;
  font-size: 1.1rem;
}

.panel--detail {
  max-height: 80vh;
  overflow: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.table th,
.table td {
  padding: 0.4rem 0.5rem;
  border-bottom: 1px solid #1f2937;
}

.table th {
  text-align: left;
  background: #111827;
  position: sticky;
  top: 0;
}

.row {
  cursor: pointer;
}

.row:hover {
  background: #1f2937;
}

.row--selected {
  background: #1e3a8a;
}

.error {
  color: #f97373;
}

.placeholder {
  color: #9ca3af;
  font-size: 0.9rem;
}

.detail h3 {
  margin: 0 0 0.5rem;
}

.detail__id {
  font-size: 0.85rem;
  color: #9ca3af;
}

.detail ul {
  list-style: none;
  padding: 0;
  margin: 0 0 1rem;
}

.detail li {
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}

.detail h4 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  font-size: 1rem;
}

.create {
  display: grid;
  grid-template-columns: 1fr 1fr auto auto;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.input {
  background: #0b1220;
  border: 1px solid #1f2937;
  color: #e5e7eb;
  padding: 0.35rem 0.5rem;
  border-radius: 0.4rem;
}

.button {
  background: #2563eb;
  color: white;
  border: none;
  padding: 0.5rem 0.75rem;
  border-radius: 0.4rem;
  cursor: pointer;
}

.button[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Toolbar */
.toolbar {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}
.pager {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.pager__label {
  color: #9ca3af;
  font-size: 0.85rem;
}
.pager__info {
  color: #9ca3af;
  font-size: 0.85rem;
}

/* Modal */
.modal__backdrop {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.8);
  display: grid;
  place-items: center;
  z-index: 50;
}
.modal {
  background: #020617;
  border: 1px solid #1f2937;
  border-radius: 0.75rem;
  padding: 1rem;
  width: min(520px, 92vw);
}
.modal--wide {
  width: min(900px, 96vw);
}
.modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}
.modal__form {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 0.5rem;
  margin: 0.75rem 0;
}
.modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

/* Edit modal specific */
.edit-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
@media (min-width: 900px) {
  .edit-grid {
    grid-template-columns: 1fr 1fr;
  }
  .est-section {
    grid-column: 1 / -1;
  }
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}
.form-grid label {
  display: grid;
  gap: 0.25rem;
  font-size: 0.9rem;
  color: #cbd5e1;
}
.est-create {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.cell-actions {
  display: flex;
  gap: 0.5rem;
}

/* Responsive */
@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
  }
}

.delete-enterprise {
  margin-top: 0.75rem;
}

.section-divider {
  height: 1px;
  background: #1f2937;
  margin: 0.5rem 0;
  grid-column: 1 / -1;
}
.section-divider__label {
  color: #9ca3af;
  font-size: 0.85rem;
  margin-top: -0.25rem;
  margin-bottom: 0.25rem;
  grid-column: 1 / -1;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border: none;
  border-radius: 0.5rem;
  padding: 0.45rem 0.7rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.15s ease, opacity 0.2s ease, transform 0.05s ease;
}
.btn:hover {
  transform: translateY(-1px);
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #2563eb;
  color: #fff;
}
.btn-primary:hover {
  background: #1d4ed8;
}

.btn-subtle {
  background: #111827;
  color: #cbd5e1;
  border: 1px solid #1f2937;
}
.btn-subtle:hover {
  background: #0b1220;
}

.btn-danger {
  background: #dc2626;
  color: #fff;
}
.btn-danger:hover {
  background: #b91c1c;
}

.btn-icon {
  padding: 0.45rem;
  width: 2.1rem;
  height: 2.1rem;
  justify-content: center;
}

/* Toolbar spacing */
.toolbar {
  align-items: center;
}
.toolbar .button,
.toolbar .btn {
  height: 2.1rem;
}

/* Modal header improvements */
.modal__header h3 {
  margin: 0;
}
.modal__header .btn-icon {
  background: transparent;
}
.modal__header .btn-icon:hover {
  background: #0b1220;
}

/* Table action cell */
.cell-actions {
  display: flex;
  gap: 0.4rem;
}

/* Delete button margin area */
.delete-enterprise {
  margin-top: 0.75rem;
}

/* Searchbar */
.searchbar {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.4rem;
  background: #0b1220;
  border: 1px solid #1f2937;
  border-radius: 0.5rem;
  padding: 0.25rem 0.4rem;
  max-width: 420px;
}
.searchbar__icon {
  color: #9ca3af;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.searchbar__input {
  background: transparent;
  border: none;
  outline: none;
  color: #e5e7eb;
  font-size: 0.95rem;
  padding: 0.3rem 0.2rem;
}
.searchbar__input::placeholder {
  color: #6b7280;
}
.searchbar__clear {
  color: #cbd5e1;
}

/* Align toolbar items nicely */
.toolbar {
  align-items: center;
  grid-template-columns: auto 1fr auto;
}

.form-errors {
  background: #1f2937;
  border: 1px solid #374151;
  color: #fca5a5;
  padding: 0.5rem;
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
}
.form-errors ul {
  margin: 0.25rem 0 0;
  padding-left: 1rem;
}
</style>
