import scanAndCache from "./pria-plugin/scanComponent.js";
import fs from "fs";

export default function Scan() {
  const rootFile = "/data/data/com.termux/files/home/Pria-js/src/App.jsx";

  return {
    name: "vite-scan-priaJs-plugin",
    configureServer(server) {
      scanAndCache(rootFile)
      server.watcher.add(rootFile);
    },

    transformIndexHtml(indexHtml) {
      let html 
      const data = scanAndCache(rootFile);

      if (data) html = data.html["default"] 
      else html = "Dev time"

      indexHtml = indexHtml.replace(
        /<div id="app">\s*<\/div>/,
        `<div id="app">${html}</div> 
        <script> 
        console.log(\`${html}\`)
        </script>`
      );
      return indexHtml
    },

    load(id) {
      if (!id.endsWith(".jsx")) return null;
      const absFile = id;
      const data = scanAndCache(absFile);
      let script ;
      if (data) script = data.script 
      else script=`
      export default function App(){
        console.log("Dev time ")
      }
      `
      
      console.log(script)
      return script;
    },
    handleHotUpdate( {
      file, server, modules
    }) {
      if (!file.endsWith(".jsx")) return [];
      scanAndCache(file)
      server.restart()
    }

  };
}