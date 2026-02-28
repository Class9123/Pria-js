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
import _$ from "pria/internal"
const root = document.getElementById("app");
_$.setParent(root.firstElementChild)
App();
root.style.display = "";
