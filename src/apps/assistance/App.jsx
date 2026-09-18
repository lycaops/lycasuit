'use client';
import { Toaster } from "@assistance/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@assistance/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@assistance/lib/AuthContext';
import ScrollToTop from './components/ScrollToTop';
import { CustomAuthProvider } from '@assistance/lib/customAuth';
import CustomProtectedRoute from '@assistance/components/CustomProtectedRoute';
import { LanguageProvider } from '@assistance/lib/LanguageContext';
// Auth pages
import Login from '@assistance/pages/Login';
import Register from '@assistance/pages/Register';
import ForgotPassword from '@assistance/pages/ForgotPassword';
import ResetPassword from '@assistance/pages/ResetPassword';
// App pages
import Dashboard from '@assistance/pages/Dashboard';
import AdminDashboard from '@assistance/pages/AdminDashboard';
import ReportIssue from '@assistance/pages/ReportIssue';
import MyTickets from '@assistance/pages/MyTickets';
import TicketDetails from '@assistance/pages/TicketDetails';
import AllTickets from '@assistance/pages/AllTickets';
import PendingCases from '@assistance/pages/PendingCases';
import CompletedCases from '@assistance/pages/CompletedCases';
import StaffManagement from '@assistance/pages/StaffManagement';
import Profile from '@assistance/pages/Profile';

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router basename="/tools/assistance">
            <ScrollToTop />
            <CustomAuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route element={<CustomProtectedRoute />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/admin-dashboard" element={<AdminDashboard />} />
                <Route path="/report-issue" element={<ReportIssue />} />
                <Route path="/my-tickets" element={<MyTickets />} />
                <Route path="/all-tickets" element={<AllTickets />} />
                <Route path="/pending-cases" element={<PendingCases />} />
                <Route path="/completed-cases" element={<CompletedCases />} />
                <Route path="/staff-management" element={<StaffManagement />} />
                <Route path="/tickets/:id" element={<TicketDetails />} />
                <Route path="/profile" element={<Profile />} />
              </Route>
              <Route path="*" element={<PageNotFound />} />
            </Routes>
            </CustomAuthProvider>
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </LanguageProvider>
  )
}

export default App