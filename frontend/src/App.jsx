import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import MeasurePage from './pages/MeasurePage';
import CustomersPage from './pages/CustomersPage';
import SizeChartPage from './pages/SizeChartPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="px-4 py-8">
          <Routes>
            <Route path="/" element={<MeasurePage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/sizes" element={<SizeChartPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
