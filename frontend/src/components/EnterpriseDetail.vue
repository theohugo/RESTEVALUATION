<script setup lang="ts">
import { defineProps, defineEmits } from "vue";

interface EnterpriseDetail {
  enterprisenumber: string;
  status: string | null;
  juridicalsituation: string | null;
  typeofenterprise: string | null;
  juridicalform: string | null;
  juridicalformcac: string | null;
  startdate: string | null;
  name: string | null;
  streetfr?: string | null;
  zipcode?: string | null;
  municipalityfr?: string | null;
}
interface Establishment {
  establishmentnumber: string;
  startdate: string | null;
  enterprisenumber: string | null;
}

const props = defineProps<{
  enterprise: EnterpriseDetail | null;
  establishments: Establishment[];
}>();

const emit = defineEmits<{
  (e: "edit"): void;
}>();

function formatDate(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}
</script>

<template>
  <div v-if="!enterprise" class="placeholder">
    Sélectionne une entreprise à gauche.
  </div>

  <div v-else class="detail">
    <div class="header-row">
      <h3 class="detail__title">
        {{ enterprise.name ?? "Nom inconnu" }}
        <span class="detail__id"> ({{ enterprise.enterprisenumber }}) </span>
      </h3>
      <button
        class="btn btn-subtle btn-icon"
        title="Éditer"
        @click="$emit('edit')"
      >
        <!-- pencil icon -->
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 20h4l10-10-4-4L4 16v4zM14 6l4 4"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            fill="none"
          />
        </svg>
      </button>
    </div>

    <ul>
      <li><strong>Status :</strong> {{ enterprise.status ?? "-" }}</li>
      <li>
        <strong>Situation juridique :</strong>
        {{ enterprise.juridicalsituation ?? "-" }}
      </li>
      <li><strong>Type :</strong> {{ enterprise.typeofenterprise ?? "-" }}</li>
      <li>
        <strong>Forme juridique :</strong> {{ enterprise.juridicalform ?? "-" }}
      </li>
      <li>
        <strong>Forme CAC :</strong> {{ enterprise.juridicalformcac ?? "-" }}
      </li>
      <li>
        <strong>Date de début :</strong> {{ formatDate(enterprise.startdate) }}
      </li>
      <li
        v-if="
          enterprise.streetfr || enterprise.zipcode || enterprise.municipalityfr
        "
      >
        <strong>Adresse :</strong>
        {{ enterprise.streetfr ?? "" }}
        <span
          v-if="
            enterprise.streetfr &&
            (enterprise.zipcode || enterprise.municipalityfr)
          "
          >,</span
        >
        {{ enterprise.zipcode ?? "" }} {{ enterprise.municipalityfr ?? "" }}
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
        <tr v-for="est in establishments" :key="est.establishmentnumber">
          <td>{{ est.establishmentnumber }}</td>
          <td>{{ formatDate(est.startdate) }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else class="placeholder">
      Aucun établissement trouvé pour cette entreprise.
    </p>
  </div>
</template>

<style scoped>
.placeholder {
  color: #9ca3af;
  font-size: 0.9rem;
}
.detail__title {
  margin: 0 0 0.25rem;
}
.detail__id {
  font-size: 0.85rem;
  color: #9ca3af;
}
ul {
  list-style: none;
  padding: 0;
  margin: 0 0 1rem;
}
li {
  font-size: 0.9rem;
  margin-bottom: 0.4rem;
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
.btn-subtle {
  background: #111827;
  color: #cbd5e1;
  border: 1px solid #1f2937;
}
.btn-icon {
  padding: 0.45rem;
  width: 2.1rem;
  height: 2.1rem;
  justify-content: center;
}
.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
