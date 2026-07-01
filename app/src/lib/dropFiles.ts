// Drag-and-drop of a folder exposes nested files only through the
// webkitGetAsEntry() directory-entry API — DataTransfer.files is flat
// and (depending on the browser) omits nested contents entirely.

function readAllEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise((resolve) => {
    const all: FileSystemEntry[] = [];
    const readBatch = () => {
      reader.readEntries((batch) => {
        if (!batch.length) return resolve(all);
        all.push(...batch);
        readBatch();
      });
    };
    readBatch();
  });
}

async function walkEntry(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    return new Promise((resolve) => (entry as FileSystemFileEntry).file((f) => resolve([f])));
  }
  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    const entries = await readAllEntries(reader);
    const nested = await Promise.all(entries.map(walkEntry));
    return nested.flat();
  }
  return [];
}

export async function filesFromDataTransfer(dt: DataTransfer): Promise<File[]> {
  const items = Array.from(dt.items || []);
  const entries = items
    .map((it) => (it.webkitGetAsEntry ? it.webkitGetAsEntry() : null))
    .filter((e): e is FileSystemEntry => !!e);

  if (entries.length) {
    const nested = await Promise.all(entries.map((e) => walkEntry(e)));
    const files = nested.flat();
    if (files.length) return files;
  }
  return Array.from(dt.files || []);
}
