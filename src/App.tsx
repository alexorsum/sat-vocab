import { HashRouter, Route, Routes } from 'react-router-dom';
import { AppProvider } from './state/app';
import Layout from './components/Layout';
import Home from './pages/Home';
import Review from './pages/Review';
import Learn from './pages/Learn';
import Practice from './pages/Practice';
import Quiz from './pages/Quiz';
import Roots from './pages/Roots';
import RootDetail from './pages/RootDetail';
import RootQuiz from './pages/RootQuiz';
import Mistakes from './pages/Mistakes';
import Browse from './pages/Browse';
import WordPage from './pages/WordPage';
import Progress from './pages/Progress';
import Game from './pages/Game';
import HowItWorks from './pages/HowItWorks';
import SettingsPage from './pages/Settings';
import NotFound from './pages/NotFound';

// A hash router keeps every page working on GitHub Pages, which only serves index.html at the root.
export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="review" element={<Review />} />
            <Route path="learn" element={<Learn />} />
            <Route path="practice" element={<Practice />} />
            <Route path="quiz" element={<Quiz />} />
            <Route path="roots" element={<Roots />} />
            <Route path="roots/quiz" element={<RootQuiz />} />
            <Route path="roots/:id" element={<RootDetail />} />
            <Route path="mistakes" element={<Mistakes />} />
            <Route path="browse" element={<Browse />} />
            <Route path="word/:id" element={<WordPage />} />
            <Route path="progress" element={<Progress />} />
            <Route path="game" element={<Game />} />
            <Route path="how" element={<HowItWorks />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppProvider>
  );
}
