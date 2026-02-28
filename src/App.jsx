import { useState, useArray, useMemo, useEffect } from "pria";

function Badge() {
  return <strong>Badge</strong>;
}

export default function App() {
  const [count, setCount] = useState(0);
  const todos = useArray(["Ship", "Sleep"]);
  const titleRef = { current: null };

  const status = useMemo(() => (count() > 3 ? "busy" : "chill"));
  const spread ={ class:"text-red-900" ,id:"4"}

  useEffect(() => {
    console.log("status:", status());
  }, [status]);

  return (
    <main>
      <h1 {...spread} $ref={titleRef}>Count: {count()}</h1>

      <p $when={count() % 2 === 0}>Visible only on even counts</p>
      <p $if={count() > 2}>Appears only after 2</p>

      <button onClick={() => setCount(p => p + 1)}>+1</button>
      <button onClick={() => todos.push(`Todo ${count()}`)}>Add Todo</button>
      <button onClick={() => todos.setNew(["Reset"])}>Reset List</button>

      <ul>
        <li $for={tod in todos()}>
          <Badge /> {tod}
        </li>
      </ul>
    </main>
  );
}
