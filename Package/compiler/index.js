import parser from "@babel/parser";
import tr from "@babel/traverse";
const traverse = tr.default;
import generate from "@babel/generator";
import * as t from "@babel/types";


const str = (d) => JSON.stringify(d, null, 1)


export default function transfrom(code, filePath) {
  const ast = parser.parse(code, {
    sourceType: "module",
    plugins: [
      ["jsx"]
    ]
  });
 // console.log(str(ast))
  traverse(ast, {
    FunctionDeclaration(path){
      for (const node in path.node.body){
        console.log(path.node.body[node])
      }
    }
  })


}