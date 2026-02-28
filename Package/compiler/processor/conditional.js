class Conditional {
  constructor(transformer) {
    this.core = transformer;
  }

  process(node, propVl) {
    const core = this.core 
    const children = node.children || []
    core.obj.html += "<template>";
    const tmpId = core.uidGen.nextTemplate();
    const cmId = core.uidGen.nextComment();
    const elmId = core.uidGen.nextElement();
    const prevConId = core.uidGen.nextPrevCondition();
    const lastPath = core.path[core.path.length - 1];
    core.add(`
    const ${elmId} = ${core.joinPath()}
    const ${tmpId} = ${elmId}.f
    const ${cmId} = document.createComment("con")
    ${tmpId}.replaceWith(${tmpId}.content.cloneNode(true))
    
    let ${prevConId} = null;
          `);
    core.processChildren(children);
    core.obj.html += "</template>";
    
    core.add(`
    _$.useEffect(()=>{
      const _$con = ${propVl}
      if (${prevConId} === _$con) return
        if (_$con) ${cmId}.replaceWith(${elmId})
        else ${elmId}.replaceWith(${cmId})
        ${prevConId} = _$con
    })
    `);
            
    return {
      shouldProcessChildren: false
    };
  }
}
export default Conditional;
