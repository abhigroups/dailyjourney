
import React, { useState, useMemo } from 'react';
import { JournalEntry } from '../types';
import { Search, Smile, Trash2, Edit3, ChevronDown, Sparkles, Tag, Zap, ListTodo, Check, CalendarClock } from 'lucide-react';

interface EntryListProps {
  entries: JournalEntry[];
  onEdit: (entry: JournalEntry) => void;
  onDelete: (id: string) => void;
}

const EntryList: React.FC<EntryListProps> = ({ entries, onEdit, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  const toggleDay = (date: string) => {
    setExpandedDays(prev => ({ ...prev, [date]: !prev[date] }));
  };

  // Group entries by date
  const groupedEntries = useMemo(() => {
    const filtered = entries.filter(entry => 
      entry.content.toLowerCase().includes(searchTerm.toLowerCase()) || 
      entry.keywords?.some(k => k.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const groups: Record<string, JournalEntry[]> = {};
    filtered.forEach(entry => {
      const dateKey = new Date(entry.createdAt).toLocaleDateString('en-US', { 
        year: 'numeric', month: 'long', day: 'numeric' 
      });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(entry);
    });
    
    // Sort days descending (newest first)
    return Object.entries(groups).sort((a, b) => 
        new Date(b[1][0].createdAt).getTime() - new Date(a[1][0].createdAt).getTime()
    );
  }, [entries, searchTerm]);

  const getDayStats = (dayEntries: JournalEntry[]) => {
    const scoredEntries = dayEntries.filter(e => e.moodScore !== undefined);
    
    // Calculate Average Mood
    let avgMood = 0;
    let colorClass = 'bg-slate-50 border-slate-200';
    let textClass = 'text-slate-600';

    if (scoredEntries.length > 0) {
        avgMood = scoredEntries.reduce((acc, e) => acc + (e.moodScore || 0), 0) / scoredEntries.length;
        
        if (avgMood >= 8) {
            colorClass = 'bg-emerald-50 border-emerald-200';
            textClass = 'text-emerald-700';
        } else if (avgMood >= 6) {
            colorClass = 'bg-sky-50 border-sky-200';
            textClass = 'text-sky-700';
        } else if (avgMood >= 4) {
            colorClass = 'bg-indigo-50 border-indigo-200';
            textClass = 'text-indigo-700';
        } else {
            colorClass = 'bg-rose-50 border-rose-200';
            textClass = 'text-rose-700';
        }
    }

    // Aggregate Keywords (Top 5 unique)
    const allKeywords = new Set<string>();
    dayEntries.forEach(e => e.keywords?.forEach(k => allKeywords.add(k)));
    const keywords = Array.from(allKeywords).slice(0, 5);

    // Find a thumbnail image (Reflection or Art)
    const imageEntry = dayEntries.find(e => e.reflection?.imageUrl) || 
                       dayEntries.find(e => e.media?.some(m => m.type === 'image' || m.type === 'drawing'));
    
    const thumbnail = imageEntry?.reflection?.imageUrl; 

    // Representative Emoji for the day (mode)
    const emojis = dayEntries.map(e => e.moodEmoji).filter(Boolean);
    const dayEmoji = emojis.length > 0 ? emojis[0] : null;

    return { avgMood: avgMood.toFixed(1), colorClass, textClass, keywords, thumbnail, dayEmoji };
  };

  return (
    <div className="p-6 lg:p-10 h-full flex flex-col">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl font-serif font-bold text-slate-800">Your Journal</h2>
          <p className="text-slate-500 text-sm mt-1">
             {entries.length} memories stored across {Object.keys(groupedEntries).length} days
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search memories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lumina-200 focus:border-lumina-300 text-sm w-64 transition-all"
          />
        </div>
      </div>

      <div className="space-y-6 overflow-y-auto pb-20">
        {groupedEntries.length === 0 ? (
           <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
              <p className="text-slate-400">No entries found.</p>
           </div>
        ) : (
          groupedEntries.map(([date, dayEntries]) => {
             const { avgMood, colorClass, textClass, keywords, thumbnail, dayEmoji } = getDayStats(dayEntries);
             const isExpanded = expandedDays[date] ?? false; 

             return (
               <div key={date} className={`rounded-2xl border transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md ${colorClass} ${isExpanded ? 'ring-2 ring-opacity-50 ring-offset-2 ring-current' : ''}`}>
                  
                  {/* Day Header Card */}
                  <div 
                    onClick={() => toggleDay(date)}
                    className="cursor-pointer relative min-h-[100px] flex flex-col justify-center"
                  >
                     {/* Thumbnail Background Overlay if exists */}
                     {thumbnail && (
                        <>
                           <div 
                              className="absolute inset-0 opacity-20 bg-cover bg-center z-0" 
                              style={{ backgroundImage: `url(${thumbnail})` }} 
                           />
                           <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent z-0"></div>
                        </>
                     )}

                     <div className="relative z-10 p-5 flex items-center justify-between">
                        <div className="flex items-center gap-6">
                           <div className="text-center min-w-[60px]">
                              <div className="text-2xl font-bold text-slate-800 leading-none">
                                 {new Date(dayEntries[0].createdAt).getDate()}
                              </div>
                              <div className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                                 {new Date(dayEntries[0].createdAt).toLocaleString('default', { month: 'short' })}
                              </div>
                           </div>

                           <div className="h-10 w-px bg-slate-300/50 hidden sm:block"></div>

                           <div className="flex flex-col gap-2">
                              {keywords.length > 0 ? (
                                 <div className="flex flex-wrap gap-2">
                                    {keywords.map(k => (
                                       <span key={k} className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-white/60 backdrop-blur-sm rounded-md text-slate-600 border border-slate-100/50">
                                          <Tag size={10} className="opacity-50" /> {k}
                                       </span>
                                    ))}
                                 </div>
                              ) : (
                                 <span className="text-slate-400 text-sm italic">No keywords detected yet...</span>
                              )}
                              <span className="text-xs text-slate-500 font-medium flex items-center gap-2">
                                 {dayEmoji && <span className="text-lg">{dayEmoji}</span>}
                                 {dayEntries.length} {dayEntries.length === 1 ? 'Entry' : 'Entries'}
                              </span>
                           </div>
                        </div>

                        <div className="flex items-center gap-4">
                           {Number(avgMood) > 0 && (
                              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-sm shadow-sm ${textClass}`}>
                                 <Smile size={16} />
                                 <span className="font-bold">{avgMood}</span>
                              </div>
                           )}
                           <div className={`p-2 rounded-full bg-white/50 text-slate-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                              <ChevronDown size={20} />
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                     <div className="bg-white/50 border-t border-slate-100/50 p-4 space-y-4 animate-fade-in">
                        {dayEntries.map(entry => (
                           <div key={entry.id} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-4 group relative overflow-hidden">
                              {/* Mood Color accent strip */}
                              {entry.moodColor && (
                                <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: entry.moodColor }}></div>
                              )}
                              
                              <div className="flex justify-between items-start pl-2">
                                 <div className="w-full">
                                    <div className="flex items-center gap-2 mb-2">
                                        {entry.moodEmoji && <span className="text-2xl">{entry.moodEmoji}</span>}
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {/* Keywords for individual entry */}
                                        {entry.keywords && entry.keywords.length > 0 && (
                                            <div className="flex gap-1 ml-2">
                                                {entry.keywords.slice(0,3).map((k, i) => (
                                                    <span key={i} className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">{k}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-slate-700 font-serif leading-relaxed whitespace-pre-wrap">
                                       {entry.content}
                                    </p>
                                 </div>
                                 <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4 bg-white/80 p-1 rounded-lg">
                                    <button onClick={(e) => { e.stopPropagation(); onEdit(entry); }} className="p-2 text-slate-400 hover:text-lumina-600 hover:bg-lumina-50 rounded-lg">
                                       <Edit3 size={16} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); if(confirm('Delete?')) onDelete(entry.id); }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                                       <Trash2 size={16} />
                                    </button>
                                 </div>
                              </div>
                              
                              {/* Entry Media Preview */}
                              {(entry.reflection || entry.media?.length) && (
                                 <div className="flex gap-3 overflow-x-auto pb-2 pl-2">
                                    {entry.reflection && (
                                       <div className="relative h-20 w-20 shrink-0 rounded-lg overflow-hidden border border-slate-200">
                                          <img src={entry.reflection.imageUrl} alt="Reflection" className="h-full w-full object-cover" />
                                          <div className="absolute bottom-0 inset-x-0 bg-black/50 p-1">
                                             <Sparkles size={10} className="text-yellow-300 mx-auto" />
                                          </div>
                                       </div>
                                    )}
                                    {entry.media?.map(m => (
                                       <div key={m.id} className="h-20 w-20 shrink-0 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-xs flex-col gap-1">
                                          {m.type === 'video' ? <Zap size={14}/> : <Tag size={14}/>}
                                          {m.type}
                                       </div>
                                    ))}
                                 </div>
                              )}

                              {/* Daily Plan Section */}
                              {((entry.todos && entry.todos.length > 0) || (entry.schedule && entry.schedule.length > 0)) && (
                                <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50/80 -mx-5 -mb-5 px-5 py-4">
                                   <div className="flex items-center gap-2 mb-3">
                                       <div className="p-1 bg-lumina-100 text-lumina-600 rounded">
                                           <ListTodo size={14} />
                                       </div>
                                       <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Daily Plan & Tasks</h4>
                                   </div>
                                   
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                     {/* Todos */}
                                     {entry.todos && entry.todos.length > 0 && (
                                       <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
                                          <h5 className="text-[10px] font-bold text-slate-400 mb-2 uppercase flex items-center gap-1">
                                              <Check size={10} /> To-Do List
                                          </h5>
                                          <ul className="space-y-2">
                                            {entry.todos.map(t => (
                                              <li key={t.id} className="flex items-start gap-2.5 text-sm text-slate-700">
                                                <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${t.isCompleted ? 'bg-green-500 border-green-500' : 'border-slate-300 bg-slate-50'}`}>
                                                   {t.isCompleted && <Check size={10} className="text-white" />}
                                                </div>
                                                <span className={`leading-tight ${t.isCompleted ? 'line-through text-slate-400 decoration-slate-300' : ''}`}>{t.text}</span>
                                              </li>
                                            ))}
                                          </ul>
                                       </div>
                                     )}

                                     {/* Schedule */}
                                     {entry.schedule && entry.schedule.length > 0 && (
                                       <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
                                          <h5 className="text-[10px] font-bold text-slate-400 mb-2 uppercase flex items-center gap-1">
                                              <CalendarClock size={10} /> Schedule
                                          </h5>
                                          <ul className="space-y-2">
                                            {entry.schedule.map(s => (
                                              <li key={s.id} className="flex items-center gap-3 text-sm text-slate-700">
                                                <span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded shrink-0">
                                                    {s.time}
                                                </span>
                                                <span className="truncate leading-tight">{s.activity}</span>
                                              </li>
                                            ))}
                                          </ul>
                                       </div>
                                     )}
                                   </div>
                                </div>
                              )}
                           </div>
                        ))}
                     </div>
                  )}
               </div>
             );
          })
        )}
      </div>
    </div>
  );
};

export default EntryList;
