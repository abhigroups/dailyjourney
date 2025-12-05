
import React, { useState, useEffect, useRef } from 'react';
import { Save, Wand2, RefreshCw, Sparkles, Lightbulb, Link2, Cloud, CheckCircle2, Image as ImageIcon, Video, PenTool, Youtube, Download, Loader2, Trash2, Mic, Square, Play, Pause, FileText, Music, ExternalLink, Upload } from 'lucide-react';
import { JournalEntry, JournalMedia } from '../types';
import { analyzeEntryWithGemini, findSimilarConnections, generateJournalImage, generateJournalVideo, transcribeAudio, generatePositiveReflection } from '../services/gemini';
import { getEntries, saveDraft, getDraft, clearDraft } from '../services/storage';
import { saveMediaBlob, getMediaBlob, blobToBase64 } from '../services/db';
import DrawingCanvas from './DrawingCanvas';
import { v4 as uuidv4 } from 'uuid';

// Simple ID generator if uuid fails or for compat
const generateId = () => Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

const PROMPTS = [
  "What made you smile today?",
  "What is a challenge you faced recently and how did you handle it?",
  "Describe a moment where you felt truly at peace.",
  "What are three things you are grateful for right now?",
  "Who has had a positive impact on your life lately?",
  "What is something you want to improve about yourself?",
  "Write about a decision you are grappling with.",
];

interface EntryEditorProps {
  onSave: (entry: JournalEntry) => void;
  initialEntry?: JournalEntry | null;
}

const EntryEditor: React.FC<EntryEditorProps> = ({ onSave, initialEntry }) => {
  const [content, setContent] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<Partial<JournalEntry> | null>(null);
  const [similarConnection, setSimilarConnection] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  
  // Media State
  const [showDrawing, setShowDrawing] = useState(false);
  const [mediaItems, setMediaItems] = useState<JournalMedia[]>([]);
  const [isGeneratingMedia, setIsGeneratingMedia] = useState<'image' | 'video' | 'reflection' | null>(null);
  const [loadedMediaUrls, setLoadedMediaUrls] = useState<Record<string, string>>({});
  
  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // YouTube State
  const [showLinkInput, setShowLinkInput] = useState<string | null>(null); // mediaId being edited
  const [linkInputValue, setLinkInputValue] = useState('');

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const [transcribingId, setTranscribingId] = useState<string | null>(null);

  // Reflection State
  const [reflection, setReflection] = useState<JournalEntry['reflection'] | undefined>(undefined);
  const [loadedReflectionUrl, setLoadedReflectionUrl] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    if (initialEntry) {
        setContent(initialEntry.content);
        if (initialEntry.isAnalyzed) {
            setAnalysisResult({
                moodScore: initialEntry.moodScore,
                moodLabel: initialEntry.moodLabel,
                keywords: initialEntry.keywords,
                summary: initialEntry.summary,
                reflectionQuestion: initialEntry.reflectionQuestion
            });
        }
        if (initialEntry.reflection) {
            setReflection(initialEntry.reflection);
            // Load reflection image blob
            getMediaBlob(initialEntry.reflection.imageId).then(blob => {
                if (blob) setLoadedReflectionUrl(URL.createObjectURL(blob));
            });
        }
        if (initialEntry.media) {
            setMediaItems(initialEntry.media);
            // Load blobs
            initialEntry.media.forEach(async (m) => {
                if (m.blobId && !m.externalUrl) {
                    const blob = await getMediaBlob(m.blobId);
                    if (blob) {
                        const url = URL.createObjectURL(blob);
                        setLoadedMediaUrls(prev => ({...prev, [m.id]: url}));
                    }
                }
            });
        }
    } else {
        const draft = getDraft();
        if (draft && draft.content && !draft.entryId) {
             if (window.confirm("You have an unsaved draft. Would you like to restore it?")) {
                 setContent(draft.content);
             } else {
                 clearDraft();
             }
        }
    }
  }, [initialEntry]);

  // Auto-save logic
  useEffect(() => {
      if (!content || (initialEntry && content === initialEntry.content)) {
          setSaveStatus('idle');
          return;
      }
      setSaveStatus('saving');
      const timer = setTimeout(() => {
          saveDraft(content, initialEntry?.id);
          setSaveStatus('saved');
      }, 1000);
      return () => clearTimeout(timer);
  }, [content, initialEntry]);

  // Audio Timer
  useEffect(() => {
      if (isRecording) {
          timerRef.current = window.setInterval(() => {
              setRecordingTime(t => t + 1);
          }, 1000);
      } else {
          if (timerRef.current) clearInterval(timerRef.current);
          setRecordingTime(0);
      }
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  const handleInspireMe = () => {
    const randomPrompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
    setContent((prev) => prev ? prev + "\n\n" + randomPrompt : randomPrompt);
  };

  const handleAnalyze = async () => {
    if (!content.trim()) return;
    setIsAnalyzing(true);
    setSimilarConnection(null);
    try {
      const pastEntries = getEntries().filter(e => e.id !== initialEntry?.id);
      const [analysis, connection] = await Promise.all([
        analyzeEntryWithGemini(content),
        pastEntries.length > 0 ? findSimilarConnections(content, pastEntries) : Promise.resolve(null)
      ]);
      setAnalysisResult(analysis);
      if (connection) setSimilarConnection(connection);
    } catch (error) {
      alert("Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addMediaBlob = async (blob: Blob, type: 'drawing' | 'image' | 'video' | 'audio', mimeType: string) => {
      const blobId = uuidv4();
      const mediaId = uuidv4();
      
      await saveMediaBlob(blobId, blob);
      
      const newMedia: JournalMedia = {
          id: mediaId,
          type,
          mimeType,
          blobId,
          createdAt: new Date().toISOString()
      };
      
      setMediaItems(prev => [...prev, newMedia]);
      setLoadedMediaUrls(prev => ({...prev, [mediaId]: URL.createObjectURL(blob)}));
      return mediaId;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          if (!file.type.startsWith('image/')) {
              alert('Please select an image file.');
              return;
          }
          await addMediaBlob(file, 'image', file.type);
      }
      // reset
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Audio Functions ---
  const startRecording = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          const chunks: BlobPart[] = [];

          mediaRecorder.ondataavailable = (e) => {
              if (e.data.size > 0) chunks.push(e.data);
          };

          mediaRecorder.onstop = async () => {
              const blob = new Blob(chunks, { type: 'audio/webm' });
              await addMediaBlob(blob, 'audio', 'audio/webm');
              stream.getTracks().forEach(track => track.stop());
          };

          mediaRecorder.start();
          setIsRecording(true);
      } catch (e) {
          console.error(e);
          alert("Could not access microphone.");
      }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
      }
  };

  const handleTranscribe = async (mediaId: string) => {
      const url = loadedMediaUrls[mediaId];
      if (!url) return;
      
      setTranscribingId(mediaId);
      try {
          const response = await fetch(url);
          const blob = await response.blob();
          const base64WithPrefix = await blobToBase64(blob);
          // Remove data:audio/xxx;base64, prefix
          const base64 = base64WithPrefix.split(',')[1];
          
          const text = await transcribeAudio(base64, blob.type);
          setContent(prev => prev + (prev ? "\n\n" : "") + "[Transcript]: " + text);
      } catch (e) {
          console.error(e);
          alert("Transcription failed.");
      } finally {
          setTranscribingId(null);
      }
  };

  // --- Generation Functions ---

  const handleGenerateImage = async () => {
      if (!content) return alert("Write something first!");
      setIsGeneratingMedia('image');
      try {
          const base64 = await generateJournalImage(content);
          // Convert base64 to blob
          const res = await fetch(`data:image/png;base64,${base64}`);
          const blob = await res.blob();
          await addMediaBlob(blob, 'image', 'image/png');
      } catch (e) {
          console.error(e);
          alert("Failed to generate art.");
      } finally {
          setIsGeneratingMedia(null);
      }
  };

  const handleGenerateVideo = async () => {
      if (!content) return alert("Write something first!");
      setIsGeneratingMedia('video');
      try {
          const base64 = await generateJournalVideo(content);
          const res = await fetch(base64.startsWith('data:') ? base64 : `data:video/mp4;base64,${base64}`);
          const blob = await res.blob();
          await addMediaBlob(blob, 'video', 'video/mp4');
      } catch (e) {
          console.error(e);
          alert("Failed to generate video.");
      } finally {
          setIsGeneratingMedia(null);
      }
  };

  const handleGenerateReflection = async () => {
      if (!content) return alert("Write something first!");
      setIsGeneratingMedia('reflection');
      try {
          const { quote, imageBase64 } = await generatePositiveReflection(content);
          
          const res = await fetch(`data:image/png;base64,${imageBase64}`);
          const blob = await res.blob();
          
          const imageId = uuidv4();
          await saveMediaBlob(imageId, blob);
          
          const newReflection = {
              quote,
              imageUrl: `data:image/png;base64,${imageBase64}`, // Just for immediate render if needed, but we use blob url usually
              imageId
          };
          
          setReflection(newReflection);
          setLoadedReflectionUrl(URL.createObjectURL(blob));
          
          // Auto-save the reflection to the entry if it's already saved
          if (initialEntry) {
              const updatedEntry: JournalEntry = {
                  ...initialEntry,
                  reflection: newReflection
              };
              onSave(updatedEntry);
          }

      } catch (e) {
          console.error(e);
          alert("Failed to generate reflection.");
      } finally {
          setIsGeneratingMedia(null);
      }
  };

  const handleDrawingSave = async (blob: Blob) => {
      await addMediaBlob(blob, 'drawing', 'image/png');
      setShowDrawing(false);
  };

  const handleSave = () => {
    if (!content.trim() && mediaItems.length === 0) return;
    
    const entry: JournalEntry = {
      id: initialEntry?.id || generateId(),
      content,
      createdAt: initialEntry?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isAnalyzed: !!analysisResult,
      media: mediaItems,
      reflection: reflection,
      ...analysisResult
    };

    onSave(entry);
    clearDraft();
    if (!initialEntry) {
        setContent('');
        setAnalysisResult(null);
        setSimilarConnection(null);
        setMediaItems([]);
        setLoadedMediaUrls({});
        setReflection(undefined);
        setLoadedReflectionUrl(null);
    }
  };

  const downloadVideo = (url: string) => {
      const a = document.createElement('a');
      a.href = url;
      a.download = `lumina-memory-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  };

  const openYouTubeUpload = (url: string) => {
      if(confirm("Lumina will download your video now. Please upload it to your channel on the YouTube Studio page that opens next.")) {
          downloadVideo(url);
          window.open('https://studio.youtube.com/channel/upload', '_blank');
      }
  };
  
  const saveYouTubeLink = (mediaId: string) => {
      if (!linkInputValue) return;
      
      // Extract video ID if it's a full URL
      let videoId = linkInputValue;
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = linkInputValue.match(regExp);
      if (match && match[2].length === 11) {
          videoId = match[2];
      }
      
      const embedUrl = `https://www.youtube.com/embed/${videoId}`;
      
      setMediaItems(prev => prev.map(item => {
          if (item.id === mediaId) {
              return { ...item, externalUrl: embedUrl };
          }
          return item;
      }));
      setShowLinkInput(null);
      setLinkInputValue('');
  };

  const deleteMedia = (id: string) => {
      if(confirm("Remove this media?")) {
          setMediaItems(prev => prev.filter(m => m.id !== id));
      }
  };

  const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 lg:p-10 h-full flex flex-col">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
           <div className="flex items-center gap-3">
               <h1 className="text-2xl font-serif font-bold text-slate-800">
                   {initialEntry ? 'Edit Entry' : 'New Entry'}
               </h1>
               {saveStatus === 'saving' && <span className="text-xs text-slate-400 animate-pulse flex items-center gap-1"><Cloud size={12}/> Saving...</span>}
               {saveStatus === 'saved' && <span className="text-xs text-green-500 flex items-center gap-1"><CheckCircle2 size={12}/> Draft saved</span>}
           </div>
           <p className="text-slate-500 text-sm mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
           {/* Media Toolbar */}
           <div className="flex bg-white border border-slate-200 rounded-lg p-1">
               <button onClick={() => setShowDrawing(!showDrawing)} className="p-2 hover:bg-slate-50 text-slate-600 rounded relative group" title="Draw">
                  <PenTool size={18} />
               </button>
               <div className="w-px bg-slate-200 mx-1"></div>
               <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-slate-50 text-slate-600 rounded relative group" title="Upload Image">
                   <Upload size={18} />
               </button>
               <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
               <div className="w-px bg-slate-200 mx-1"></div>
               <button onClick={handleGenerateImage} disabled={!!isGeneratingMedia} className="p-2 hover:bg-slate-50 text-slate-600 rounded disabled:opacity-50" title="Generate Art">
                  {isGeneratingMedia === 'image' ? <Loader2 className="animate-spin" size={18} /> : <ImageIcon size={18} />}
               </button>
               <button onClick={handleGenerateVideo} disabled={!!isGeneratingMedia} className="p-2 hover:bg-slate-50 text-slate-600 rounded disabled:opacity-50" title="Generate Memory Video">
                  {isGeneratingMedia === 'video' ? <Loader2 className="animate-spin" size={18} /> : <Video size={18} />}
               </button>
               <div className="w-px bg-slate-200 mx-1"></div>
               {isRecording ? (
                    <button onClick={stopRecording} className="p-2 bg-red-50 text-red-600 rounded flex items-center gap-2 animate-pulse">
                        <Square size={16} fill="currentColor" />
                        <span className="text-xs font-bold font-mono">{formatTime(recordingTime)}</span>
                    </button>
               ) : (
                    <button onClick={startRecording} className="p-2 hover:bg-slate-50 text-slate-600 rounded" title="Record Audio">
                        <Mic size={18} />
                    </button>
               )}
           </div>

           {!analysisResult && content.length > 20 && (
             <button onClick={handleAnalyze} disabled={isAnalyzing} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors font-medium">
               {isAnalyzing ? <RefreshCw className="animate-spin" size={18} /> : <Wand2 size={18} />}
               <span className="hidden sm:inline">Analyze</span>
             </button>
           )}
           <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-lumina-600 text-white rounded-lg hover:bg-lumina-700 transition-colors font-medium shadow-sm">
             <Save size={18} />
             <span className="hidden sm:inline">Save</span>
           </button>
        </div>
      </header>

      <div className="flex flex-1 gap-6 flex-col lg:flex-row min-h-0 overflow-y-auto lg:overflow-visible">
        <div className="flex-1 flex flex-col gap-6">
            
            {/* Positive Reflection Card (Top if exists) */}
            {(reflection || initialEntry) && (
                <div className="animate-fade-in-down">
                    {!reflection ? (
                         // Show generation button if saved but no reflection yet
                         (initialEntry || saveStatus === 'saved') && content.length > 50 && (
                             <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-xl p-1 shadow-md">
                                 <div className="bg-white rounded-lg p-4 flex items-center justify-between">
                                     <div className="flex items-center gap-3">
                                         <div className="p-2 bg-violet-100 rounded-full text-violet-600">
                                            <Sparkles size={20} />
                                         </div>
                                         <div>
                                            <h3 className="font-bold text-slate-800">Positive Reflection</h3>
                                            <p className="text-sm text-slate-500">Visualize the hope and positivity in your day.</p>
                                         </div>
                                     </div>
                                     <button 
                                        onClick={handleGenerateReflection}
                                        disabled={!!isGeneratingMedia}
                                        className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium flex items-center gap-2"
                                     >
                                        {isGeneratingMedia === 'reflection' ? <Loader2 className="animate-spin" size={16}/> : <Wand2 size={16}/>}
                                        Reflect & Visualize
                                     </button>
                                 </div>
                             </div>
                         )
                    ) : (
                         // Show actual reflection
                         <div className="relative rounded-2xl overflow-hidden shadow-lg group">
                             <div className="absolute inset-0 bg-slate-900/40 z-10 group-hover:bg-slate-900/30 transition-colors"></div>
                             {loadedReflectionUrl && <img src={loadedReflectionUrl} alt="Positive Reflection" className="w-full h-64 md:h-80 object-cover" />}
                             <div className="absolute bottom-0 left-0 right-0 p-6 z-20 bg-gradient-to-t from-slate-900/90 to-transparent">
                                 <div className="flex items-center gap-2 text-yellow-300 mb-2 font-medium text-xs uppercase tracking-wider">
                                     <Sparkles size={14} />
                                     <span>Daily Wisdom</span>
                                 </div>
                                 <p className="text-white font-serif text-xl md:text-2xl italic leading-relaxed">
                                     "{reflection.quote}"
                                 </p>
                             </div>
                         </div>
                    )}
                </div>
            )}

            {/* Drawing Area */}
            {showDrawing && (
                <div className="animate-fade-in-down">
                    <DrawingCanvas onSave={handleDrawingSave} onCancel={() => setShowDrawing(false)} />
                </div>
            )}

            {/* Media Gallery */}
            {mediaItems.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {mediaItems.map(item => (
                        <div key={item.id} className={`relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100 ${item.type === 'audio' ? 'h-24' : 'aspect-square'}`}>
                            
                            {/* Content Rendering Logic */}
                            {item.externalUrl ? (
                                // YouTube / External Embed
                                <div className="w-full h-full bg-black relative">
                                    <iframe 
                                        src={item.externalUrl} 
                                        className="w-full h-full" 
                                        title="YouTube video player" 
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                        allowFullScreen
                                    ></iframe>
                                </div>
                            ) : loadedMediaUrls[item.id] ? (
                                item.type === 'video' ? (
                                    <div className="relative w-full h-full">
                                        <video src={loadedMediaUrls[item.id]} className="w-full h-full object-cover" controls />
                                        
                                        {/* YouTube Workflow Overlay */}
                                        <div className="absolute top-2 right-2 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                             <button onClick={() => openYouTubeUpload(loadedMediaUrls[item.id])} className="p-1.5 bg-red-600 text-white rounded-full shadow hover:bg-red-700" title="Upload to YouTube">
                                                 <Youtube size={14} />
                                             </button>
                                             <button onClick={() => setShowLinkInput(item.id)} className="p-1.5 bg-white text-slate-700 rounded-full shadow hover:bg-slate-100" title="Paste YouTube Link">
                                                 <Link2 size={14} />
                                             </button>
                                        </div>

                                        {/* Input field for YouTube link */}
                                        {showLinkInput === item.id && (
                                            <div className="absolute inset-0 bg-slate-900/90 z-30 flex flex-col items-center justify-center p-4 text-center animate-fade-in">
                                                <h4 className="text-white text-sm font-bold mb-2">Save Space with YouTube</h4>
                                                <input 
                                                    type="text" 
                                                    placeholder="Paste YouTube Link..." 
                                                    value={linkInputValue}
                                                    onChange={e => setLinkInputValue(e.target.value)}
                                                    className="w-full text-sm p-2 rounded mb-2"
                                                />
                                                <div className="flex gap-2">
                                                    <button onClick={() => saveYouTubeLink(item.id)} className="bg-lumina-500 text-white text-xs px-3 py-1.5 rounded font-bold">Save Link</button>
                                                    <button onClick={() => setShowLinkInput(null)} className="text-slate-400 text-xs px-2">Cancel</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : item.type === 'audio' ? (
                                    <div className="w-full h-full flex flex-col justify-center px-3 bg-white">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-full">
                                                <Music size={14} />
                                            </div>
                                            <span className="text-xs font-bold text-slate-500 uppercase">Voice Note</span>
                                        </div>
                                        <audio src={loadedMediaUrls[item.id]} controls className="w-full h-8" />
                                        <button 
                                            onClick={() => handleTranscribe(item.id)}
                                            disabled={!!transcribingId}
                                            className="absolute top-2 right-2 p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded text-xs font-medium flex items-center gap-1"
                                            title="Transcribe to text"
                                        >
                                            {transcribingId === item.id ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                                            <span className="hidden md:inline">Transcribe</span>
                                        </button>
                                    </div>
                                ) : (
                                    <img src={loadedMediaUrls[item.id]} alt="Journal Media" className="w-full h-full object-cover" />
                                )
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400"><Loader2 className="animate-spin" /></div>
                            )}

                            {/* Delete Button */}
                            <button onClick={() => deleteMedia(item.id)} className="absolute top-2 left-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                <Trash2 size={14} />
                            </button>

                            {/* Label */}
                            {item.type !== 'audio' && (
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 pointer-events-none">
                                    <span className="text-white text-xs font-medium uppercase tracking-wider flex items-center gap-1">
                                        {item.type === 'drawing' ? <PenTool size={10}/> : item.type === 'video' ? <Video size={10}/> : <Sparkles size={10}/>}
                                        {item.externalUrl ? 'YouTube' : item.type}
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Main Text Editor */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col relative group min-h-[300px]">
                {!content && (
                    <div className="absolute top-4 right-4 z-10">
                        <button onClick={handleInspireMe} className="flex items-center gap-2 text-xs font-medium text-lumina-600 bg-lumina-50 px-3 py-1.5 rounded-full hover:bg-lumina-100 transition-colors">
                            <Lightbulb size={14} /> Inspire Me
                        </button>
                    </div>
                )}
                <textarea
                    className="w-full h-full p-8 resize-none focus:outline-none text-lg text-slate-700 leading-relaxed journal-font placeholder-slate-300 rounded-2xl"
                    placeholder="What's on your mind today? Let it flow..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                />
                <div className="absolute bottom-4 right-4 text-xs text-slate-300 group-hover:text-slate-400 transition-colors">
                    {content.length} chars
                </div>
            </div>
        </div>

        {/* AI Sidebar */}
        {analysisResult && (
           <div className="w-full lg:w-80 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-y-auto h-fit animate-fade-in-up">
              <div className="p-6 space-y-6">
                 <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                        <Sparkles size={16} className="text-lumina-500" />
                        AI Insights
                    </h3>
                    <span className="text-xs bg-lumina-100 text-lumina-700 px-2 py-1 rounded-full font-medium">
                        {analysisResult.moodLabel}
                    </span>
                 </div>
                 <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>Mood Score</span>
                        <span>{analysisResult.moodScore}/10</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className="bg-gradient-to-r from-indigo-400 to-lumina-500 h-2 rounded-full" style={{ width: `${(analysisResult.moodScore || 0) * 10}%` }}></div>
                    </div>
                 </div>
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-sm text-slate-600 italic">"{analysisResult.summary}"</p>
                 </div>
                 {similarConnection && (
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100">
                      <div className="flex items-center gap-2 mb-2 text-indigo-700">
                         <Link2 size={16} />
                         <span className="text-xs font-bold uppercase tracking-wider">Related Memory</span>
                      </div>
                      <p className="text-xs text-indigo-900 leading-relaxed">{similarConnection}</p>
                    </div>
                 )}
                 <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reflection</label>
                    <p className="mt-1 text-slate-700 text-sm">{analysisResult.reflectionQuestion}</p>
                 </div>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default EntryEditor;
