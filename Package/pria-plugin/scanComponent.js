import fs from "fs";
import splitFile from "../parser/splitPri.js";
import transformPri from "../compiler/index.js";
const cacheMap = new Map();
export default function scanAndCache(absFile) {
  let data = cacheMap.get(absFile);
  if (!data) {
    data = scanComponent(absFile);
    cacheMap.set(absFile, data);
  }
  return data;
}


function scanComponent(filePath) {
  const code = fs.readFileSync(filePath, "utf-8");
  const { js, html } = splitFile(code);
  return transformPri(js, html, filePath);
}
