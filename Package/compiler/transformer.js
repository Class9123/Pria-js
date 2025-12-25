import {
  getTagName,
  isElement,
  isText,
  isJsx,
  isComponentTag,
  getText
} from "./helpers/index.js";
import uidGenerator from "./helpers/uid.js";
import Conditional from "./processor/conditional.js";
import LoopPr from "./processor/loopPr.js";
import ComponentPr from "./processor/componentPr.js";

class Transformer {
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

  process(node) {
    if (!node) return;

    // === Handle text+jsx sequence merging ===
    if (node.type === "#grouped") {
      let textExpr = "";
      let htmlText = "";
      let hasJsx = false;
      let hasText = false;
      
      node.children.forEach((child, i) => {
        if (isText(child)) {
          htmlText += getText(child);
          textExpr += `${i === 0 ? "": "+"} ${JSON.stringify(getText(child))}`;
          hasText = true;
        } else if (isJsx(child)) {
          hasJsx = true;
          textExpr += `${i === 0 ? "": "+"} String(${getText(child)}) `;
        }
      });

      this.obj.html += htmlText;
      if (hasJsx) {
        const id = this.uidGen.nextTextNode();
        this.add(`
          const ${id} = ${this.joinPath()}
          _$.useEffect(()=>{
          ${id}.nodeValue = ${textExpr};
          });
          `);
      }
      if (!hasText) {
        this.obj.html += " ";
      }
    }

    // === Element Node ===
    else if (isElement(node)) {
      const isVoid = node.isVoidTag
      const tag = getTagName(node);
      const specialAttr = []
      const normalAttr = [];
      const configuration = {
        shouldProcessChildren: true
      };

      for (const [key, value] of Object.entries(node.props)) {
        if (key.startsWith("$") || key.includes(":")) {
          specialAttr.push([key, value]);
        } else {
          normalAttr.push([key, value]);
        }
      }

      if (isComponentTag(tag)) {
        this.processors["component"].process(node);
        return;
      }

      this.obj.html += `<${tag}`;

      normalAttr.forEach(([key, value]) => {
        if (isJsx(value)) {
          const expr = getText(value);
          const id = this.uidGen.nextElement();
          this.add(`
            const ${id} = ${this.joinPath()}
            _$.useEffect(()=>{
            ${id}.setAttribute("${key}", ${expr});
            });
            `);
        } else if (typeof value !== "object") {
          this.obj.html += ` ${key}="${value}"`;
        }
      });
      if (!isVoid) this.obj.html += ">";
      else this.obj.html += "/>"

      for (let i = 0; i < specialAttr.length; i++) {
        const arr = specialAttr[i]
        const name = arr[0];
        const propVl = arr[1].nodeValue;
        const id = this.uidGen.nextElement();
        if (name.includes(":") && name.split(":")[0] === "on") {
          this.add(`
            const ${id} = ${this.joinPath()}
            _$.useEffect(()=>{
            ${id}.on${name.split(":")[1]} = ${propVl}
            })
            `)
        } else if (name.startsWith("$")) {
          configuration.shouldProcessChildren = this.processors[name].process(node, propVl).shouldProcessChildren
        }
      }

      if (configuration.shouldProcessChildren)
        this.processChildren(node.children);
      if (!isVoid) this.obj.html += `</${tag}>`;
    }
  }

  processChildren(children) {
    const pathCopy = [...this.path];
    for (let i = 0; i < children.length; i++) {
      if (this.path.length % 6 === 0) {
        const id = this.uidGen.nextRefrence();
        this.add(`
          const ${id} = ${this.joinPath()}
          `);
        this.path.push(id);
      }
      if (i === 0) this.path.push("f");
      else this.path.push("n");

      const child = children[i];
      this.process(child);
    }
    this.path = pathCopy;
  }

  transform(ast, priImports, filePath) {
    this.processors = {
      $if: new Conditional(this),
      $for: new LoopPr(this),
      component: new ComponentPr(this)
    };
    this.filePath = filePath;
    this.priImports = priImports;
    this.obj = {
      html: "",
      script: ""
    };
    this.path = ["_$root"];
    this.uidGen = uidGenerator();
    this.process(ast);
    return this.obj;
  }
}

export default function build(HtmlAst, priImports, absFilePath) {
  const transformer = new Transformer();
  return transformer.transform(HtmlAst, priImports, absFilePath);
}