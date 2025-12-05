
import React, { useEffect, useState } from 'react';
import { DailyGuidance, JournalEntry } from '../types';
import { generateDailyGuidance } from '../services/gemini';
import { getDailyGuidance, saveDailyGuidance } from '../services/storage';
import { Compass, Sparkles, CheckSquare, Zap, Target, ArrowRight } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface GuidanceProps {
  entries: JournalEntry[];
  onAddTasksToEntry: (tasks: { id: string, text: string, isCompleted: boolean }[]) => void;
}

const Guidance: React.FC<GuidanceProps> = ({ entries, onAddTasksToEntry }) => {
  const [guidance, setGuidance] = useState<DailyGuidance | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check for cached guidance for today
    const cached = getDailyGuidance();
    const today = new Date().toISOString().split('T')[0];
    
    if (cached && cached.timestamp.split('T')[0] === today) {
      setGuidance(cached);
    } else if (entries.length > 0) {
      handleGenerate();
    }
  }, [entries]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generateDailyGuidance(entries);
      setGuidance(result);
      saveDailyGuidance(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addTasks = () => {
      if (guidance) {
          const tasks = guidance.todoSuggestions.map(t => ({
              id: uuidv4(),
              text: t,
              isCompleted: false
          }));
          onAddTasksToEntry(tasks);
      }
  };

  if (entries.length < 3) {
      return (
          <div className="flex items-center justify-center h-full p-10">
              <div className="text-center max-w-md bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="bg-slate-100 p-4 rounded-full inline-block mb-4">
                      <Compass size={32} className="text-slate-400" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-700 mb-2">Need more data</h2>
                  <p className="text-slate-500">
                      Write at least 3 journal entries to unlock personalized AI guidance, suggestions, and daily plans.
                  </p>
              </div>
          </div>
      );
  }

  return (
    <div className="p-6 lg:p-10 space-y-8 pb-20 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-serif font-bold text-slate-800">Daily Guidance</h2>
           <p className="text-slate-500 text-sm mt-1">AI-powered recommendations based on your past reflections.</p>
        </div>
        <button 
            onClick={handleGenerate}
            disabled={loading}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium transition-colors"
        >
            {loading ? 'Analyzing...' : 'Refresh Guidance'}
        </button>
      </div>

      {loading && (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-slate-200">
              <div className="animate-spin w-8 h-8 border-4 border-lumina-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-slate-600">Connecting the dots in your journal...</p>
          </div>
      )}

      {!loading && guidance && (
        <div className="space-y-6 animate-fade-in">
            {/* Main Focus Card */}
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-[80px] transform translate-x-1/2 -translate-y-1/2"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4 text-indigo-200">
                        <Target size={20} />
                        <span className="text-xs font-bold uppercase tracking-widest">Today's Focus</span>
                    </div>
                    <h3 className="text-3xl font-serif font-bold mb-4">
                        {guidance.focusArea}
                    </h3>
                    <p className="text-indigo-100 leading-relaxed max-w-2xl bg-white/10 p-4 rounded-xl border border-white/10">
                        {guidance.reasoning}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Suggestions / Todo List */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3 text-emerald-600">
                            <div className="p-2 bg-emerald-50 rounded-lg"><CheckSquare size={20} /></div>
                            <h4 className="font-bold">Suggested Actions</h4>
                        </div>
                        <button onClick={addTasks} className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-100 font-medium transition-colors">
                            + Add to Plan
                        </button>
                    </div>
                    <ul className="space-y-3">
                        {guidance.todoSuggestions.map((item, i) => (
                            <li key={i} className="flex items-start gap-3 text-slate-700">
                                <div className="mt-1 min-w-[16px] h-4 rounded-sm border border-slate-300"></div>
                                <span className="text-sm">{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Improvements */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-6 text-amber-600">
                        <div className="p-2 bg-amber-50 rounded-lg"><Zap size={20} /></div>
                        <h4 className="font-bold">Growth Tips</h4>
                    </div>
                    <ul className="space-y-4">
                        {guidance.improvementTips.map((item, i) => (
                            <li key={i} className="flex gap-3">
                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></div>
                                <span className="text-sm text-slate-700 leading-relaxed">{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Positive Reflection */}
                <div className="md:col-span-2 bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-6 border border-pink-100">
                    <div className="flex items-center gap-3 mb-4 text-rose-600">
                        <div className="p-2 bg-white rounded-lg shadow-sm"><Sparkles size={20} /></div>
                        <h4 className="font-bold">Strength from the Past</h4>
                    </div>
                    <p className="text-slate-700 italic font-serif text-lg leading-relaxed">
                        "{guidance.positiveReflection}"
                    </p>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Guidance;
