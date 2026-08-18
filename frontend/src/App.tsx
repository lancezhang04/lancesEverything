import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Dashboard } from './components/layout/Dashboard';
import { HomePage } from './components/layout/HomePage';
import { WorkoutPage } from './components/workout/WorkoutPage';
import { ExchangePage } from './components/exchange/ExchangePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/portfolio"
          element={
            <QueryClientProvider client={queryClient}>
              <Dashboard />
            </QueryClientProvider>
          }
        />
        <Route path="/workout" element={<WorkoutPage />} />
        <Route
          path="/exchange"
          element={
            <QueryClientProvider client={queryClient}>
              <ExchangePage />
            </QueryClientProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
