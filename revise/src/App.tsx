import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { CreatePlan } from './pages/CreatePlan';
import { StudySession } from './pages/StudySession';
import { Progress } from './pages/Progress';
import { Profile } from './pages/Profile';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create-plan" element={<CreatePlan />} />
        <Route path="/study/:planId/:dayId" element={<StudySession />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App
