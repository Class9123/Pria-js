import fs from "fs";
import parser from "@babel/parser";
import tr from "@babel/traverse";
const traverse = tr.default
import * as t from "@babel/types";
import generate from "@babel/generator"
import build from "./transformer.js"

const str = (d) => JSON.stringify(d, null, 1)

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

function ensurePriyInternalImport(ast) {
  const body = ast.program.body;

  // 1️⃣ Check if already imported
  for (const node of body) {
    if (
      t.isImportDeclaration(node) &&
      node.source.value === "pria/internal"
    ) {
      // reuse existing default import name
      const def = node.specifiers.find(s =>
        t.isImportDefaultSpecifier(s)
      );
      return def?.local.name || null;
    }
  }

  // 2️⃣ Not imported → inject
  const localName = "_$";

  const importDecl = t.importDeclaration(
    [t.importDefaultSpecifier(t.identifier(localName))],
    t.stringLiteral("pria/internal")
  );

  // 3️⃣ Insert after last import
  let insertIndex = 0;
  while (
    insertIndex < body.length &&
    t.isImportDeclaration(body[insertIndex])
  ) {
    insertIndex++;
  }

  body.splice(insertIndex, 0, importDecl);

  return localName;
}


export default function compilePria(code, filePath) {

  const ast = parser.parse(code,
    {
      sourceType: "module",
      plugins: ["jsx"],
    });

  ensurePriyInternalImport(ast)

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
    html: {},
    script: ""
  };
  let jsCode;

  for (const [name, fnPath] of exportedFunctionPaths.entries()) {
    const jsxResults = [];

    fnPath.traverse({
      JSXElement(path) {
        const {
          html, script, deps
        } = build(path, filePath)

        const wrapped = ` ( function (){
          const _$root = _$.getParent()
          ${script}
        } )() `

        const newAst = parser.parseExpression(wrapped)
        output.html[name] =  {
          html,
          deps
        }
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