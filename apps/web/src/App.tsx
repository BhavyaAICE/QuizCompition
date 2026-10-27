import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { ParticipantLogin } from './pages/participant/ParticipantLogin';
import { ParticipantDashboard } from './pages/participant/ParticipantDashboard';
import { AdminLogin } from './pages/admin/AdminLogin';
import { ResetPassword } from './pages/admin/ResetPassword';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminLayout } from './components/admin/AdminLayout';
import { QuizList } from './pages/admin/QuizList';
import { QuizManager } from './pages/admin/QuizManager';
import { RoundManager } from './pages/admin/RoundManager';
import { LiveControl } from './pages/admin/LiveControl';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<ParticipantLogin />} />
        <Route path="/quiz" element={<ParticipantDashboard />} />
        
        {/* Admin Login (without layout) */}
        <Route path="/admin" element={<AdminLogin />} />

        {/* Emergency One-Time Password Reset */}
        <Route path="/resetpassword" element={<ResetPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Admin Protected Routes with Layout */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="quizzes" element={<QuizList />} />
          <Route path="quizzes/:quizId" element={<QuizManager />} />
          <Route path="quizzes/:quizId/rounds/:roundId" element={<RoundManager />} />
          <Route path="live" element={<LiveControl />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
