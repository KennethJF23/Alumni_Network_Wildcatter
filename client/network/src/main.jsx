import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import Home from './App.jsx'
import Splash from './pages/Splash.jsx'
import Welcome from './pages/Welcome.jsx'
import Auth from './pages/Auth.jsx'
import AppLayout from './pages/AppLayout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Trends from './pages/Trends.jsx'
import Invites from './pages/Invites.jsx'
import Profile from './pages/Profile.jsx'
import Join from './pages/Join.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Auth mode="login" />} />
        <Route path="/signup" element={<Auth mode="signup" />} />
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="trends" element={<Trends />} />
          <Route path="invites" element={<Invites />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        <Route path="/join/:id" element={<Join />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)