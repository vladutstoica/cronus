import { HashRouter, Route, Routes } from 'react-router-dom'
import { MainAppContent } from './App'
import './assets/custom-title-bar.css'
import { PageContainer } from './components/layout/PageContainer'
import Spinner from './components/ui/Spinner'
import { useAuth } from './contexts/AuthContext'

function AppWrapper(): React.JSX.Element {
  const { isLoading: isAuthLoading } = useAuth()

  if (isAuthLoading) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center h-full">
          <Spinner />
          <div className="mt-4 text-gray-500">Loading...</div>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <Routes>
        <Route path="/" element={<MainAppContent />} />
      </Routes>
    </PageContainer>
  )
}

function App(): React.JSX.Element {
  return (
    <HashRouter>
      <AppWrapper />
    </HashRouter>
  )
}

export default App
