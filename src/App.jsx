import {
  useState
} from "pria"

export function Nav() {
  return <nav>
    Navbar here
    {50}
  </nav>
}

export function Header() {
  return <header>
    This is the fucking header
    <Nav />
  </header>
}

export function App() {
  return <div>
    <Header />
    This is the App {50}
  </div>
}

export default App;