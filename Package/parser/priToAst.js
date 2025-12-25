const createLookup = str =>
  Object.fromEntries(str.split(",").map(item => [item, true]));

const VOID_TAGS = createLookup(
  "area,base,basefont,br,col,frame,hr,img,input,link,meta,param,embed,command,keygen,source,track,wbr"
);
const SPECIAL_TAGS = { xmp: 1, style: 1, script: 1, noscript: 1, textarea: 1 };
const HIDDEN_TAGS = { style: 1, script: 1, noscript: 1, template: 1 };

const computeLineCol = (source, index) => {
  let line = 1;
  let col = 1;
  for (let i = 0; i < index && i < source.length; i++) {
    if (source[i] === "\n") {
      line++;
      col = 1;
    } else {
      col++;
    }
  }
  return { line, column: col };
};

const throwError = (message, source, index) => {
  const pos = computeLineCol(source, index);
  throw new SyntaxError(`${message} at line ${pos.line}, column ${pos.column}`);
};

const getTextContent = node => {
  let result = "";
  node.children.forEach(child => {
    if (child.type === "#text") {
      result += child.nodeValue;
    } else if (child.children && !HIDDEN_TAGS[child.type]) {
      result += getTextContent(child);
    }
  });
  return result;
};

const wrapTableRowsWithTbody = nodes => {
  let tbody = false;
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    if (/^(tbody|thead|tfoot|#jsx)$/.test(node.type)) {
      tbody = false;
      continue;
    }
    if (!tbody) {
      tbody = { type: "tbody", props: {}, children: [node] };
      nodes.splice(i, 1, tbody);
    } else {
      nodes.splice(i, 1);
      tbody.children.unshift(node);
    }
  }
};

const collectJSXNodes = (string, startIndex, endIndex, nodes) => {
  const nodeValue = string.slice(startIndex, endIndex);
  if (/\S/.test(nodeValue)) {
    nodes.push({ type: "#jsx", nodeValue });
  }
};

const makeJSXNode = jsxNodes =>
  jsxNodes.length === 1 && jsxNodes[0].type === "#jsx"
    ? jsxNodes[0]
    : { type: "#jsx", nodeValue: jsxNodes };

const parseJSXExpression = (string, source, offset) => {
  let braceDepth = 1;
  let codeIndex = 0;
  const nodes = [];
  let quote;
  let state = "code";

  for (let i = 0; i < string.length; i++) {
    const char = string[i];
    switch (state) {
      case "code":
        if (char === '"' || char === "'") {
          state = "string";
          quote = char;
        } else if (char === "{") {
          braceDepth++;
        } else if (char === "}") {
          braceDepth--;
          if (braceDepth === 0) {
            collectJSXNodes(string, codeIndex, i, nodes);
            return [string.slice(0, i), nodes];
          }
        } else if (char === "<") {
          let word = "";
          let empty = true;
          let idx = i - 1;
          while (idx >= 0) {
            const prevChar = string[idx];
            if (empty && prevChar === " ") {
              idx--;
              continue;
            }
            if (prevChar === " ") break;
            empty = false;
            word = prevChar + word;
            if (word.length > 7) break;
            idx--;
          }
          const chunkString = string.slice(i);
          if (
            word === "" ||
            (/(=>|return)$/.test(word) && /\<\w/.test(chunkString))
          ) {
            collectJSXNodes(string, codeIndex, i, nodes);
            const chunk = tokenizeNodes(chunkString, true);
            nodes.push(chunk[1]);
            i += chunk[0].length - 1;
            codeIndex = i + 1;
          }
        }
        break;
      case "string":
        if (char === quote) {
          state = "code";
        }
        break;
    }
  }

  throwError("Unterminated JSX expression in braces", source, offset || 0);
};

const parseAttributes = (string, offset, source) => {
  let state = "AttrNameOrJSX";
  let attrName = "";
  let attrValue = "";
  let quote;
  const props = {};
  const ATTR_NAME_RE = /^\$?[A-Za-z_][\w-]*(?::[A-Za-z_][\w-]*)*$/;

  for (let i = 0; i < string.length; i++) {
    const char = string[i];
    switch (state) {
      case "AttrNameOrJSX":
        if (char === "/" || char === ">") {
          return [string.slice(0, i), props];
        }
        if (/\s/.test(char)) {
          if (attrName) state = "AttrEqual";
        } else if (char === "=") {
          if (!attrName)
            throwError(
              "Must specify attribute name before '='",
              source,
              offset + i
            );
          if (!ATTR_NAME_RE.test(attrName))
            throwError(
              `Invalid attribute name "${attrName}"`,
              source,
              offset + i - attrName.length
            );
          if (props.hasOwnProperty(attrName))
            throwError(
              `Duplicate attribute "${attrName}"`,
              source,
              offset + i - attrName.length
            );
          state = "AttrQuoteOrJSX";
        } else if (char === "{") {
          state = "SpreadJSX";
        } else {
          attrName += char;
        }
        break;
      case "AttrEqual":
        if (char === "=") {
          if (!attrName)
            throwError(
              "Unexpected '=' without attribute name",
              source,
              offset + i
            );
          if (!ATTR_NAME_RE.test(attrName))
            throwError(
              `Invalid attribute name "${attrName}"`,
              source,
              offset + i - attrName.length
            );
          if (props.hasOwnProperty(attrName))
            throwError(
              `Duplicate attribute "${attrName}"`,
              source,
              offset + i - attrName.length
            );
          state = "AttrQuoteOrJSX";
        } else if (/\s/.test(char)) {
        } else {
          props[attrName] = true;
          attrName = "";
          attrValue = "";
          state = "AttrNameOrJSX";
          i--;
        }
        break;
      case "AttrQuoteOrJSX":
        if (char === '"' || char === "'") {
          quote = char;
          state = "AttrValue";
        } else if (char === "{") {
          state = "JSX";
        } else if (/\s/.test(char)) {
        } else {
          throwError(
            "Attribute value must start with quote or '{'",
            source,
            offset + i
          );
        }
        break;
      case "AttrValue":
        if (char !== quote) {
          attrValue += char;
        } else {
          props[attrName] = attrValue;
          attrName = attrValue = "";
          state = "AttrNameOrJSX";
        }
        break;
      case "SpreadJSX":
      case "JSX":
        const sub = string.slice(i);
        const arr = parseJSXExpression(sub, source, offset + i + 1);
        i += arr[0].length;
        props[state === "SpreadJSX" ? "spreadAttribute" : attrName] =
          makeJSXNode(arr[1]);
        attrName = attrValue = "";
        state = "AttrNameOrJSX";
        break;
    }
  }
  throwError("Tag must be closed properly.", source, offset + string.length);
};

const parseOpeningTag = (string, offset, source) => {
  if (string.indexOf("<") === 0) {
    // comments
    if (string.startsWith("<!--")) {
      const end = string.indexOf("-->");
      if (end === -1) throwError("Unclosed comment node.", source, offset);
      return [
        string.slice(0, end + 3),
        { type: "#comment", nodeValue: string.slice(4, end) }
      ];
    }

    // malformed: space right after '<' (e.g. "< a=...>") -> not allowed
    // allow '<!' (handled above), and allow '</' (closing handled elsewhere)
    const afterLt = string[1];
    if (afterLt && /\s/.test(afterLt) && !string.startsWith("<!--")) {
      throwError("Malformed start tag", source, offset);
    }

    // fragment opening: must be exactly "<>" (no attributes allowed)
    if (string.startsWith("<>")) {
      // if next character after "<>" is immediate '=' or identifier before a '<' or '{', it's suspicious.
      // But the rule is simple: opening must be exactly "<>" — the parser will read children after that.
      return ["<>", { type: "fragment", props: {}, children: [] }];
    }

    // normal tag opening (e.g. "<div", "<MyComponent")
    const match = string.match(/\<([A-Za-z_][^\s\/\>]*)/);
    if (match) {
      const tag = match[1];
      if (["script", "style", "noscript"].includes(tag.toLowerCase())) {
        throwError(`Tag <${tag}> is not allowed in this DSL`, source, offset);
      }
      let leftContent = match[0];
      const node = { type: tag, props: {}, children: [] };
      string = string.replace(leftContent, "");
      const attrs = parseAttributes(
        string,
        offset + leftContent.length,
        source
      );
      if (attrs) {
        node.props = attrs[1];
        string = string.replace(attrs[0], "");
        leftContent += attrs[0];
      }
      if (string[0] === ">") {
        leftContent += ">";
        string = string.slice(1);
        if (VOID_TAGS[node.type]) node.isVoidTag = true;
      } else if (string.startsWith("/>")) {
        leftContent += "/>";
        string = string.slice(2);
        node.isVoidTag = true;
      }
      if (!node.isVoidTag && SPECIAL_TAGS[tag]) {
        throwError(`Tag <${tag}> is not allowed in this DSL`, source, offset);
      }
      return [leftContent, node];
    }

    throwError("Malformed start tag", source, offset);
  }
};

const parseClosingTag = (string, stack, offset, source) => {
  // fragment close: "</>"
  if (string.startsWith("</>")) {
    const last = stack.at(-1);
    if (!last || last.type !== "fragment") {
      throwError(
        `Tag mismatch: expected </${last ? last.type : "none"}> but found </>`,
        source,
        offset
      );
    }
    return ["</>", { type: "fragment" }];
  }

  // normal closing tag like "</div>"
  if (string.indexOf("</") === 0) {
    const match = string.match(/\<\/([A-Za-z_][\w-]*)>/);
    if (match) {
      const tag = match[1];
      const last = stack.at(-1);
      if (!last || last.type !== tag) {
        throwError(
          `Tag mismatch: expected </${
            last ? last.type : "none"
          }> but found </${tag}>`,
          source,
          offset
        );
      }
      return [match[0], { type: tag }];
    }
    throwError("Malformed closing tag", source, offset);
  }
  return null;
};

const addTextNode = (lastNode, text, addNode) => {
  if (/\S/.test(text)) {
    if (lastNode && lastNode.type === "#text") {
      lastNode.text += text;
    } else {
      const node = { type: "#text", nodeValue: text };
      addNode(node);
    }
  }
};

const tokenizeNodes = (string, getOne) => {
  const stack = [];
  const result = [];
  const source = string;
  const originalLength = string.length;
  const addNode = node => {
    const parent = stack.at(-1);
    if (parent && parent.children) {
      parent.children.push(node);
    } else {
      result.push(node);
    }
  };
  let lastNode;
  let safety = 1000000;

  while (string.length) {
    if (--safety === 0) {
      throwError(
        "Parsing exceeded safety limit",
        source,
        originalLength - string.length
      );
    }
    const consumedIndex = originalLength - string.length;

    const close = parseClosingTag(string, stack, consumedIndex, source);
    if (close) {
      string = string.replace(close[0], "");
      const node = stack.pop();
      if (node.type === "option") {
        node.children = [{ type: "#text", nodeValue: getTextContent(node) }];
      } else if (node.type === "table") {
        wrapTableRowsWithTbody(node.children);
      }
      lastNode = null;
      if (getOne && result.length === 1 && !stack.length) {
        return [source.slice(0, originalLength - string.length), result[0]];
      }
      continue;
    }

    const open = parseOpeningTag(string, consumedIndex, source);
    if (open) {
      string = string.replace(open[0], "");
      const node = open[1];
      addNode(node);
      const selfClose = !!(node.isVoidTag || SPECIAL_TAGS[node.type]);
      if (!selfClose) stack.push(node);
      if (getOne && selfClose && !stack.length) {
        return [source.slice(0, originalLength - string.length), node];
      }
      lastNode = node;
      continue;
    }

    let text = "";
    do {
      const idx = string.indexOf("<");
      if (idx === 0) {
        text += string[0];
        string = string.slice(1);
      } else break;
    } while (string.length);

    const idxTag = string.indexOf("<");
    const idxOpenBrace = string.indexOf("{");
    const idxCloseBrace = string.indexOf("}");
    const hasJSX =
      idxOpenBrace !== -1 &&
      idxCloseBrace !== -1 &&
      idxOpenBrace < idxCloseBrace &&
      (idxTag === -1 || idxOpenBrace < idxTag);

    if (hasJSX) {
      if (idxOpenBrace !== 0) {
        text += string.slice(0, idxOpenBrace);
        string = string.slice(idxOpenBrace);
      }
      addTextNode(lastNode, text, addNode);
      string = string.slice(1);
      const expr = parseJSXExpression(
        string,
        source,
        originalLength - string.length - 1
      );
      addNode(makeJSXNode(expr[1]));
      lastNode = false;
      string = string.slice(expr[0].length + 1);
    } else {
      if (idxTag === -1) {
        text = string;
        string = "";
      } else {
        text += string.slice(0, idxTag);
        string = string.slice(idxTag);
      }
      addTextNode(lastNode, text, addNode);
    }
  }

  if (stack.length) {
    const unclosed = stack.map(n => `<${n.type}>`).join(", ");
    throwError(`Unclosed tags: ${unclosed}`, source, originalLength);
  }
  return result;
};

export default function parse(input, getOne) {
  const output = tokenizeNodes(input, getOne);
  if (getOne) {
    return typeof output[0] === "string" ? output[1] : output[0];
  }
  return output;
}

function test(html) {
  console.log(JSON.stringify(parse(html, true), null, 2));
}



