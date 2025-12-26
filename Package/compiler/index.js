import fs from "fs";
import parser from "@babel/parser";
import tr from "@babel/traverse";
const traverse = tr.default
import * as t from "@babel/types";
import generate from "@babel/generator"
import {
  cacheMap
} from "../pria-plugin/scanComponent.js"
import build from "./transformer.js"


function hasJsxReturn(fnPath) {
  let found = false;

  // implicit return: () => <div />
  if (
    fnPath.isArrowFunctionExpression() &&
    t.isJSXElement(fnPath.node.body)
  ) {
    return true;
  }

  fnPath.traverse({
    ReturnStatement(path) {
      if (t.isJSXElement(path.node.argument)) {
        found = true;
        path.stop();
      }
    },
  });

  return found;
}

export default function compilePria(code, filePath) {

  const ast = parser.parse(code,
    {
      sourceType: "module",
      plugins: ["jsx"],
    });

  const exportedFunctionPaths = new Map();
  let defaultExportName = null;


  traverse(ast,
    {
      ExportDefaultDeclaration(path) {
        const decl = path.node.declaration;

        // export default function () {}
        if (t.isFunctionDeclaration(decl)) {
          const fnPath = path.get("declaration");
          if (hasJsxReturn(fnPath)) {
            exportedFunctionPaths.set("default", fnPath);
            defaultExportName = "default";
          }
        }

        // export default () => <JSX />
        if (t.isArrowFunctionExpression(decl)) {
          const fnPath = path.get("declaration");
          if (hasJsxReturn(fnPath)) {
            exportedFunctionPaths.set("default", fnPath);
            defaultExportName = "default";
          }
        }

        // export default App
        if (t.isIdentifier(decl)) {
          const binding = path.scope.getBinding(decl.name);
          if (binding && binding.path.isFunction()) {
            if (hasJsxReturn(binding.path)) {
              exportedFunctionPaths.set("default", binding.path);
              defaultExportName = "default";
            }
          }
        }
      },

      ExportNamedDeclaration(path) {
        const decl = path.node.declaration;

        // export function App() {}
        if (t.isFunctionDeclaration(decl)) {
          const fnPath = path.get("declaration");
          if (hasJsxReturn(fnPath)) {
            exportedFunctionPaths.set(decl.id.name, fnPath);
          }
        }

        // export const App = () => {}
        if (t.isVariableDeclaration(decl)) {
          for (const d of decl.declarations) {
            if (
              t.isIdentifier(d.id) &&
              (t.isArrowFunctionExpression(d.init) ||
                t.isFunctionExpression(d.init))
            ) {
              const binding = path.scope.getBinding(d.id.name);
              if (binding && hasJsxReturn(binding.path.get("init"))) {
                exportedFunctionPaths.set(d.id.name, binding.path.get("init"));
              }
            }
          }
        }

        // export { App }
        for (const spec of path.node.specifiers || []) {
          const binding = path.scope.getBinding(spec.local.name);
          if (binding && binding.path.isFunction()) {
            if (hasJsxReturn(binding.path)) {
              exportedFunctionPaths.set(spec.exported.name, binding.path);
            }
          }
        }
      },
    });

  const output = {
    html:{}
  };
  let jsCode ; 

  for (const [name, fnPath] of exportedFunctionPaths.entries()) {
    const jsxResults = [];

    fnPath.traverse({
      JSXElement(path) {
        const {
          html, script
        } = build(jsxToCustomAst(path.node), [], "")
        const wrapped = ` ( function (){ ${script}} )() `
        const newAst = parser.parseExpression(wrapped)
        output.html["default"] = html
        path.replaceWith(newAst)
      },
    });

  }

  const outputCode = generate.default(ast,
    {},
    code).code;
  output.script = outputCode
    
  return output;
}


  function getJsxTypeName(name) {
    if (t.isJSXIdentifier(name)) {
      return name.name;
    }

    if (t.isJSXMemberExpression(name)) {
      return `${getJsxTypeName(name.object)}.${getJsxTypeName(name.property)}`;
    }

    if (t.isJSXNamespacedName(name)) {
      return `${name.namespace.name}:${name.name.name}`;
    }

    return null;
  }

  function getAttrName(name) {
    if (t.isJSXIdentifier(name)) {
      return name.name;
    }

    if (t.isJSXNamespacedName(name)) {
      return `${name.namespace.name}:${name.name.name}`;
    }

    return null;
  }

  function jsxToCustomAst(node) {
    // ---------- Text ----------
    if (t.isJSXText(node)) {
      const text = node.value;
      if (!text.trim()) return null;

      return {
        type: "#grouped",
        children :[
          { type:"#text", nodeValue: text }
        ]
      };
    }

    // ---------- Expressions ----------
    if (t.isJSXExpressionContainer(node)) {
      return {
        type: "#jsx",
        nodeValue: generate.default(node.expression).code
      };
    }

    // ---------- JSX Element (div, motion.div, Component) ----------
    if (t.isJSXElement(node)) {
      const opening = node.openingElement;
      const typeName = getJsxTypeName(opening.name);

      let props = {};
      for (const attr of opening.attributes) {
        if (t.isJSXSpreadAttribute(attr)) {
          props[attr.argument.name] = {
            type: "#spread",
            nodeValue: attr.argument.name
          }
        }
        if (!t.isJSXAttribute(attr)) continue;

        const key = getAttrName(attr.name);

        if (!attr.value) {
          props[key] = true;
          continue;
        }

        if (t.isStringLiteral(attr.value)) {
          props[key] = attr.value.value;
          continue;
        }

        if (t.isJSXExpressionContainer(attr.value)) {
          props[key] = {
            type: "#jsx",
            nodeValue: generate.default(attr.value.expression).code
          };
        }
      }

      const children = node.children
      .map(jsxToCustomAst)
      .filter(Boolean);

      return {
        type: typeName,
        // motion.div, div, Component
        props,
        children
      };
    }

    // ---------- JSX Fragment <>...</> ----------
    if (t.isJSXFragment(node)) {
      const children = node.children
      .map(jsxToCustomAst)
      .filter(Boolean);

      return {
        type: "fragment",
        props: {},
        children
      };
    }

    return null;
  }