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
import App from "./App.jsx";
const root = document.getElementById("app");
App(root.firstElementChild);
root.style.display = "";
