import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Venues from './pages/Venues';
import VenueDetail from './pages/VenueDetail';
import MyBookings from './pages/MyBookings';
import OwnerDashboard from './pages/OwnerDashboard';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/iniciar-sesion" element={<Login />} />
          <Route path="/registro" element={<Register />} />
          <Route path="/canchas" element={<Venues />} />
          <Route path="/canchas/:id" element={<VenueDetail />} />
          <Route path="/mis-reservas" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
          <Route path="/panel" element={<ProtectedRoute role="owner"><OwnerDashboard /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}
