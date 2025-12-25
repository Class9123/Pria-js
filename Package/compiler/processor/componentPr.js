import {
  getTagName,
  resolveImportedPath
} from "../helpers/index.js";
import scanAndCache from "../../pria-plugin/scanComponent.js"

class ComponentProcessor {
  constructor(core) {
    this.core = core;
  }
  process(node) {
    const tag = getTagName(node)
    const core = this.core;
    const path = resolveImportedPath(core.filePath, core.priImports[tag]);
    const obj = scanAndCache(path);

    core.obj.html += obj.html;
    const id = core.uidGen.nextElement();
    let props = "{ ";
    for (const key in node.props) {
      const valueNode = node.props[key];
      if (valueNode.type === "#jsx") {
        props += ` '${key}': ${valueNode.nodeValue}, `;
      } else {
        props += ` '${key}':'${valueNode}' ,`;
      }
    }
    props += "}";

    core.add(`
        const ${id} = ${core.joinPath()}
         ${tag}(${id}, ${props})
        `);
  }
}


export default ComponentProcessor;
