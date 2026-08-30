type DummyOptions<T> = {
  key: string;
  seedName: string;
  defaults: T[];
};

function downloadFile(filename: string, content: string, type: string) {
  if (!import.meta.client) {
    return;
  }

  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function toCsvValue(value: unknown) {
  const text = String(value ?? "").replaceAll('"', '""');
  return `"${text}"`;
}

export function useAdminDummyCollection<T extends Record<string, unknown>>(options: DummyOptions<T>) {
  const rows = ref<T[]>(structuredClone(options.defaults));
  const ready = ref(false);

  function persist() {
    if (!import.meta.client) {
      return;
    }

    localStorage.setItem(options.key, JSON.stringify(rows.value));
  }

  function hydrate() {
    if (!import.meta.client) {
      ready.value = true;
      return;
    }

    const saved = localStorage.getItem(options.key);

    if (saved) {
      try {
        rows.value = JSON.parse(saved) as T[];
      }
      catch {
        rows.value = structuredClone(options.defaults);
      }
    }

    ready.value = true;
  }

  function addRow(row: T) {
    rows.value = [structuredClone(row), ...rows.value] as T[];
    persist();
  }

  function resetRows() {
    rows.value = structuredClone(options.defaults);
    persist();
  }

  function exportCsv() {
    const headers = Object.keys(rows.value[0] || options.defaults[0] || {});
    const body = rows.value.map((row) => headers.map((header) => toCsvValue(row[header])).join(","));
    const csv = [headers.join(","), ...body].join("\n");
    downloadFile(`${options.seedName}.csv`, csv, "text/csv;charset=utf-8;");
  }

  function exportSeed() {
    const payload = {
      model: options.seedName,
      count: rows.value.length,
      data: rows.value
    };

    downloadFile(`${options.seedName}.seed.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8;");
  }

  onMounted(hydrate);

  return {
    rows,
    ready,
    addRow,
    resetRows,
    exportCsv,
    exportSeed
  };
}
