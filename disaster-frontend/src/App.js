import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import UserDashboard from "./pages/UserDashboard";
import AuthorityLogin from "./pages/AuthorityLogin";
import SuperadminLogin from "./pages/SuperadminLogin";
import SuperadminDashboard from "./pages/SuperadminDashboard";
import ReportHazard from "./components/ReportHazard";
import OfflineDrafts from "./components/OfflineDrafts";
import ShelterMap from "./components/ShelterMap";
import AlertsFeed from "./components/AlertsFeed";
import { Toaster } from "react-hot-toast";
import CommunitySignup from "./pages/CommunitySignup";
import SendPublicAlert from "./components/panels/SendPublicAlert";
import ViewAllAlerts from "./components/panels/ViewAllAlerts";
import UsersAndAuthorities from "./components/panels/UsersAndAuthorities";
import ManageShelterPanel from "./components/panels/ManageShelterPanel";
import ResolvedAlerts from "./pages/authority/AllAlerts";
import AuthorityLayout from "./pages/authority/AuthorityLayout";
import AuthorityDashboard from "./pages/AuthorityDashboard";
import AuthorityProfile from "./pages/authority/Profile";
import SendAlertPage from "./pages/authority/SendAlert";
import Profile from "./pages/authority/Profile";
import LiveAlertMap from "./pages/authority/LiveAlertmap";
import RefugeeForm from "./pages/RefugeeForm";
import VolunteerForm from "./pages/VolunteerForm";
import HelpAssistance from "./pages/help/HelpAssistance";
import HelpAssistantDashboard from "./pages/HelpAssistantDashboard";
import HelpMapPanel from "./pages/help/HelpMapPanel";
import ShelterApplicationForm from "./components/ShelterApplicationForm";
import VolunteerFeed from "./components/VolunteerFeed";
import VolunteerChat from "./components/VolunteerChat";
import AdminChat from "./pages/help/AdminChat";
import ShelterAR from "./components/ShelterAR";



const App = () => (
  <Router>
    <Toaster position="top-right" />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/user" element={<UserDashboard />} />
      <Route path="/authority/login" element={<AuthorityLogin />} />
      <Route path="/superadmin/login" element={<SuperadminLogin />} />
      <Route path="/superadmin/dashboard" element={<SuperadminDashboard />} />
      <Route path="/report" element={<ReportHazard />} />
      <Route path="/shelters" element={<ShelterMap />} />
      <Route path="/drafts" element={<OfflineDrafts />} />
      <Route path="/alerts" element={<AlertsFeed />} />
      <Route path="/community-signup" element={<CommunitySignup />} />
      <Route path="/superadmin/send-alert" element={<SendPublicAlert />} />
      <Route path="/superadmin/view-alerts" element={<ViewAllAlerts />} />
      <Route path="/superadmin/users-authorities" element={<UsersAndAuthorities />} />
      <Route path="/superadmin/shelters" element={<ManageShelterPanel />} />
      <Route path="/refugee" element={<RefugeeForm />} />
      <Route path="/volunteer" element={<VolunteerForm />} />
      <Route path="/help" element={<HelpAssistance />} />
      <Route path="/helpdashboard" element={<HelpAssistantDashboard />} />
      <Route path="/help-map" element={<HelpMapPanel />} />
      <Route path="/shelter-application" element={<ShelterApplicationForm />} />
      <Route path="/volunteer-feed" element={<VolunteerFeed />} />
      <Route path="/volunteer/group/:id" element={<VolunteerChat />} />
      <Route path="/admin/volunteer-group/:id" element={<AdminChat />} />
      <Route path="/shelters/ar" element={<ShelterAR />} />


      {/* Universal Authority Dashboard */}
      <Route path="/authority/dashboard" element={<AuthorityLayout />} />

      
      
    </Routes>
  </Router>
);

export default App;
