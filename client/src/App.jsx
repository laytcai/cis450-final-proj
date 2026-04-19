import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import Browse from '@/pages/Browse';
import AnimeDetail from '@/pages/AnimeDetail';
import UserProfile from '@/pages/UserProfile';
import Compare from '@/pages/Compare';
import Trends from '@/pages/Trends';
import Studios from '@/pages/Studios';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="browse" element={<Browse />} />
        <Route path="anime/:id" element={<AnimeDetail />} />
        <Route path="users/:username" element={<UserProfile />} />
        <Route path="compare" element={<Compare />} />
        <Route path="trends" element={<Trends />} />
        <Route path="studios" element={<Studios />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
