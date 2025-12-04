<script setup lang="ts">
import { defineProps, defineEmits } from "vue";

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

const props = defineProps<{
  enterprises: Enterprise[];
  selectedId: string | null;
  loading: boolean;
  error: string | null;
}>();

const emit = defineEmits<{
  (e: "select", enterprise: Enterprise): void;
}>();

function formatDate(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}
</script>

<template>
  <p v-if="loading">Chargement...</p>
  <p v-if="error" class="error">Erreur : {{ error }}</p>

  <table v-if="!loading && !error" class="table">
    <thead>
      <tr>
        <th>Nom</th>
        <th>EnterpriseNumber</th>
        <th>Status</th>
        <th>Type</th>
        <th>Date début</th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="e in enterprises"
        :key="e.enterprisenumber"
        :class="{
          row: true,
          'row--selected': selectedId === e.enterprisenumber,
        }"
        @click="emit('select', e)"
      >
        <td>{{ e.name ?? "—" }}</td>
        <td>{{ e.enterprisenumber }}</td>
        <td>{{ e.status ?? "-" }}</td>
        <td>{{ e.typeofenterprise ?? "-" }}</td>
        <td>{{ formatDate(e.startdate) }}</td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
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
  transition: background 0.15s ease;
}
.row:hover {
  background: #0f172a;
}
.row--selected {
  background: #1e3a8a;
  box-shadow: inset 0 0 0 1px #3b82f6;
}
.error {
  color: #f97373;
}
</style>
