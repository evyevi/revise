import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { CreatePlan } from './pages/CreatePlan';
import { StudySession } from './pages/StudySession';
import { Progress } from './pages/Progress';
import { NotFound } from './pages/NotFound';

function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create-plan" element={<CreatePlan />} />
        <Route path="/study/:planId/:dayId" element={<StudySession />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
