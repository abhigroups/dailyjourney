
import React from 'react';
import { Book, BarChart2, PlusCircle, Settings, Feather, Sparkles, Compass } from 'lucide-react';
import { ViewMode } from '../types';

interface LayoutProps {
  currentView: ViewMode;
  setView: (view: ViewMode) => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ currentView, setView, children }) => {
  const navItems = [
    { id: ViewMode.WRITE, label: 'Write', icon: PlusCircle },
    { id: ViewMode.LIST, label: 'Journal', icon: Book },
    { id: ViewMode.ANALYTICS, label: 'Insights', icon: BarChart2 },
    { id: ViewMode.GUIDANCE, label: 'Guidance', icon: Compass },
    { id: ViewMode.SETTINGS, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-all duration-300 z-10">
        <div>
          <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-slate-100">
            <div className="bg-lumina-500 p-2 rounded-xl text-white mr-0 lg:mr-3 shadow-lg shadow-lumina-200">
              <Feather size={20} />
            </div>
            <span className="hidden lg:block font-bold text-xl text-slate-800 tracking-tight">Lumina</span>
          </div>

          <nav className="p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className={`w-full flex items-center justify-center lg:justify-start p-3 rounded-xl transition-all duration-200 group relative
                    ${isActive 
                      ? 'bg-lumina-50 text-lumina-600 font-medium shadow-sm' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-lumina-500'
                    }`}
                >
                  <Icon size={22} className={`${isActive ? 'stroke-2' : 'stroke-1.5'}`} />
                  <span className="hidden lg:block ml-3">{item.label}</span>
                  {isActive && <div className="ml-auto hidden lg:block w-1.5 h-1.5 rounded-full bg-lumina-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]"></div>}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-100">
           <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-lumina-50 border border-lumina-100 hidden lg:block">
              <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={16} className="text-lumina-500" />
                  <span className="text-xs font-semibold text-lumina-700">Pro Tip</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                  Reflect on your AI insights weekly to discover hidden habits.
              </p>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative bg-[#f8fafc]">
        <div className="max-w-5xl mx-auto min-h-full">
           {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
