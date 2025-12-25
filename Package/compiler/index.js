import parse from "../parser/priToAst.js";
import transformAst from "./transformer.js";
import wrapInfunc from "./wrapFunc.js";
import { isElement, formatJs, formatHtml } from "./helpers/index.js";
import * as acorn from "acorn";
import * as astring from "astring";

export default function transformPri(js, Html, absFilePath) {
  const htmlAst = parse(Html, true);
  const jsAst = acorn.parse(js, {
    ecmaVersion: 2022,
    sourceType: "module"
  });

  const rebuild = node => {
    const newChildren = [];
    let group = null;

    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];

      if (!isElement(child)) {
        if (!group) group = { type: "#grouped", children: [] };
        group.children.push(child);
      } else {
        if (group) {
          newChildren.push(group);
          group = null;
        }
        newChildren.push(child);
        if (isElement(child)) rebuild(child);
      }
    }

    if (group) newChildren.push(group);

    node.children = newChildren;
  };

  rebuild(htmlAst);
  
  const priImports = {};
  for (const node of jsAst.body) {
    if (node.type === "ImportDeclaration") {
      const ref = node.specifiers;
      const source = node.source.value;
      if (source.trim().endsWith(".pri")) {
        if (ref.length > 1)
          throw new Error("!!! Components only exports default");
        priImports[ref[0].local.name] = source;
      }
    }
  }

  const obj = transformAst(htmlAst, priImports, absFilePath);
  obj.script = wrapInfunc(obj.script, jsAst);

  //console.log("------", absFilePath);
  //console.log(JSON.stringify(htmlAst, null, 2));
  //console.log("Html --------> \n", obj.html);
  console.log("Js   --------> \n", formatJs(obj.script));

  return obj;
}
