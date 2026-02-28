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
    This is the header
    <Nav />
  </header>
}

export function App() {
  const [count,
    setCount] = useState(0)
  setInterval(()=> {
    setCount(p => p+ 1)
  }, 600)
  return <div class="flex justify-center bg-red-100 h-screen w-screen">
    Hello
    <Header />
    {count() + 90 }
  </div>
}

export default App;