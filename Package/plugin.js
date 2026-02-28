import scanAndCache from "./pria-plugin/scanComponent.js";
import {formatHtml} from "./compiler/helpers/index.js"
import addComponentHtml from "./compiler/helpers/addhtml.js"
import { formatPriaError, toPriaError } from "./compiler/helpers/error.js";

function reportPriaError(err, context = {}) {
  const normalized = toPriaError(err, context);
  console.error("\n" + formatPriaError(normalized, context) + "\n");
  throw normalized;
}

export default function Scan() {
  const rootFile = "src/App.jsx";

  return {
    name: "vite-scan-priaJs-plugin",
    configureServer(server) {
      try {
        scanAndCache(rootFile);
      } catch (err) {
        reportPriaError(err, { filePath: rootFile, stage: "startup" });
      }
      server.watcher.add(rootFile);
    },

    transformIndexHtml(indexHtml) {
      try {
        let html;
        const data = scanAndCache(rootFile);

        if (data) {
          html = addComponentHtml(data, "App");
        }
        else html = "Dev time";
        indexHtml = indexHtml.replace(
          /<div id="app">\s*<\/div>/,
          `<div id="app">${html}</div> 
        <script> 
        console.log(\`${formatHtml(html)}\`)
        </script>`
        );
        return indexHtml;
      } catch (err) {
        reportPriaError(err, { filePath: rootFile, stage: "html" });
      }
    },

    load(id) {
      if (!id.endsWith(".jsx")) return null;
      try {
        const absFile = id;
        const data = scanAndCache(absFile);
        let script;
        if (data) script = data.script;
        else script=`
      export default function App(){
        console.log("Dev time ")
      }
      `;

        return script;
      } catch (err) {
        reportPriaError(err, { filePath: id, stage: "load" });
      }
    },
    handleHotUpdate( {
      file, server
    }) {
      if (!file.endsWith(".jsx")) return [];
      try {
        scanAndCache(file);
        server.restart();
      } catch (err) {
        reportPriaError(err, { filePath: file, stage: "hmr" });
      }
    }

  };
}
