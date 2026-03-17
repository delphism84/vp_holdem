import { BrowserRouter, Routes, Route } from 'react-router-dom'
import GamePageNew from './pages/GamePageNew'
import LobbyPage from './pages/LobbyPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LobbyPage />} />
        <Route path="/game" element={<GamePageNew />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
