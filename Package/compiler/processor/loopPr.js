class ForProcessor {
  constructor(core) {
    this.core = core;
  }

  process(node, expr) {
    const children = node.children || []
    const core = this.core;

    // Parse "item in items"
    const [itemName, source] = expr.split(" in ").map(s => s.trim());
    const createChildrenId = core.uidGen.nextCreateChildren() 

    core.add(`
     function ${createChildrenId}(_$root,${itemName}) {
    `)
    core.path.push("_$root")
    core.obj.html += "<template>";
    core.processChildren(children);
    core.obj.html += "</template>";
    core.path.pop()
    const elId = core.uidGen.nextElement();
    const tplId = core.uidGen.nextTemplate();
    const loopParent = core.uidGen.nextLoop()
    const cloneId = core.uidGen.nextCloneId()
    const mapId = core.uidGen.nextMap()
  
    core.add(`
  return _$root.f }
const ${elId} = ${core.joinPath()}
const ${tplId} = ${elId}.f
${tplId}.remove()
const ${cloneId} = ${tplId}.cloneNode(true)
const ${mapId} = []

${source}.forEach((_$local,index) => {
  const _$root = ${cloneId}.cloneNode(true)
  const _$out = ${createChildrenId}(_$root.content, _$local)
  ${mapId}.push(_$out)
  ${elId}.appendChild(_$out)
})

_$.useEffect((config=null) => {
  const data = ${source}
  if (!config) return ;
  const index = config.index
  if (config.push){
    const _$root = ${cloneId}.cloneNode(true)
    const _$out = ${createChildrenId}(_$root.content, data[index] )
    ${elId}.appendChild(_$out)
    ${mapId}.push(_$out)
  } else if (config.setAt){
    const _$root = ${cloneId}.cloneNode(true)
    const _$out = ${createChildrenId}(_$root.content, data[index])
    ${mapId}[index].replaceWith(_$out)
    ${mapId}[index] = _$out
  } else if (config.remove){
    ${mapId}[index].remove()
    ${mapId}.splice(index, 1)
  }
  
});
    `);
    
    return { shouldProcessChildren: false };
  }
}

export default ForProcessor;
