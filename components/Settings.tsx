
import React, { useRef, useState } from 'react';
import { Download, Upload, Database, ShieldCheck, AlertTriangle, FileArchive, Loader2 } from 'lucide-react';
import { exportFullBackup, importFullBackup } from '../services/storage';

const Settings: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleExport = async () => {
    setIsProcessing(true);
    try {
        const blob = await exportFullBackup();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `lumina_full_archive_${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error(e);
        alert("Failed to create backup.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (confirm("Importing a backup will REPLACE your current data. This action cannot be undone. Are you sure?")) {
        setIsProcessing(true);
        try {
            const success = await importFullBackup(file);
            if (success) {
                alert("Archive imported successfully! The page will refresh.");
                window.location.reload();
            } else {
                alert("Failed to import archive. Invalid format.");
            }
        } catch (e) {
            console.error(e);
            alert("Error during import.");
        } finally {
            setIsProcessing(false);
        }
    }
    // Reset input
    event.target.value = '';
  };

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-serif font-bold text-slate-800">Settings & Data</h2>
        <p className="text-slate-500 text-sm mt-1">Manage your journal data and preferences.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
           <div className="flex items-start gap-4">
              <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                  <Database size={24} />
              </div>
              <div>
                  <h3 className="text-lg font-bold text-slate-800">Data Management</h3>
                  <p className="text-slate-500 text-sm mt-1 leading-relaxed">
                      Lumina stores your data locally in your browser for privacy. 
                      Because images and videos are large, standard JSON backups don't work well.
                      Use the <strong>Full Archive</strong> feature to save everything (text + media) into a single ZIP file.
                  </p>
              </div>
           </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-slate-200 rounded-xl p-5 hover:border-lumina-200 transition-colors">
                <div className="flex items-center gap-3 mb-3 text-slate-700 font-semibold">
                    <FileArchive size={20} className="text-lumina-500"/>
                    Full Backup
                </div>
                <p className="text-sm text-slate-500 mb-4">
                    Download a ZIP file containing your text entries AND all images, drawings, and audio.
                </p>
                <button 
                    onClick={handleExport}
                    disabled={isProcessing}
                    className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium rounded-lg border border-slate-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isProcessing ? <Loader2 className="animate-spin" size={18}/> : <Download size={18}/>}
                    {isProcessing ? 'Archiving...' : 'Download ZIP Archive'}
                </button>
            </div>

            <div className="border border-slate-200 rounded-xl p-5 hover:border-lumina-200 transition-colors">
                <div className="flex items-center gap-3 mb-3 text-slate-700 font-semibold">
                    <Upload size={20} className="text-lumina-500"/>
                    Restore Archive
                </div>
                <p className="text-sm text-slate-500 mb-4">
                    Import a previously exported .zip file to restore your journal on this device.
                </p>
                <input 
                    type="file" 
                    accept=".zip" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                />
                <button 
                    onClick={handleImportClick}
                    disabled={isProcessing}
                    className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium rounded-lg border border-slate-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isProcessing ? <Loader2 className="animate-spin" size={18}/> : <Upload size={18}/>}
                    {isProcessing ? 'Restoring...' : 'Import ZIP Archive'}
                </button>
            </div>
        </div>
        
        <div className="bg-orange-50 p-4 border-t border-orange-100 flex gap-3">
            <AlertTriangle className="text-orange-500 shrink-0" size={20} />
            <p className="text-xs text-orange-800">
                <strong>Important:</strong> Storing many large videos locally will slow down your browser. We recommend using the "Upload to YouTube" feature on videos to save space.
            </p>
        </div>
      </div>
      
      <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
             <ShieldCheck className="text-emerald-500" size={24} />
             <h3 className="font-bold text-slate-800">Privacy First</h3>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed">
              Your journal entries are private. They are stored only on this device. 
              When you use AI features (Analysis or Pattern Recognition), the text is sent to Google Gemini for processing and immediately discarded by the AI model after generating the response.
          </p>
      </div>
    </div>
  );
};

export default Settings;