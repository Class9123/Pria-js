import {
  useState,
  useArray
} from "pria";
import T from "./t.pri"

const arr = useArray(["mango","fruit","Bananas","litchis"]) 
const [input, setInput] = useState("input")
const [index, setIndex] = useState(0)
function add() {
  arr.push(input())
}
function replace() {
  arr.setAt(index(), input())
}
function remove() {
  arr.remove(index())
}

<div class="flex justify-center items-center flex-col">
  <input class="border-2 border-black rounded-2xl p-3 outline-none m-3" on:input={e => setInput(e.target.value)} value={input()} />
  <input class="border-2 border-black rounded-2xl p-3 outline-none m-3" on:input={e => setIndex(Number(e.target.value))} value={index()} />
  <p class='text-center'>
  {input()}
  <br/>
   {index()}
  </p>
  <button on:click={add} >add</button>
  <button on:click={replace} >replace</button>
  <button on:click={remove} >remove</button>
  <h1>Fruits</h1>
  <div $for={fruit in arr()}>
    <p>This is fruit {fruit}</p>
  </div>
  <T/>
  <T/>
  <T/>
  <T/>
</div>