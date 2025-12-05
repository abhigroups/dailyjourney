
import { JournalEntry, PatternAnalysis, LifeJourneyAnalysis } from '../types';
import JSZip from 'jszip';
import { getMediaBlob, saveMediaBlob } from './db';

const STORAGE_KEY = 'lumina_journal_entries';
const ANALYSIS_KEY = 'lumina_pattern_analysis';
const JOURNEY_REPORT_KEY = 'lumina_journey_report';
const DRAFT_KEY = 'lumina_current_draft';

export const saveEntry = (entry: JournalEntry): void => {
  const entries = getEntries();
  const existingIndex = entries.findIndex(e => e.id === entry.id);
  
  if (existingIndex >= 0) {
    entries[existingIndex] = entry;
  } else {
    entries.unshift(entry);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
};

export const getEntries = (): JournalEntry[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load entries", e);
    return [];
  }
};

export const deleteEntry = (id: string): void => {
  const entries = getEntries().filter(e => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
};

export const savePatternAnalysis = (analysis: PatternAnalysis): void => {
  localStorage.setItem(ANALYSIS_KEY, JSON.stringify(analysis));
};

export const getPatternAnalysis = (): PatternAnalysis | null => {
  try {
    const data = localStorage.getItem(ANALYSIS_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
};

export const saveLifeJourneyAnalysis = (analysis: LifeJourneyAnalysis): void => {
  localStorage.setItem(JOURNEY_REPORT_KEY, JSON.stringify(analysis));
};

export const getLifeJourneyAnalysis = (): LifeJourneyAnalysis | null => {
  try {
    const data = localStorage.getItem(JOURNEY_REPORT_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
};

// --- Auto-Save / Draft Features ---

export const saveDraft = (content: string, entryId?: string): void => {
  const draftData = {
    content,
    entryId: entryId || null,
    timestamp: Date.now()
  };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
};

export const getDraft = (): { content: string, entryId: string | null, timestamp: number } | null => {
  try {
    const data = localStorage.getItem(DRAFT_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const clearDraft = (): void => {
  localStorage.removeItem(DRAFT_KEY);
};

// --- Full Archive Backup & Restore (ZIP) ---

export const exportFullBackup = async (): Promise<Blob> => {
  const zip = new JSZip();
  const entries = getEntries();
  
  // 1. Add Data JSON
  const dataObject = {
    version: 1,
    exportedAt: new Date().toISOString(),
    entries,
    analysis: getPatternAnalysis(),
    journeyReport: getLifeJourneyAnalysis()
  };
  zip.file("journal_data.json", JSON.stringify(dataObject, null, 2));

  // 2. Add Media Files
  const mediaFolder = zip.folder("media");
  if (mediaFolder) {
    const mediaPromises: Promise<void>[] = [];

    // Collect all referenced blob IDs
    const blobIds = new Set<string>();
    entries.forEach(entry => {
      if (entry.reflection?.imageId) blobIds.add(entry.reflection.imageId);
      entry.media?.forEach(m => {
        if (m.blobId) blobIds.add(m.blobId);
      });
    });

    // Fetch and add each blob to zip
    blobIds.forEach(id => {
      mediaPromises.push(
        getMediaBlob(id).then(blob => {
          if (blob) {
            // We assume extension based on type, but for blobs just saving with ID is safer 
            // The MIME type is stored in JSON, so we can reconstruct later
            mediaFolder.file(id, blob); 
          }
        })
      );
    });

    await Promise.all(mediaPromises);
  }

  return await zip.generateAsync({ type: "blob" });
};

export const importFullBackup = async (zipFile: File): Promise<boolean> => {
  try {
    const zip = await JSZip.loadAsync(zipFile);
    
    // 1. Read Data JSON
    const jsonFile = zip.file("journal_data.json");
    if (!jsonFile) throw new Error("Invalid backup: missing journal_data.json");
    
    const jsonStr = await jsonFile.async("string");
    const data = JSON.parse(jsonStr);

    // 2. Restore LocalStorage
    if (data.entries) localStorage.setItem(STORAGE_KEY, JSON.stringify(data.entries));
    if (data.analysis) localStorage.setItem(ANALYSIS_KEY, JSON.stringify(data.analysis));
    if (data.journeyReport) localStorage.setItem(JOURNEY_REPORT_KEY, JSON.stringify(data.journeyReport));

    // 3. Restore Media to IndexedDB
    const mediaFolder = zip.folder("media");
    if (mediaFolder) {
      const mediaPromises: Promise<void>[] = [];
      
      mediaFolder.forEach((relativePath, file) => {
        // relativePath is the blobId
        const promise = file.async("blob").then(blob => {
          return saveMediaBlob(relativePath, blob);
        });
        mediaPromises.push(promise);
      });

      await Promise.all(mediaPromises);
    }

    return true;
  } catch (e) {
    console.error("Backup restore failed", e);
    return false;
  }
};

export const calculateStreak = (entries: JournalEntry[]): number => {
  if (entries.length === 0) return 0;
  
  // simple daily streak logic
  const sorted = [...entries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  let streak = 0;
  const today = new Date().setHours(0,0,0,0);
  
  // Check if there is an entry today
  const lastEntryDate = new Date(sorted[0].createdAt).setHours(0,0,0,0);
  if (lastEntryDate === today) {
    streak = 1;
  } else if (today - lastEntryDate > 86400000) {
    // If last entry was before yesterday, streak is broken (unless we want to be lenient)
    return 0;
  }

  let currentDate = lastEntryDate;

  for (let i = 1; i < sorted.length; i++) {
    const entryDate = new Date(sorted[i].createdAt).setHours(0,0,0,0);
    const diff = currentDate - entryDate;
    
    if (diff === 0) continue; // Same day entry
    if (diff === 86400000) { // Exactly one day gap
      streak++;
      currentDate = entryDate;
    } else {
      break;
    }
  }
  return streak;
};