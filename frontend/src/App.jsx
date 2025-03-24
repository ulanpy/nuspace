import Homepage from './pages/Homepage'
import { TokenRefresher } from './utils/TokenRefresher'

function App() {
  return (
    <>
      <TokenRefresher/>
      <Homepage/>
    </>
  )
}

export default App
