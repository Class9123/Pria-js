import uidGenerator from "./helpers/uid.js";
import Conditional from "./processor/conditional.js";
import LoopPr from "./processor/loopPr.js";
import generate from "@babel/generator"
import * as t from "@babel/types"
import {
  formatJs,
  resolveImportedPath,
  isComponentTag
} from "./helpers/index.js"
const str = (d) => JSON.stringify(d, null, 2)


class Transformer {
  buildLogicalChildPaths(childPaths) {
    const logical = [];
    let buffer = [];

    const flush = () => {
      if (buffer.length) {
        logical.push(buffer);
        buffer = [];
      }
    };

    for (const childPath of childPaths) {
      if (
        childPath.isJSXText() ||
        childPath.isJSXExpressionContainer()
      ) {
        buffer.push(childPath);
      } else {
        flush();
        logical.push(childPath);
      }
    }

    flush();
    return logical;
  }

  joinPath() {
    for (let i = this.path.length - 1; i >= 0; i--) {
      const it = this.path[i];
      if (it.startsWith("_$")) return this.path.slice(i).join(".");
    }
    return "";
  }

  add(js) {
    this.obj.script += js + "\n";
  }

  process(path) {
    if (!path) return;

    // 🔹 GROUP (array of NodePaths)
    if (Array.isArray(path)) {
      const id = this.uidGen.nextTextNode();
      let hasExpr = false;

      const expr = path.map(p => {
        if (p.isJSXText()) {
          this.obj.html += p.node.value;
          return JSON.stringify(p.node.value);
        }

        hasExpr = true;
        return `String(${generate.default(p.node.expression).code})`
      }).join(" + ");

      if (hasExpr) {
        this.obj.html += " ";
        this.add(`
          const ${id} = ${this.joinPath()}
          _$.useEffect(()=>{
          ${id}.nodeValue = ${expr};
          });
          `);
      }

      return;
    }

    // 🔹 JSX ELEMENT
    if (path.isJSXElement()) {
      const node = path.node;
      const opening = node.openingElement;
      const tag = opening.name.name;
      const isVoid = opening.selfClosing;

      if (isComponentTag(tag)) {
        const binding = path.scope.getBinding(tag)
        if (binding.path.isImportDefaultSpecifier() === true || binding.path.isImportSpecifier() === true) {} else {
          this.obj.deps.push({
            filePath: "self" , 
            name : tag
          })
        }
        const id = this.uidGen.nextElement();
        this.add(`
        const ${id} = ${this.joinPath()}
        _$.setParent(${id})
         ${tag}()
        `)
        this.obj.html += `<${tag}/>`;

        return;
      }

      this.obj.html += `<${tag}`;

      opening.attributes.forEach(attr => {
        if (t.isStringLiteral(attr.value)) {
          this.obj.html += ` ${attr.name.name}="${attr.value.value}" `;
        }

        if (t.isJSXExpressionContainer(attr.value)) {
          const key = attr.name.name;
          const expr = generate.default(attr.value.expression).code;
          const id = this.uidGen.nextElement();

          this.add(`
            const ${id} = ${this.joinPath()}
            _$.useEffect(()=>{
            ${id}.setAttribute("${key}", ${expr});
            });
            `);
        }
      });

      if (isVoid) {
        this.obj.html += "/>";
        return;
      }

      this.obj.html += `>`;
      this.processChildren(path);
      this.obj.html += `</${tag}>`;
    }
  }

  processChildren(parentPath) {
    const childPaths = parentPath.get("children");
    const logicalChildren = this.buildLogicalChildPaths(childPaths);

    const pathCopy = [...this.path];

    for (let i = 0; i < logicalChildren.length; i++) {
      if (this.path.length % 6 === 0) {
        const id = this.uidGen.nextRefrence();
        this.add(`const ${id} = ${this.joinPath()}`);
        this.path.push(id);
      }

      this.path.push(i === 0 ? "f": "n");
      this.process(logicalChildren[i]); // ✅ group OR NodePath
    }

    this.path = pathCopy;
  }

  transform(jsXpath, filePath) {
    this.processors = {
      $if: new Conditional(this),
      $for: new LoopPr(this)
    };
    this.filePath = filePath;
    this.obj = {
      html: "",
      script: "",
      deps: []
    };
    this.path = ["_$root"];
    this.uidGen = uidGenerator();

    this.process(jsXpath);

    return this.obj;
  }
}

export default function build(jsXpath, priImports, absFilePath) {
  const transformer = new Transformer();
  return transformer.transform(jsXpath, absFilePath);
}