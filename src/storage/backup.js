// Export / import of all progress as one JSON file.
export async function exportProgress(app) {
  const data = await app.exportData();
  const json = JSON.stringify(data, null, 2);
  const name = `consultant-gym-progress-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([json], name, { type: 'application/json' });

  // On iPhone the share sheet is the most reliable way to save to Files / iCloud Drive.
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: 'Consultant Gym progress' });
    app.markExported();
    return 'shared';
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  app.markExported();
  return 'downloaded';
}

export async function readJsonFile(file) {
  const text = await file.text();
  return JSON.parse(text);
}
