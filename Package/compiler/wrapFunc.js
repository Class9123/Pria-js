
import * as astring from "astring";

export default function wrap(Htmlscript, jsAst) {
  const importStmts = [];
  const otherNodes = [];

  for (const node of jsAst.body) {
    if (node.type === "ImportDeclaration") {
      importStmts.push(astring.generate(node));
    } else {
      otherNodes.push(node);
    }
  }

  const setupBody = otherNodes.map(astring.generate).join("\n");

  const script = `
  import _$ from "pria/internal";
  ${importStmts.join("\n")}
  
  export default function Hydrate(_$root, props={}) {
    ${setupBody}
    ${Htmlscript}
  }`;

  
  return script.trim();
}
