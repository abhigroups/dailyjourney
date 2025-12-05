
import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { JournalEntry, PatternAnalysis, LifeJourneyAnalysis } from '../types';
import { BrainCircuit, Lightbulb, TrendingUp, Calendar, ArrowRight, BarChart2, Award, Heart, Shield, Compass, Sparkles, Zap, Anchor, Target } from 'lucide-react';
import { detectPatterns, generateLifeJourneyAnalysis } from '../services/gemini';
import { getLifeJourneyAnalysis, saveLifeJourneyAnalysis } from '../services/storage';

interface DashboardProps {
  entries: JournalEntry[];
}

type TabMode = 'overview' | 'journey';

const Dashboard: React.FC<DashboardProps> = ({ entries }) => {
  const [activeTab, setActiveTab] = useState<TabMode>('overview');
  
  // Pattern State
  const [patternData, setPatternData] = useState<PatternAnalysis | null>(null);
  const [isLoadingPatterns, setIsLoadingPatterns] = useState(false);

  // Journey Report State
  const [journeyData, setJourneyData] = useState<LifeJourneyAnalysis | null>(null);
  const [isLoadingJourney, setIsLoadingJourney] = useState(false);

  useEffect(() => {
    // Load cached reports
    const cachedJourney = getLifeJourneyAnalysis();
    if (cachedJourney) setJourneyData(cachedJourney);
  }, []);

  // Prepare chart data
  const chartData = [...entries]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-14) // Last 14 entries
    .map(e => ({
      date: new Date(e.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      mood: e.moodScore || 0,
      label: e.moodLabel || ''
    }));
    
  // Calculate aggregate stats
  const totalAnalyzed = entries.filter(e => e.isAnalyzed).length;
  const avgMood = totalAnalyzed ? (entries.reduce((acc, curr) => acc + (curr.moodScore || 0), 0) / totalAnalyzed).toFixed(1) : 0;
  
  // Keyword frequency
  const keywordCounts: Record<string, number> = {};
  entries.forEach(e => {
      e.keywords?.forEach(k => {
          const key = k.toLowerCase();
          keywordCounts[key] = (keywordCounts[key] || 0) + 1;
      });
  });
  const topKeywords = Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));

  const COLORS = ['#38bdf8', '#818cf8', '#a78bfa', '#e879f9', '#f472b6'];

  const handleDetectPatterns = async () => {
      setIsLoadingPatterns(true);
      try {
          const result = await detectPatterns(entries);
          setPatternData(result);
          // In a real app, save to storage
      } catch (e) {
          console.error(e);
      } finally {
          setIsLoadingPatterns(false);
      }
  };

  const handleGenerateJourney = async () => {
      setIsLoadingJourney(true);
      try {
          const result = await generateLifeJourneyAnalysis(entries);
          setJourneyData(result);
          saveLifeJourneyAnalysis(result);
      } catch (e) {
          console.error(e);
      } finally {
          setIsLoadingJourney(false);
      }
  };

  if (entries.length === 0) {
      return (
          <div className="flex items-center justify-center h-full p-10">
              <div className="text-center max-w-md">
                  <div className="bg-slate-100 p-4 rounded-full inline-block mb-4">
                      <BarChart2 size={32} className="text-slate-400" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-700 mb-2">No Data Yet</h2>
                  <p className="text-slate-500">Start writing your journal entries to see analytics and unlock AI insights.</p>
              </div>
          </div>
      );
  }

  return (
    <div className="p-6 lg:p-10 space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-serif font-bold text-slate-800">Insights & Analytics</h2>
           <p className="text-slate-500 text-sm mt-1">Understanding your journey through data.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'overview' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                Overview
            </button>
            <button 
                onClick={() => setActiveTab('journey')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'journey' ? 'bg-white text-lumina-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <Sparkles size={14} /> Journey Report
            </button>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <div className="animate-fade-in space-y-8">
            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-500"><TrendingUp size={20}/></div>
                        <span className="text-slate-500 text-sm font-medium">Average Mood</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-800">{avgMood}<span className="text-lg text-slate-400 font-normal">/10</span></div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-2 bg-purple-50 rounded-lg text-purple-500"><Calendar size={20}/></div>
                        <span className="text-slate-500 text-sm font-medium">Entries Tracked</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-800">{entries.length}</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-500"><BrainCircuit size={20}/></div>
                        <span className="text-slate-500 text-sm font-medium">Analyzed</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-800">{totalAnalyzed}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Mood Trend Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-700 mb-6">Mood Trajectory</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                                <YAxis hide domain={[0, 10]} />
                                <Tooltip 
                                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                                    cursor={{stroke: '#cbd5e1', strokeWidth: 1}}
                                />
                                <Area type="monotone" dataKey="mood" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorMood)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Keyword Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-700 mb-6">Recurring Themes</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topKeywords} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{fill: '#64748b', fontSize: 13}} />
                                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none'}} />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                    {topKeywords.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Deep Pattern Analysis Section */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-20 transform translate-x-1/2 -translate-y-1/2"></div>
                
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h3 className="text-2xl font-serif font-bold mb-2 flex items-center gap-3">
                                <Lightbulb className="text-yellow-400" />
                                Deep Pattern Discovery
                            </h3>
                            <p className="text-slate-300">Let AI analyze your recent entries to find hidden habits and life patterns.</p>
                        </div>
                        <button 
                            onClick={handleDetectPatterns}
                            disabled={isLoadingPatterns}
                            className="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 rounded-xl transition-all flex items-center gap-2 font-medium disabled:opacity-50"
                        >
                            {isLoadingPatterns ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div> : <BrainCircuit size={18} />}
                            {isLoadingPatterns ? 'Analyzing Patterns...' : 'Run Analysis'}
                        </button>
                    </div>

                    {patternData ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                            <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-white/10">
                                <div className="text-indigo-300 text-sm font-bold uppercase tracking-wider mb-3">Core Themes</div>
                                <ul className="space-y-2">
                                    {patternData.recurringThemes.map((theme, i) => (
                                        <li key={i} className="flex items-center gap-2 text-slate-200">
                                            <ArrowRight size={14} className="text-indigo-400" />
                                            {theme}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-white/10">
                                <div className="text-emerald-300 text-sm font-bold uppercase tracking-wider mb-3">Habit Insight</div>
                                <p className="text-slate-200 leading-relaxed">{patternData.habitInsight}</p>
                            </div>
                            <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-white/10">
                                <div className="text-rose-300 text-sm font-bold uppercase tracking-wider mb-3">Suggestion</div>
                                <p className="text-slate-200 leading-relaxed">{patternData.improvementSuggestion}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-10 border-2 border-dashed border-white/10 rounded-xl">
                            <p className="text-slate-400">Run the analysis to reveal your subconscious patterns.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      ) : (
        <div className="animate-fade-in space-y-8">
            {/* Journey Header & Action */}
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-8 text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl">
                <div>
                   <h2 className="text-3xl font-serif font-bold mb-2">Life Journey Report</h2>
                   <p className="text-indigo-100 max-w-xl">
                      A deep dive into your positives, achievements, and future path. 
                      Let AI synthesize your journal into a story of growth and positivity.
                   </p>
                </div>
                <button 
                   onClick={handleGenerateJourney}
                   disabled={isLoadingJourney}
                   className="px-8 py-3 bg-white text-indigo-600 rounded-full font-bold hover:bg-indigo-50 transition-colors shadow-lg disabled:opacity-75 flex items-center gap-2"
                >
                   {isLoadingJourney ? <div className="animate-spin w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full"></div> : <Sparkles size={18} />}
                   {isLoadingJourney ? 'Analyzing Journey...' : 'Generate Report'}
                </button>
            </div>

            {journeyData ? (
                <div className="space-y-8">
                    
                    {/* NEW: Resilience Engine & Motivational Block */}
                    {journeyData.motivationalBlock && (
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-lg animate-fade-in-up">
                             <div className="absolute -top-24 -right-24 w-64 h-64 bg-white opacity-10 rounded-full blur-[80px]"></div>
                             <div className="relative z-10">
                                 <div className="flex items-center gap-3 mb-8">
                                     <Anchor size={32} className="text-teal-100" />
                                     <h3 className="text-2xl font-serif font-bold">The Resilience Engine</h3>
                                 </div>

                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                     {/* Stats Column */}
                                     <div className="space-y-6">
                                         <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20">
                                             <div className="text-teal-100 text-xs font-bold uppercase tracking-widest mb-2">Resilience Score</div>
                                             <div className="flex items-end gap-3">
                                                 <span className="text-5xl font-bold">{journeyData.motivationalBlock.resilienceScore}</span>
                                                 <span className="text-teal-200 mb-2">/ 100</span>
                                             </div>
                                             <div className="w-full bg-white/20 h-2 rounded-full mt-3 overflow-hidden">
                                                 <div className="h-full bg-white rounded-full" style={{ width: `${journeyData.motivationalBlock.resilienceScore}%` }}></div>
                                             </div>
                                         </div>
                                         <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20">
                                              <div className="text-teal-100 text-xs font-bold uppercase tracking-widest mb-2">Positivity Index</div>
                                              <div className="flex items-end gap-3">
                                                 <span className="text-5xl font-bold">{journeyData.motivationalBlock.positivityIndex}</span>
                                                 <span className="text-teal-200 mb-2">/ 100</span>
                                             </div>
                                         </div>
                                     </div>

                                     {/* Narrative Column */}
                                     <div className="md:col-span-2 space-y-6">
                                         <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                                             <div className="flex items-center gap-2 mb-3 text-teal-200">
                                                 <Zap size={18} className="fill-current" />
                                                 <span className="font-bold uppercase tracking-wider text-xs">Power Narrative</span>
                                             </div>
                                             <p className="text-lg leading-relaxed font-serif italic text-white/95">
                                                 "{journeyData.motivationalBlock.resilienceNarrative}"
                                             </p>
                                         </div>

                                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                             <div className="bg-white text-teal-900 rounded-xl p-5 shadow-lg">
                                                 <div className="text-xs font-bold text-teal-600 uppercase tracking-widest mb-3">Growth Opportunities (Reframed)</div>
                                                 <ul className="space-y-2">
                                                     {journeyData.motivationalBlock.growthFocus.map((item, i) => (
                                                         <li key={i} className="flex items-start gap-2 text-sm font-medium">
                                                             <ArrowRight size={14} className="mt-0.5 text-teal-500 shrink-0" />
                                                             {item}
                                                         </li>
                                                     ))}
                                                 </ul>
                                             </div>
                                             <div className="bg-teal-900/40 rounded-xl p-5 border border-teal-500/30 flex flex-col justify-center text-center">
                                                 <Sparkles className="mx-auto mb-3 text-teal-300" size={20}/>
                                                 <p className="font-serif text-teal-100 text-lg">"{journeyData.motivationalBlock.powerQuote}"</p>
                                             </div>
                                         </div>
                                     </div>
                                 </div>
                             </div>
                        </div>
                    )}

                    {/* Detailed Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        
                        {/* Achievements & Best Moments (Gold/Yellow) */}
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-4 text-amber-600">
                                <div className="p-2 bg-amber-50 rounded-lg"><Award size={20} /></div>
                                <h4 className="font-bold">Highlights & Wins</h4>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Achievements</h5>
                                    <ul className="space-y-2">
                                        {journeyData.achievements.length > 0 ? journeyData.achievements.map((item, i) => (
                                            <li key={i} className="text-sm text-slate-700 flex gap-2 items-start"><span className="text-amber-500">•</span> {item}</li>
                                        )) : <li className="text-sm text-slate-400 italic">No achievements detected yet.</li>}
                                    </ul>
                                </div>
                                <div className="pt-4 border-t border-slate-100">
                                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Best Moments</h5>
                                    <ul className="space-y-2">
                                        {journeyData.bestMoments.length > 0 ? journeyData.bestMoments.map((item, i) => (
                                            <li key={i} className="text-sm text-slate-700 flex gap-2 items-start"><span className="text-amber-500">•</span> {item}</li>
                                        )) : <li className="text-sm text-slate-400 italic">Keep journaling to capture moments.</li>}
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Confidence & Kindness (Blue/Heart) */}
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-4 text-rose-600">
                                <div className="p-2 bg-rose-50 rounded-lg"><Heart size={20} /></div>
                                <h4 className="font-bold">Heart & Strength</h4>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Kindness to Others</h5>
                                    <ul className="space-y-2">
                                        {journeyData.actsOfKindness.length > 0 ? journeyData.actsOfKindness.map((item, i) => (
                                            <li key={i} className="text-sm text-slate-700 flex gap-2 items-start"><span className="text-rose-500">•</span> {item}</li>
                                        )) : <li className="text-sm text-slate-400 italic">Kindness is key. Record your good deeds.</li>}
                                    </ul>
                                </div>
                                <div className="pt-4 border-t border-slate-100">
                                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Confidence Spikes</h5>
                                    <ul className="space-y-2">
                                        {journeyData.confidenceMoments.length > 0 ? journeyData.confidenceMoments.map((item, i) => (
                                            <li key={i} className="text-sm text-slate-700 flex gap-2 items-start"><span className="text-rose-500">•</span> {item}</li>
                                        )) : <li className="text-sm text-slate-400 italic">Confidence builds over time.</li>}
                                    </ul>
                                </div>
                            </div>
                        </div>

                         {/* Future & Growth (Green/Emerald) */}
                         <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-4 text-emerald-600">
                                <div className="p-2 bg-emerald-50 rounded-lg"><Target size={20} /></div>
                                <h4 className="font-bold">Promises to Self</h4>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Future Commitments</h5>
                                    <ul className="space-y-2">
                                        {journeyData.futurePlans.length > 0 ? journeyData.futurePlans.map((item, i) => (
                                            <li key={i} className="text-sm text-slate-700 flex gap-2 items-start"><span className="text-emerald-500">•</span> {item}</li>
                                        )) : <li className="text-sm text-slate-400 italic">No future plans detected yet.</li>}
                                    </ul>
                                </div>
                                <div className="pt-4 border-t border-slate-100">
                                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Positives</h5>
                                    <ul className="space-y-2">
                                        {journeyData.positives.length > 0 ? journeyData.positives.map((item, i) => (
                                            <li key={i} className="text-sm text-slate-700 flex gap-2 items-start"><span className="text-emerald-500">•</span> {item}</li>
                                        )) : <li className="text-sm text-slate-400 italic">Looking for the good...</li>}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-20 bg-white border-2 border-dashed border-slate-200 rounded-2xl">
                    <Sparkles className="mx-auto text-slate-300 mb-4" size={48} />
                    <h3 className="text-lg font-bold text-slate-700">Ready to Reflect?</h3>
                    <p className="text-slate-500 max-w-sm mx-auto mt-2">
                        Click "Generate Report" to have AI analyze your journal entries and create a comprehensive life journey map.
                    </p>
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
