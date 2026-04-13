import { useRef, useState, useEffect } from 'react';
import { Header } from './Header';
import { TabNav } from './TabNav';
import { Footer } from './Footer';
import { useConfigStore } from '../../store/configStore';
import { HoldingsTab } from '../holdings/HoldingsTab';
import { FactorsTab } from '../factors/FactorsTab';
import { TargetsTab } from '../targets/TargetsTab';
import { RebalanceTab } from '../rebalance/RebalanceTab';

export const Dashboard = () => {
  const { activeTab } = useConfigStore();
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    if (!headerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setHeaderHeight(entry.target.getBoundingClientRect().height);
      }
    });
    observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen relative z-10 flex flex-col">
      <div ref={headerRef} className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm">
        <Header />
        <TabNav />
      </div>
      <main
        className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-6"
        style={{ paddingTop: headerHeight + 24 }}
      >
        <div className={activeTab === 'holdings' ? '' : 'hidden'}><HoldingsTab /></div>
        <div className={activeTab === 'factors' ? '' : 'hidden'}><FactorsTab /></div>
        <div className={activeTab === 'targets' ? '' : 'hidden'}><TargetsTab /></div>
        <div className={activeTab === 'rebalance' ? '' : 'hidden'}><RebalanceTab /></div>
      </main>
      <Footer />
    </div>
  );
};
