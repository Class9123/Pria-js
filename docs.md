Below is a clean, practical .md reference file focused only on what you actually use in pria-js when working with Babel AST, traversal, JSX, and functions.

This is not generic Babel docs — it’s compiler-oriented, matching your mental model.

You can copy-paste this directly as babel-reference.md.


---

Babel AST & Traversal Reference (Pria-JS Oriented)

This document explains the core Babel APIs, node types, and traversal patterns needed to build a JSX compiler like pria-js.


---

1. Core Babel Packages

@babel/parser

Parses source code into an AST.

import { parse } from "@babel/parser";

const ast = parse(code, {
  sourceType: "module",
  plugins: ["jsx"]
});

Common options:

sourceType: "module" → enables import/export

plugins: ["jsx"] → enables JSX parsing



---

@babel/traverse

Walks the AST and gives path objects.

import traverse from "@babel/traverse";

traverse(ast, {
  FunctionDeclaration(path) {
    // called for each function
  }
});

Traversal is depth-first.


---

@babel/types

Utilities for:

checking node types

creating new AST nodes


import * as t from "@babel/types";

t.isJSXElement(node);
t.nullLiteral();


---

@babel/generator

Converts AST → JavaScript code.

import generate from "@babel/generator";

const { code } = generate(ast);


---

2. AST vs Path (IMPORTANT)

Node

Plain object

No context

No replacement


path.node

Path

Wraps a node

Has scope, parent, helpers


path.replaceWith(...)
path.traverse(...)
path.scope

> You always modify AST using path, never raw nodes.




---

3. Common AST Node Types You Use

Function Nodes

FunctionDeclaration
ArrowFunctionExpression
FunctionExpression

Examples:

function App() {}
const App = () => {}


---

JSX Nodes

JSX Code	AST Node

<div />	JSXElement
div	JSXIdentifier
text	JSXText
{expr}	JSXExpressionContainer



---

4. Traversing Functions That Return JSX

Detect JSX return

function returnsJSX(fnPath) {
  let found = false;

  fnPath.traverse({
    ReturnStatement(p) {
      if (t.isJSXElement(p.node.argument)) {
        found = true;
        p.stop();
      }
    }
  });

  return found;
}

Also covers:

const App = () => <div />


---

5. Traversing JSX Inside a Function

Track “current component”

let currentComponent = null;

traverse(ast, {
  FunctionDeclaration: {
    enter(path) {
      if (returnsJSX(path)) {
        currentComponent = path.node.id.name;
      }
    },
    exit() {
      currentComponent = null;
    }
  },

  JSXElement(path) {
    if (!currentComponent) return;

    // JSX belongs to currentComponent
  }
});

This is how Pria knows which JSX belongs to which function.


---

6. JSXElement Structure

JSXElement {
  openingElement,
  closingElement,
  children
}

Tag name

path.node.openingElement.name.name

"div" → native HTML

"Header" → component



---

Children

node.children.map(child => ...)

Children types:

JSXText

JSXElement

JSXExpressionContainer



---

7. JSX → HTML Conversion Pattern

function build(node) {
  const deps = [];

  function walk(n) {
    if (t.isJSXElement(n)) {
      const name = n.openingElement.name.name;

      if (name[0] === name[0].toUpperCase()) {
        deps.push(name);
        return `<${name} />`;
      }

      const children = n.children.map(walk).join("");
      return `<${name}>${children}</${name}>`;
    }

    if (t.isJSXText(n)) {
      return n.value;
    }

    if (t.isJSXExpressionContainer(n)) {
      return "";
    }

    return "";
  }

  return {
    html: walk(node),
    deps
  };
}


---

8. Replacing JSX in the AST

Remove JSX from runtime JS

path.replaceWith(t.nullLiteral());

Result:

return null;

This ensures:

No JSX at runtime

JS is pure JS



---

9. Traversing Imports (File Graph)

ImportDeclaration(path) {
  const src = path.node.source.value;
  if (src.startsWith(".")) {
    // relative import
  }
}

Used for:

building dependency graph

multi-file compilation



---

10. Scope & Bindings (When Needed)

Find function referenced by identifier

const binding = path.scope.getBinding("Header");

if (binding && binding.path.isFunction()) {
  // Header() definition
}

Useful when:

resolving exported identifiers

following re-exports



---

11. Traversal Rules (DO NOT BREAK)

❌ Don’t do this

traverse(fnNode, visitor); // ❌ needs scope

✅ Correct

path.traverse(visitor);


---

12. Stopping Traversal

path.stop(); // stops entire traversal
path.skip(); // skips children only

Use stop() for early exit (e.g. JSX found).


---

13. Export Detection (Common Patterns)

Handled via:

ExportDefaultDeclaration

ExportNamedDeclaration


But in pria-js file-level compilation makes export detection optional.


---

14. Mental Model Summary (Pria-JS)

Parse file
 ├─ Scan imports
 ├─ Traverse functions
 │    ├─ detect JSX return
 │    ├─ mark component
 │    └─ extract JSX
 ├─ Replace JSX → null
 └─ Generate JS


---

15. Golden Rules

File is the unit of compilation

JSX is compile-time only

Never inline component HTML during JSX extraction

Composition happens later

AST must be fully JSX-free before generate()



---

16. What You Don’t Need (Yet)

Babel plugins API

Visitors with state objects

Code frames / locations

Class components

JSX attributes (can add later)



---

✅ End

This document is enough to:

build a JSX compiler

reason about traversal

avoid Babel traversal errors

extend pria-js safely


If you want next:

JSX attributes & props

Slot / children system

AST error reporting

Babel plugin wrapper


Just tell me.