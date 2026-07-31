import { Link, Route, Routes } from 'react-router-dom';
import { RosterPage } from './pages/RosterPage.js';
import { ComparePage } from './pages/ComparePage.js';
import './App.css';

function App() {
  return (
    <div className="app">
      <nav className="app-nav">
        <Link to="/">Roster</Link>
        <Link to="/compare">Compare</Link>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<RosterPage />} />
          <Route path="/compare" element={<ComparePage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
