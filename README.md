# Pria

> ⚠️ **Experimental Project** — Pria is in early development. APIs are unstable and subject to change. Not recommended for production use.

**Pria** is a compile-time, HTML-first reactive framework that turns your JSX into real HTML strings and minimal JavaScript—no Virtual DOM, no runtime diffing, no `querySelector` lookups.

---

## Why Pria Exists

Most modern frameworks do a lot of work in the browser:

- React builds a Virtual DOM and diffs it against the real DOM
- Vue compiles templates at runtime or uses a runtime renderer
- Components are often re-executed or re-rendered to detect changes

Pria takes a different approach: **do as much as possible at compile time**.

Instead of shipping a large runtime that figures out what changed and how to update the DOM, Pria:

1. **Compiles your JSX into static HTML** at build time
2. **Generates tiny JavaScript** that knows exactly which DOM nodes to update
3. **Avoids runtime guesswork** by calculating DOM paths during compilation

The result? Your server can send plain HTML, and the browser runs minimal JavaScript to make it interactive.

---

## How Pria Works

### The Big Idea

When you write a component in Pria, the compiler:

1. **Reads your JSX** and figures out which parts are static (never change) and which are dynamic (change based on state)
2. **Generates an HTML string** for the entire component
3. **Generates JavaScript code** that updates only the dynamic parts

Here's the key innovation: **Pria doesn't use `querySelector` to find DOM elements.**

Instead, it builds a **deterministic path** to each dynamic node using `.firstChild` and `.nextSibling` during compilation. This means the JavaScript knows exactly where to go in the DOM tree without searching.

---

## DOM Traversal: No More `querySelector`

### The Problem with `querySelector`

Most frameworks update the DOM like this:

```javascript
// Find the element by class or ID
const element = document.querySelector('.count');
// Update it
element.textContent = newValue;
```

This is slow because:
- The browser has to search the entire DOM tree
- It happens over and over for every update
- You need to add classes or IDs to everything

### Pria's Solution: Compile-Time Paths

Pria knows the exact structure of your HTML at compile time. So instead of searching, it generates code that walks directly to the right node:

```javascript
// Start at the root
let node = rootElement.firstChild;  // Go to first child
node = node.nextSibling;            // Move to next sibling
node.textContent = newValue;        // Update it
```

### Step-by-Step Example

Let's say you write this component:

```jsx
function Counter() {
  return (
    <div>
      <h1>Count</h1>
      <p>{count}</p>
    </div>
  );
}
```

**At compile time**, Pria analyzes the structure:

```
div (root)
├── h1 ("Count")          ← Static, never changes
└── p                      ← Container for dynamic content
    └── {count}            ← Dynamic! Needs updates
```

**Pria generates:**

1. **HTML output:**
   ```html
   <div><h1>Count</h1><p>0</p></div>
   ```

2. **JavaScript output:**
   ```javascript
   // Navigate to the <p> tag's text node
   let node = root.firstChild.nextSibling.firstChild;
   
   // Update function
   function updateCount(newValue) {
     node.textContent = newValue;
   }
   ```

**Why this is faster:**

- No searching: we go directly to the node
- No overhead: just simple property access
- Predictable: the path never changes

---

## Compilation Model

Pria's compilation happens in several clear steps:

### 1. **Entry Point Scanning**
Pria starts with your main file (e.g., `app.js`) and finds all component functions.

### 2. **JSX Detection**
The compiler looks for JSX inside function bodies using Babel to parse the code into an Abstract Syntax Tree (AST).

### 3. **Static Analysis**
For each piece of JSX, Pria determines:
- Which parts are **static** (plain text, fixed attributes)
- Which parts are **dynamic** (expressions like `{count}`)

### 4. **HTML Generation**
Pria walks the JSX tree and builds an HTML string. Dynamic values are replaced with their initial state.

### 5. **JavaScript Generation**
For every dynamic piece, Pria:
- Calculates the DOM path (e.g., "first child, then next sibling")
- Generates an update function that follows that path

### 6. **Output**
Two files are created:
- `component.html` — The static HTML markup
- `component.js` — The reactive update logic

---

## Output Format

Pria separates concerns clearly:

### HTML Output (Per Component)

```html
<!-- Counter.html -->
<div><h1>Counter</h1><p>0</p></div>
```

This HTML can be:
- Cached by a CDN
- Pre-rendered on the server
- Streamed to the browser
- Reused across requests

### JavaScript Output (Per File)

```javascript
// Counter.js
function setupCounter(root, initialCount) {
  // Navigate to the dynamic text node
  let countNode = root.firstChild.nextSibling.firstChild;
  
  // Update function
  function updateCount(newValue) {
    countNode.textContent = newValue;
  }
  
  // Initial setup
  updateCount(initialCount);
  
  return { updateCount };
}
```

This JavaScript:
- Is minimal and focused
- Runs only when values change
- Has zero framework overhead

---

## Examples

### Input: Simple Counter

```jsx
function Counter() {
  return (
    <div>
      <h1>Count: {count}</h1>
      <button>Increment</button>
    </div>
  );
}
```

### Output: Generated HTML

```html
<div>
  <h1>Count: 0</h1>
  <button>Increment</button>
</div>
```

### Output: Generated JavaScript

```javascript
function setupCounter(root, count) {
  // Path to the text node inside <h1>
  // root -> div -> h1 -> firstChild (text "Count: ")
  // -> nextSibling (dynamic text node)
  let countNode = root.firstChild.firstChild;
  
  // Find the dynamic part after "Count: "
  while (countNode && countNode.nodeType !== 3) {
    countNode = countNode.nextSibling;
  }
  
  function updateCount(newValue) {
    countNode.textContent = 'Count: ' + newValue;
  }
  
  updateCount(count);
  return { updateCount };
}
```

---

## Current Capabilities

### ✅ Implemented

- **JSX compilation** — Functions with JSX are detected and processed
- **Static HTML generation** — Each component outputs an HTML string
- **Reactive updates** — Dynamic values generate update functions
- **Attribute bindings** — Props and attributes are supported
- **Text and expression grouping** — Adjacent text/expressions are batched
- **Conditional rendering** — Basic `if` statement support
- **Loop support** — Array mapping is processed
- **Direct DOM references** — No `querySelector`, only `.firstChild`/`.nextSibling`

### 🚧 Work in Progress

> **Important:** These features are under active development and may not work reliably yet.

- **Cross-file component imports** — Importing components from other files
- **Nested component resolution** — Handling components that use other components
- **Full dependency graph** — Tracking relationships between components
- **Stable public API** — APIs may change without notice
- **Error messages** — Compiler errors are minimal and may be unclear

---

## Philosophy

### HTML is Primary

Pria treats HTML as a first-class output, not an afterthought. The HTML you generate is real, valid markup that works without JavaScript.

### JavaScript is for Interactivity

JavaScript exists only to update dynamic parts. If nothing changes, no JavaScript runs.

### Compile Time > Runtime

Decisions made at compile time don't need to be made in the browser. Pria pushes as much work as possible into the build step.

### No Magic

Pria doesn't do runtime magic or hidden transformations. What you write is close to what you get.

---

## Comparison with Other Frameworks

| Feature | Pria | React | Vue | Solid |
|---------|------|-------|-----|-------|
| **Compilation** | Compile-time only | Runtime + optional pre-compile | Runtime + compile options | Compile-time reactive |
| **HTML Output** | Real HTML strings | Virtual DOM (JSX) | Template strings | JSX compiled to DOM |
| **DOM Updates** | Direct node references | Virtual DOM diffing | Reactive template updates | Fine-grained reactivity |
| **DOM Lookups** | `.firstChild`/`.nextSibling` | `querySelector` or refs | Template bindings | Direct references |
| **Runtime Size** | Minimal (~1-2kb) | ~40kb+ | ~30kb+ | ~7kb+ |
| **Hydration** | Direct attachment | Full tree reconciliation | Template matching | Granular hydration |

### Key Differences

**vs React:**
- React diffs a Virtual DOM at runtime; Pria generates HTML at build time
- React uses hooks and re-renders; Pria uses direct updates
- React requires a large runtime; Pria's runtime is minimal

**vs Vue:**
- Vue compiles templates into render functions; Pria outputs HTML strings
- Vue uses reactive proxies; Pria uses explicit update functions
- Vue has a template syntax; Pria uses JSX

**vs Solid:**
- Both compile reactivity at build time
- Solid uses fine-grained reactive primitives; Pria uses explicit paths
- Solid stays in the DOM; Pria outputs HTML separately

---

## Current Limitations

Since Pria is experimental, here are the known limitations:

### Architecture
- No component imports across files yet
- No nested component resolution
- No component prop validation
- Limited error reporting

### Features
- No event handling system yet
- No built-in state management
- No lifecycle hooks
- No context or global state

### Developer Experience
- No TypeScript support yet
- No IDE plugins
- No dev server
- No hot module reloading

---

## Roadmap

### Near Term
- [ ] Component import resolution
- [ ] Event handler compilation
- [ ] Basic state management primitives
- [ ] Improved error messages

### Medium Term
- [ ] TypeScript support
- [ ] Dev server with HMR
- [ ] Component composition patterns
- [ ] Testing utilities

### Long Term
- [ ] Streaming SSR
- [ ] Partial hydration
- [ ] IDE tooling
- [ ] Performance profiling tools

---

## Project Status

**Pria is an experimental research project.** It explores what's possible when you prioritize:

- Compile-time optimization
- HTML-first thinking
- Minimal runtime overhead
- Predictable DOM updates

If you're interested in:
- How compilers work
- Framework internals
- Performance optimization
- Alternative frontend architectures

...then Pria might be an interesting learning resource.

**Not ready for production.** Use at your own risk.

---

## Contributing

Pria is open to contributions, feedback, and ideas. Since the project is in early stages, expect breaking changes.

---

## License

MIT (Placeholder — confirm license details before distribution)

---

## Learn More

To understand Pria's internals:

1. Read the source code (it's intentionally kept simple)
2. Look at the generated HTML and JS outputs
3. Experiment with small examples
4. Compare with other compile-time frameworks like Solid and Svelte

---

**Built with curiosity. Compiled with care.**
