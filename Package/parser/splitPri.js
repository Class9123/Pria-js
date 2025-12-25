/**
 * Super-robust separator for .pri files.
 * Handles HTML, SVG, fragments, <style>, and <script> correctly.
 */
function separatePriFile(content) {
  content = content.replace(/\r\n/g, "\n");

  let jsPart = "";
  let htmlPart = "";
  let stylePart = "";

  // --- Extract <style> ---
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  stylePart = (content.match(styleRegex) || [])
    .map(m => m.replace(/<\/?style[^>]*>/gi, "").trim())
    .join("\n");
  content = content.replace(styleRegex, "");

  // --- Extract <script> (if any) ---
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  const scriptMatches = content.match(scriptRegex);
  if (scriptMatches) {
    jsPart = scriptMatches
      .map(m => m.replace(/<\/?script[^>]*>/gi, "").trim())
      .join("\n");
    content = content.replace(scriptRegex, "");
  } else {
    // JS before HTML or fragment
    const firstTagIndex = findFirstTagOrFragment(content);
    if (firstTagIndex !== -1) {
      jsPart = content.slice(0, firstTagIndex).trim();
      htmlPart = content.slice(firstTagIndex).trim();
    } else {
      jsPart = content.trim();
    }
  }

  // --- Extract HTML with SVG + fragment support ---
  if (htmlPart) htmlPart = extractHtmlSafe(htmlPart).trim();

  return { js: jsPart, html: htmlPart, css: stylePart };
}

/**
 * Finds first <tag> or fragment <> position.
 */
function findFirstTagOrFragment(str) {
  const regex = /<(?:>|[a-zA-Z!/?])/;
  const match = regex.exec(str);
  return match ? match.index : -1;
}

/**
 * Extracts HTML/SVG/fragment structure safely (with nesting).
 */
function extractHtmlSafe(content) {
  const stack = [];
  let i = 0;
  let result = "";
  const len = content.length;

  while (i < len) {
    const ch = content[i];

    if (ch === "<") {
      // --- Fragment open ---
      if (content[i + 1] === ">") {
        stack.push("</>");
        result += "<>";
        i += 2;
        continue;
      }

      // --- Fragment close ---
      if (content.startsWith("</>", i)) {
        if (stack[stack.length - 1] === "</>") stack.pop();
        result += "</>";
        i += 3;
        continue;
      }

      // --- HTML or SVG tag ---
      const tagMatch = content.slice(i).match(/^<\/?([a-zA-Z][\w:-]*)/);
      if (tagMatch) {
        const tagName = tagMatch[1].toLowerCase();

        // Skip comments
        if (tagName.startsWith("!--")) {
          const end = content.indexOf("-->", i + 4);
          result += content.slice(i, end + 3);
          i = end + 3;
          continue;
        }

        const isClosing = content[i + 1] === "/";
        const tagEnd = content.indexOf(">", i + 1);
        if (tagEnd === -1) {
          result += content.slice(i);
          break;
        }

        const tagFull = content.slice(i, tagEnd + 1);
        result += tagFull;

        // Determine if self-closing
        const isSelfClosing = /\/>$/.test(tagFull);

        if (!isSelfClosing && !isClosing) {
          stack.push(tagName);
        } else if (isClosing) {
          if (stack[stack.length - 1] === tagName) stack.pop();
        }

        i = tagEnd + 1;
        continue;
      }
    }

    result += ch;
    i++;
  }

  return result;
}

export default separatePriFile;
