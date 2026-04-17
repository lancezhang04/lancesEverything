import { useState, useEffect } from 'react';
import { Footer } from '../layout/Footer';
import { DaySelector } from './DaySelector';
import { ExerciseTable } from './ExerciseTable';
import { MuscleRadarChart } from './MuscleRadarChart';
import { MethodologyTab } from './MethodologyTab';
import { DAYS, Day, workoutData } from '../../data/workoutData';

const TAB_ITEMS = ['Workout', 'Methodology'] as const;
type Tab = typeof TAB_ITEMS[number];

export const WorkoutPage = () => {
  const todayIndex = (new Date().getDay() + 6) % 7; // JS Sunday=0 → our Monday=0
  const [selectedDay, setSelectedDay] = useState<Day>(DAYS[todayIndex]);
  const [activeTab, setActiveTab] = useState<Tab>('Workout');

  const dayData = workoutData[selectedDay];

  useEffect(() => {
    document.title = "Lance's Workouts";
    return () => { document.title = "Lance's Everything"; };
  }, []);

  return (
    <div style={{ minHeight: '100dvh' }} className="relative z-10 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-800/95 backdrop-blur-sm shadow-lg shadow-slate-900/50">
        <div className="px-4 py-3 sm:px-10 sm:py-4 lg:px-16">
          <h1 className="text-slate-100">
            <div className="flex items-end gap-3">
              <a href="/">
                <img src="/lances-logo.svg" alt="Lance's" className="inline-block h-12 sm:h-[3.2rem]" />
              </a>
              <span className="hidden sm:inline text-3xl">Workouts</span>
            </div>
            <span className="block sm:hidden text-lg mt-1">Workouts</span>
          </h1>
        </div>

        {/* Tabs */}
        <div className="px-4 sm:px-10 lg:px-16 flex gap-6 text-sm border-t border-slate-700/40">
          {TAB_ITEMS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2.5 border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {activeTab === 'Workout' ? (
          <div className="space-y-6">
            <DaySelector selected={selectedDay} onSelect={setSelectedDay} />

            {dayData ? (
              <>
                <div className="text-center">
                  <span className="text-sm font-medium uppercase tracking-wider text-blue-400">
                    {dayData.label}
                  </span>
                </div>

                <ExerciseTable exercises={dayData.exercises} />
                <MuscleRadarChart dayData={dayData} />
              </>
            ) : (
              <div className="text-center py-20 text-slate-500">
                <p className="text-lg">Rest day</p>
                <p className="text-sm mt-1">Recovery is part of the program.</p>
              </div>
            )}
          </div>
        ) : (
          <MethodologyTab />
        )}
      </main>

      <Footer />
    </div>
  );
};
