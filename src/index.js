Object.defineProperties(Node.prototype, {
  f: {
    get() {
      return this.firstChild;
    }
  },
  n: {
    get() {
      return this.nextSibling;
    }
  },
  p: {
    get() {
      return this.previousSibling;
    }
  }
});
import App from "./App.pri";
const start = performance.now();
const root = document.getElementById("app");
App(root.firstElementChild);
root.style.display = "";

console.log("-----+--♥️------");
const end = performance.now();
console.log(`Timen taken To load ${(end - start).toFixed(7)}ms`);
