<script setup lang="ts">
import { ref, onMounted } from "vue";

interface Enterprise {
  enterpriseNumber: string;
  status: string | null;
  juridicalSituation: string | null;
  typeOfEnterprise: string | null;
  juridicalForm: string | null;
  juridicalFormCAC: string | null;
  startDate: string | null;
}

interface Establishment {
  establishmentNumber: string;
  startDate: string | null;
  enterpriseNumber: string | null;
}

const enterprises = ref<Enterprise[]>([]);
const selectedEnterprise = ref<Enterprise | null>(null);
const establishments = ref<Establishment[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// Fetch first enterprises
async function loadEnterprises() {
  try {
    loading.value = true;
    error.value = null;

    const res = await fetch(`${API_URL}/enterprises?take=50`);
    if (!res.ok) {
      throw new Error("Failed to fetch enterprises");
    }

    enterprises.value = await res.json();
  } catch (e: any) {
    error.value = e.message ?? "Unknown error";
  } finally {
    loading.value = false;
  }
}

// Fetch one enterprise details + establishments
async function selectEnterprise(ent: Enterprise) {
  try {
    selectedEnterprise.value = ent;
    establishments.value = [];
    error.value = null;

    const res = await fetch(
      `${API_URL}/enterprises/${encodeURIComponent(ent.enterpriseNumber)}`
    );
    if (!res.ok) {
      throw new Error("Failed to fetch enterprise details");
    }
    const data = await res.json();
    establishments.value = data.establishments ?? [];
  } catch (e: any) {
    error.value = e.message ?? "Unknown error";
  }
}

onMounted(() => {
  void loadEnterprises();
});
</script>

<template>
  <div class="app">
    <header class="header">
      <h1>📊 KBO – Explorateur d'entreprises</h1>
      <p class="subtitle">Backend Node + Postgres + Prisma · Front Vue 3</p>
    </header>

    <main class="layout">
      <section class="panel">
        <h2>Entreprises (50 premières)</h2>

        <p v-if="loading">Chargement...</p>
        <p v-if="error" class="error">Erreur : {{ error }}</p>

        <table v-if="!loading && !error" class="table">
          <thead>
            <tr>
              <th>EnterpriseNumber</th>
              <th>Status</th>
              <th>Type</th>
              <th>Date début</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="e in enterprises"
              :key="e.enterpriseNumber"
              :class="{
                row: true,
                'row--selected':
                  selectedEnterprise &&
                  selectedEnterprise.enterpriseNumber === e.enterpriseNumber,
              }"
              @click="selectEnterprise(e)"
            >
              <td>{{ e.enterpriseNumber }}</td>
              <td>{{ e.status ?? "-" }}</td>
              <td>{{ e.typeOfEnterprise ?? "-" }}</td>
              <td>
                {{
                  e.startDate ? new Date(e.startDate).toLocaleDateString() : "-"
                }}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="panel panel--detail">
        <h2>Détails</h2>

        <div v-if="!selectedEnterprise" class="placeholder">
          Sélectionne une entreprise à gauche.
        </div>

        <div v-else class="detail">
          <h3>{{ selectedEnterprise.enterpriseNumber }}</h3>
          <ul>
            <li>
              <strong>Status :</strong> {{ selectedEnterprise.status ?? "-" }}
            </li>
            <li>
              <strong>Situation juridique :</strong>
              {{ selectedEnterprise.juridicalSituation ?? "-" }}
            </li>
            <li>
              <strong>Type :</strong>
              {{ selectedEnterprise.typeOfEnterprise ?? "-" }}
            </li>
            <li>
              <strong>Forme juridique :</strong>
              {{ selectedEnterprise.juridicalForm ?? "-" }}
            </li>
            <li>
              <strong>Forme CAC :</strong>
              {{ selectedEnterprise.juridicalFormCAC ?? "-" }}
            </li>
            <li>
              <strong>Date de début :</strong>
              {{
                selectedEnterprise.startDate
                  ? new Date(selectedEnterprise.startDate).toLocaleDateString()
                  : "-"
              }}
            </li>
          </ul>

          <h4>Établissements</h4>
          <table v-if="establishments.length" class="table">
            <thead>
              <tr>
                <th>EstablishmentNumber</th>
                <th>Date début</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="est in establishments" :key="est.establishmentNumber">
                <td>{{ est.establishmentNumber }}</td>
                <td>
                  {{
                    est.startDate
                      ? new Date(est.startDate).toLocaleDateString()
                      : "-"
                  }}
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else class="placeholder">
            Aucun établissement trouvé pour cette entreprise.
          </p>
        </div>
      </section>
    </main>
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

/* Responsive */
@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
</style>
