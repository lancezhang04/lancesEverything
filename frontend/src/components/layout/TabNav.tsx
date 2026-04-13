import { useState, useRef, useEffect } from 'react';
import { useConfigStore } from '../../store/configStore';

const tabs = [
  { id: 'holdings', label: 'Holdings & Overview' },
  { id: 'factors', label: 'Factors & Returns' },
  { id: 'targets', label: 'Portfolio Targets' },
  { id: 'rebalance', label: 'Rebalance Calculator' },
];

export const TabNav = () => {
  const { activeTab, setActiveTab } = useConfigStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const activeLabel = tabs.find((t) => t.id === activeTab)?.label ?? '';

  return (
    <div className="border-b border-slate-700">
      {/* Desktop nav */}
      <nav className="hidden sm:flex max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mb-px space-x-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Mobile hamburger nav */}
      <div className="sm:hidden relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-200 w-full"
        >
          {/* Hamburger icon */}
          <div className="flex flex-col justify-center gap-[4px] w-5 h-5">
            <span
              className={`block h-[2px] w-5 bg-slate-300 rounded transition-transform duration-200 origin-center ${
                menuOpen ? 'translate-y-[6px] rotate-45' : ''
              }`}
            />
            <span
              className={`block h-[2px] w-5 bg-slate-300 rounded transition-opacity duration-200 ${
                menuOpen ? 'opacity-0' : ''
              }`}
            />
            <span
              className={`block h-[2px] w-5 bg-slate-300 rounded transition-transform duration-200 origin-center ${
                menuOpen ? '-translate-y-[6px] -rotate-45' : ''
              }`}
            />
          </div>
          <span>{activeLabel}</span>
        </button>

        {/* Dropdown menu */}
        <div
          className={`absolute left-0 right-0 z-50 bg-slate-800 border-b border-slate-700 shadow-lg overflow-hidden transition-all duration-200 ease-in-out ${
            menuOpen ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setMenuOpen(false);
              }}
              className={`block w-full text-left px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-400 bg-slate-700/50'
                  : 'text-slate-300 hover:bg-slate-700/30 hover:text-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
