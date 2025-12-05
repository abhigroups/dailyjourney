import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import EntryEditor from './components/EntryEditor';
import EntryList from './components/EntryList';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import { JournalEntry, ViewMode } from './types';
import { getEntries, saveEntry, deleteEntry } from './services/storage';

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.WRITE);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);

  useEffect(() => {
    // Load entries on mount
    setEntries(getEntries());
  }, []);

  const handleSaveEntry = (entry: JournalEntry) => {
    saveEntry(entry);
    setEntries(getEntries()); // Refresh list
    setEditingEntry(null);
    setView(ViewMode.LIST); // Go to list after save
  };

  const handleEditEntry = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setView(ViewMode.WRITE);
  };

  const handleDeleteEntry = (id: string) => {
    deleteEntry(id);
    setEntries(getEntries());
  };

  const renderContent = () => {
    switch (view) {
      case ViewMode.WRITE:
        return (
          <EntryEditor 
            onSave={handleSaveEntry} 
            initialEntry={editingEntry}
          />
        );
      case ViewMode.LIST:
        return (
          <EntryList 
            entries={entries} 
            onEdit={handleEditEntry}
            onDelete={handleDeleteEntry}
          />
        );
      case ViewMode.ANALYTICS:
        return <Dashboard entries={entries} />;
      case ViewMode.SETTINGS:
        return <Settings />;
      default:
        return <EntryList entries={entries} onEdit={handleEditEntry} onDelete={handleDeleteEntry} />;
    }
  };

  return (
    <Layout currentView={view} setView={setView}>
      {renderContent()}
    </Layout>
  );
};

export default App;