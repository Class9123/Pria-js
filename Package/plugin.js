import scanAndCache from "./pria-plugin/scanComponent.js";
import fs from "fs";

export default function Scan() {
  const rootFile = "/data/data/com.termux/files/home/Pria-js/src/App.pri";

  return {
    name: "vite-scan-priaJs-plugin",
    configureServer(server) {
      scanAndCache(rootFile)
      server.watcher.add(rootFile);
    },

    transformIndexHtml(indexHtml) {
      const {
        html
      } = scanAndCache(rootFile);

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
      if (!id.endsWith(".pri")) return null;
      const absFile = id;
      const data = scanAndCache(absFile);

      const {
        script
      } = data;
      console.log(script)
      return script;
    },
    handleHotUpdate( {
      file, server, modules
    }) {
      if (!file.endsWith(".pri")) return [];
      console.log("Called")
      scanAndCache(file)
      server.restart()
    }

  };
}