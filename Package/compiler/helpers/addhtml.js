import scanAndCache from "../../pria-plugin/scanComponent.js"

export default function addHtml(obj, cmpName) {
  const {
    html : mainHtml,
    deps
  } = obj.html[cmpName]
  
  let html = mainHtml

  deps.forEach(dep => {
    const {
      filePath,
      name
    } = dep
    let cmpHtml
    if (filePath === "self"){
      const component = obj.html[name]
      cmpHtml = addHtml(obj, name)
    }
    html = html.replace(`<${name}/>`, cmpHtml )
    console.log(html)
  })
  
  return html

}