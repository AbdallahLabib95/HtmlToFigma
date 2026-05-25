(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };

  // src/parser.js
  var SELF_CLOSING_TAGS = /* @__PURE__ */ new Set([
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr"
  ]);
  var BLOCK_ELEMENTS = /* @__PURE__ */ new Set([
    "div",
    "p",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "section",
    "article",
    "header",
    "footer",
    "nav",
    "main",
    "aside",
    "ul",
    "ol",
    "li",
    "table",
    "tr",
    "td",
    "th",
    "thead",
    "tbody",
    "form",
    "fieldset",
    "blockquote",
    "pre",
    "figure",
    "figcaption",
    "details",
    "summary",
    "address"
  ]);
  var INLINE_ELEMENTS = /* @__PURE__ */ new Set([
    "span",
    "a",
    "strong",
    "em",
    "b",
    "i",
    "u",
    "small",
    "sub",
    "sup",
    "code",
    "kbd",
    "mark",
    "abbr",
    "cite",
    "q",
    "label",
    "time"
  ]);
  var DEFAULT_STYLES = {
    h1: { fontSize: "32px", fontWeight: "700", marginTop: "0px", marginBottom: "16px" },
    h2: { fontSize: "24px", fontWeight: "700", marginTop: "0px", marginBottom: "12px" },
    h3: { fontSize: "20px", fontWeight: "700", marginTop: "0px", marginBottom: "10px" },
    h4: { fontSize: "18px", fontWeight: "600", marginTop: "0px", marginBottom: "8px" },
    h5: { fontSize: "16px", fontWeight: "600", marginTop: "0px", marginBottom: "6px" },
    h6: { fontSize: "14px", fontWeight: "600", marginTop: "0px", marginBottom: "4px" },
    p: { fontSize: "14px", fontWeight: "400", marginTop: "0px", marginBottom: "16px" },
    strong: { fontWeight: "700" },
    b: { fontWeight: "700" },
    em: { fontStyle: "italic" },
    i: { fontStyle: "italic" },
    u: { textDecoration: "underline" },
    small: { fontSize: "12px" },
    code: { fontFamily: "monospace", fontSize: "13px", background: "#f1f5f9", padding: "2px 4px", borderRadius: "3px" },
    a: { color: "#0ea5e9", textDecoration: "underline" },
    button: { padding: "8px 16px", fontSize: "14px", borderRadius: "4px", background: "#e2e8f0", cursor: "pointer" },
    input: { padding: "8px 12px", fontSize: "14px", border: "1px solid #d1d5db", borderRadius: "4px" }
  };
  function parseHTML(htmlString) {
    const cleaned = htmlString.trim();
    const tokens = tokenize(cleaned);
    const tree = buildTree(tokens);
    return tree;
  }
  function tokenize(html) {
    const tokens = [];
    let i = 0;
    while (i < html.length) {
      if (html[i] === "<") {
        if (html.substring(i, i + 4) === "<!--") {
          const endComment = html.indexOf("-->", i + 4);
          i = endComment === -1 ? html.length : endComment + 3;
          continue;
        }
        if (html.substring(i, i + 9).toLowerCase() === "<![cdata[") {
          const endCdata = html.indexOf("]]>", i + 9);
          i = endCdata === -1 ? html.length : endCdata + 3;
          continue;
        }
        const tagEnd = html.indexOf(">", i);
        if (tagEnd === -1)
          break;
        const tagContent = html.substring(i + 1, tagEnd);
        const isSelfClose = tagContent.endsWith("/");
        const rawTag = isSelfClose ? tagContent.slice(0, -1) : tagContent;
        if (rawTag.startsWith("/")) {
          tokens.push({ type: "close", tag: rawTag.substring(1).trim().split(/\s/)[0].toLowerCase() });
        } else {
          const parsed = parseTag(rawTag);
          if (parsed) {
            parsed.selfClosing = isSelfClose || SELF_CLOSING_TAGS.has(parsed.tag);
            tokens.push(parsed);
          }
        }
        i = tagEnd + 1;
      } else {
        let textEnd = html.indexOf("<", i);
        if (textEnd === -1)
          textEnd = html.length;
        const text = html.substring(i, textEnd);
        const decoded = decodeEntities(text);
        if (decoded.trim()) {
          tokens.push({ type: "text", content: decoded });
        }
        i = textEnd;
      }
    }
    return tokens;
  }
  function parseTag(raw) {
    const match = raw.match(/^(\w[\w-]*)/);
    if (!match)
      return null;
    const tag = match[1].toLowerCase();
    if (tag === "style" || tag === "script" || tag === "link" || tag === "meta") {
      return null;
    }
    const attrs = {};
    const attrRegex = /([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(raw)) !== null) {
      const name = attrMatch[1].toLowerCase();
      const value = attrMatch[2] !== void 0 ? attrMatch[2] : attrMatch[3] !== void 0 ? attrMatch[3] : attrMatch[4] !== void 0 ? attrMatch[4] : "";
      attrs[name] = value;
    }
    return { type: "open", tag, attrs, selfClosing: false };
  }
  function buildTree(tokens) {
    const root = { type: "element", tag: "root", children: [], styles: {}, attrs: {} };
    const stack = [root];
    for (const token of tokens) {
      const parent = stack[stack.length - 1];
      if (token.type === "text") {
        parent.children.push({
          type: "text",
          content: token.content,
          styles: {}
        });
      } else if (token.type === "open") {
        const node = {
          type: "element",
          tag: token.tag,
          attrs: token.attrs,
          children: [],
          styles: resolveStyles(token.tag, token.attrs),
          isBlock: BLOCK_ELEMENTS.has(token.tag),
          isInline: INLINE_ELEMENTS.has(token.tag)
        };
        parent.children.push(node);
        if (!token.selfClosing) {
          stack.push(node);
        }
      } else if (token.type === "close") {
        let foundIdx = -1;
        for (let i = stack.length - 1; i > 0; i--) {
          if (stack[i].tag === token.tag) {
            foundIdx = i;
            break;
          }
        }
        if (foundIdx > 0) {
          stack.splice(foundIdx);
        }
      }
    }
    return root;
  }
  function resolveStyles(tag, attrs) {
    const styles = __spreadValues({}, DEFAULT_STYLES[tag] || {});
    if (attrs.style) {
      const inlineStyles = parseInlineStyle(attrs.style);
      Object.assign(styles, inlineStyles);
    }
    return styles;
  }
  function parseInlineStyle(styleStr) {
    const styles = {};
    const declarations = styleStr.split(";");
    for (const decl of declarations) {
      const colonIdx = decl.indexOf(":");
      if (colonIdx === -1)
        continue;
      const prop = decl.substring(0, colonIdx).trim();
      const value = decl.substring(colonIdx + 1).trim();
      if (prop && value) {
        styles[camelCase(prop)] = value;
      }
    }
    return styles;
  }
  function camelCase(str) {
    return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  }
  function decodeEntities(text) {
    const entities = {
      "&amp;": "&",
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": '"',
      "&#39;": "'",
      "&apos;": "'",
      "&nbsp;": " ",
      "&#x27;": "'",
      "&hellip;": "...",
      "&mdash;": "\u2014",
      "&ndash;": "\u2013",
      "&laquo;": "\xAB",
      "&raquo;": "\xBB",
      "&copy;": "\xA9",
      "&reg;": "\xAE",
      "&trade;": "\u2122"
    };
    let result = text;
    for (const [entity, char] of Object.entries(entities)) {
      result = result.split(entity).join(char);
    }
    result = result.replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
    result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    return result;
  }

  // src/color-utils.js
  var NAMED_COLORS = {
    black: "#000000",
    white: "#ffffff",
    red: "#ff0000",
    green: "#008000",
    blue: "#0000ff",
    yellow: "#ffff00",
    orange: "#ffa500",
    purple: "#800080",
    pink: "#ffc0cb",
    gray: "#808080",
    grey: "#808080",
    silver: "#c0c0c0",
    maroon: "#800000",
    navy: "#000080",
    teal: "#008080",
    olive: "#808000",
    aqua: "#00ffff",
    cyan: "#00ffff",
    magenta: "#ff00ff",
    lime: "#00ff00",
    coral: "#ff7f50",
    tomato: "#ff6347",
    gold: "#ffd700",
    wheat: "#f5deb3",
    salmon: "#fa8072",
    khaki: "#f0e68c",
    plum: "#dda0dd",
    orchid: "#da70d6",
    tan: "#d2b48c",
    crimson: "#dc143c",
    turquoise: "#40e0d0",
    indigo: "#4b0082",
    violet: "#ee82ee",
    beige: "#f5f5dc",
    ivory: "#fffff0",
    linen: "#faf0e6",
    chocolate: "#d2691e",
    firebrick: "#b22222",
    darkblue: "#00008b",
    darkgreen: "#006400",
    darkred: "#8b0000",
    darkgray: "#a9a9a9",
    darkgrey: "#a9a9a9",
    lightgray: "#d3d3d3",
    lightgrey: "#d3d3d3",
    lightblue: "#add8e6",
    lightgreen: "#90ee90",
    lightyellow: "#ffffe0",
    darkslategray: "#2f4f4f",
    slategray: "#708090",
    steelblue: "#4682b4",
    royalblue: "#4169e1",
    dodgerblue: "#1e90ff",
    cornflowerblue: "#6495ed",
    deepskyblue: "#00bfff",
    skyblue: "#87ceeb",
    midnightblue: "#191970",
    darkslateblue: "#483d8b",
    mediumblue: "#0000cd",
    slateblue: "#6a5acd",
    transparent: "rgba(0,0,0,0)",
    aliceblue: "#f0f8ff",
    antiquewhite: "#faebd7",
    aquamarine: "#7fffd4",
    azure: "#f0ffff",
    bisque: "#ffe4c4",
    blanchedalmond: "#ffebcd",
    blueviolet: "#8a2be2",
    burlywood: "#deb887",
    cadetblue: "#5f9ea0",
    chartreuse: "#7fff00",
    darkcyan: "#008b8b",
    darkgoldenrod: "#b8860b",
    darkkhaki: "#bdb76b",
    darkmagenta: "#8b008b",
    darkolivegreen: "#556b2f",
    darkorange: "#ff8c00",
    darkorchid: "#9932cc",
    darksalmon: "#e9967a",
    darkseagreen: "#8fbc8f",
    darkturquoise: "#00ced1",
    darkviolet: "#9400d3",
    deeppink: "#ff1493",
    dimgray: "#696969",
    dimgrey: "#696969",
    floralwhite: "#fffaf0",
    forestgreen: "#228b22",
    gainsboro: "#dcdcdc",
    ghostwhite: "#f8f8ff",
    goldenrod: "#daa520",
    greenyellow: "#adff2f",
    honeydew: "#f0fff0",
    hotpink: "#ff69b4",
    indianred: "#cd5c5c",
    lavender: "#e6e6fa",
    lavenderblush: "#fff0f5",
    lawngreen: "#7cfc00",
    lemonchiffon: "#fffacd",
    lightcoral: "#f08080",
    lightcyan: "#e0ffff",
    lightpink: "#ffb6c1",
    lightsalmon: "#ffa07a",
    lightseagreen: "#20b2aa",
    lightskyblue: "#87cefa",
    lightslategray: "#778899",
    lightsteelblue: "#b0c4de",
    limegreen: "#32cd32",
    mediumaquamarine: "#66cdaa",
    mediumorchid: "#ba55d3",
    mediumpurple: "#9370db",
    mediumseagreen: "#3cb371",
    mediumslateblue: "#7b68ee",
    mediumspringgreen: "#00fa9a",
    mediumturquoise: "#48d1cc",
    mediumvioletred: "#c71585",
    mintcream: "#f5fffa",
    mistyrose: "#ffe4e1",
    moccasin: "#ffe4b5",
    navajowhite: "#ffdead",
    oldlace: "#fdf5e6",
    olivedrab: "#6b8e23",
    orangered: "#ff4500",
    palegoldenrod: "#eee8aa",
    palegreen: "#98fb98",
    paleturquoise: "#afeeee",
    palevioletred: "#db7093",
    papayawhip: "#ffefd5",
    peachpuff: "#ffdab9",
    peru: "#cd853f",
    powderblue: "#b0e0e6",
    rosybrown: "#bc8f8f",
    saddlebrown: "#8b4513",
    sandybrown: "#f4a460",
    seagreen: "#2e8b57",
    seashell: "#fff5ee",
    sienna: "#a0522d",
    snow: "#fffafa",
    springgreen: "#00ff7f",
    thistle: "#d8bfd8",
    whitesmoke: "#f5f5f5",
    yellowgreen: "#9acd32"
  };
  function parseColor(colorStr) {
    if (!colorStr || colorStr === "transparent") {
      return { r: 0, g: 0, b: 0, a: 0 };
    }
    const trimmed = colorStr.trim().toLowerCase();
    if (NAMED_COLORS[trimmed]) {
      return parseColor(NAMED_COLORS[trimmed]);
    }
    if (trimmed.startsWith("#")) {
      return parseHex(trimmed);
    }
    if (trimmed.startsWith("rgb")) {
      return parseRgb(trimmed);
    }
    if (trimmed.startsWith("hsl")) {
      return parseHsl(trimmed);
    }
    return { r: 0, g: 0, b: 0, a: 1 };
  }
  function parseHex(hex) {
    hex = hex.replace("#", "");
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    } else if (hex.length === 4) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    }
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    const a = hex.length === 8 ? parseInt(hex.substring(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }
  function parseRgb(str) {
    const nums = str.match(/[\d.]+/g);
    if (!nums || nums.length < 3)
      return { r: 0, g: 0, b: 0, a: 1 };
    return {
      r: parseFloat(nums[0]) / 255,
      g: parseFloat(nums[1]) / 255,
      b: parseFloat(nums[2]) / 255,
      a: nums.length >= 4 ? parseFloat(nums[3]) : 1
    };
  }
  function parseHsl(str) {
    const nums = str.match(/[\d.]+/g);
    if (!nums || nums.length < 3)
      return { r: 0, g: 0, b: 0, a: 1 };
    const h = parseFloat(nums[0]) / 360;
    const s = parseFloat(nums[1]) / 100;
    const l = parseFloat(nums[2]) / 100;
    const a = nums.length >= 4 ? parseFloat(nums[3]) : 1;
    const { r, g, b } = hslToRgb(h, s, l);
    return { r, g, b, a };
  }
  function hslToRgb(h, s, l) {
    if (s === 0)
      return { r: l, g: l, b: l };
    const hue2rgb = (p2, q2, t) => {
      if (t < 0)
        t += 1;
      if (t > 1)
        t -= 1;
      if (t < 1 / 6)
        return p2 + (q2 - p2) * 6 * t;
      if (t < 1 / 2)
        return q2;
      if (t < 2 / 3)
        return p2 + (q2 - p2) * (2 / 3 - t) * 6;
      return p2;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return {
      r: hue2rgb(p, q, h + 1 / 3),
      g: hue2rgb(p, q, h),
      b: hue2rgb(p, q, h - 1 / 3)
    };
  }
  function parseBoxShadow(shadowStr) {
    if (!shadowStr || shadowStr === "none")
      return [];
    const shadows = [];
    const parts = splitShadows(shadowStr);
    for (const part of parts) {
      const isInset = part.includes("inset");
      const cleaned = part.replace("inset", "").trim();
      const colorMatch = cleaned.match(/(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|\b[a-z]+\b(?!\s*\d))/i);
      let color = { r: 0, g: 0, b: 0, a: 0.25 };
      let numericPart = cleaned;
      if (colorMatch) {
        color = parseColor(colorMatch[0]);
        numericPart = cleaned.replace(colorMatch[0], "").trim();
      }
      const nums = numericPart.match(/-?[\d.]+/g);
      if (nums && nums.length >= 2) {
        shadows.push({
          type: isInset ? "INNER_SHADOW" : "DROP_SHADOW",
          color: { r: color.r, g: color.g, b: color.b, a: color.a },
          offset: { x: parseFloat(nums[0]), y: parseFloat(nums[1]) },
          radius: nums.length >= 3 ? parseFloat(nums[2]) : 0,
          spread: nums.length >= 4 ? parseFloat(nums[3]) : 0,
          visible: true,
          blendMode: "NORMAL"
        });
      }
    }
    return shadows;
  }
  function splitShadows(str) {
    const results = [];
    let depth = 0;
    let current = "";
    for (const char of str) {
      if (char === "(")
        depth++;
      else if (char === ")")
        depth--;
      else if (char === "," && depth === 0) {
        results.push(current.trim());
        current = "";
        continue;
      }
      current += char;
    }
    if (current.trim())
      results.push(current.trim());
    return results;
  }
  function parseGradient(gradientStr) {
    if (!gradientStr)
      return null;
    const linearMatch = gradientStr.match(/linear-gradient\(([^)]+(?:\([^)]*\))*[^)]*)\)/i);
    if (!linearMatch)
      return null;
    const content = linearMatch[1];
    const parts = splitGradientParts(content);
    let angle = 180;
    let stopStartIdx = 0;
    if (parts[0]) {
      const firstPart = parts[0].trim();
      const degMatch = firstPart.match(/^([\d.]+)deg$/);
      if (degMatch) {
        angle = parseFloat(degMatch[1]);
        stopStartIdx = 1;
      } else if (firstPart.startsWith("to ")) {
        angle = directionToAngle(firstPart);
        stopStartIdx = 1;
      }
    }
    const stops = [];
    for (let i = stopStartIdx; i < parts.length; i++) {
      const stopPart = parts[i].trim();
      const percentMatch = stopPart.match(/([\d.]+)%/);
      const colorPart = stopPart.replace(/([\d.]+)%/, "").trim();
      const color = parseColor(colorPart || stopPart);
      const position = percentMatch ? parseFloat(percentMatch[1]) / 100 : i / (parts.length - 1);
      stops.push({ position, color });
    }
    if (stops.length < 2)
      return null;
    const radians = (angle - 90) * Math.PI / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    return {
      type: "GRADIENT_LINEAR",
      gradientTransform: [
        [cos / 2, sin / 2, 0.5 - cos / 4 - sin / 4],
        [-sin / 2, cos / 2, 0.5 + sin / 4 - cos / 4]
      ],
      gradientStops: stops.map((s) => ({
        position: s.position,
        color: s.color
      }))
    };
  }
  function splitGradientParts(str) {
    const results = [];
    let depth = 0;
    let current = "";
    for (const char of str) {
      if (char === "(")
        depth++;
      else if (char === ")")
        depth--;
      else if (char === "," && depth === 0) {
        results.push(current.trim());
        current = "";
        continue;
      }
      current += char;
    }
    if (current.trim())
      results.push(current.trim());
    return results;
  }
  function directionToAngle(dir) {
    const map = {
      "to top": 0,
      "to right": 90,
      "to bottom": 180,
      "to left": 270,
      "to top right": 45,
      "to top left": 315,
      "to bottom right": 135,
      "to bottom left": 225
    };
    return map[dir] !== void 0 ? map[dir] : 180;
  }

  // src/figma-mapper.js
  var FONT_WEIGHT_MAP = {
    "100": "Thin",
    "200": "Extra Light",
    "300": "Light",
    "400": "Regular",
    "500": "Medium",
    "600": "Semi Bold",
    "700": "Bold",
    "800": "Extra Bold",
    "900": "Black",
    "normal": "Regular",
    "bold": "Bold",
    "lighter": "Light",
    "bolder": "Bold"
  };
  async function convertToFigma(tree, options) {
    let nodeCount = 0;
    async function processNode(node, parent) {
      if (node.type === "text") {
        const textNode = await createTextNode(node.content, node.styles || {}, parent);
        if (textNode) {
          parent.appendChild(textNode);
          nodeCount++;
        }
        return;
      }
      if (node.tag === "root") {
        for (const child of node.children) {
          await processNode(child, parent);
        }
        return;
      }
      if (node.tag === "br" || node.tag === "hr") {
        if (node.tag === "hr") {
          const line = figma.createRectangle();
          line.name = "hr";
          line.resize(200, 1);
          line.fills = [{ type: "SOLID", color: { r: 0.85, g: 0.85, b: 0.85 } }];
          if (parent.layoutMode && parent.layoutMode !== "NONE") {
            line.layoutSizingHorizontal = "FILL";
          }
          parent.appendChild(line);
          nodeCount++;
        }
        return;
      }
      if (node.tag === "img") {
        const frame2 = figma.createFrame();
        const w = parseNumeric(node.attrs && node.attrs.width || node.styles.width) || 150;
        const h = parseNumeric(node.attrs && node.attrs.height || node.styles.height) || 100;
        frame2.resize(w, h);
        frame2.fills = [{ type: "SOLID", color: { r: 0.92, g: 0.92, b: 0.95 } }];
        frame2.name = node.attrs && node.attrs.alt || "Image";
        frame2.cornerRadius = parseNumeric(node.styles.borderRadius) || 0;
        parent.appendChild(frame2);
        nodeCount++;
        return;
      }
      const isTextOnly = isTextElement(node);
      if (isTextOnly && !hasBlockStyles(node.styles)) {
        const text = getTextContent(node);
        const mergedStyles = __spreadValues({}, node.styles);
        const textNode = await createTextNode(text, mergedStyles, parent);
        if (textNode) {
          textNode.name = node.tag;
          parent.appendChild(textNode);
          applyTextLayoutProps(textNode, mergedStyles, parent);
          nodeCount++;
        }
        return;
      }
      const frame = figma.createFrame();
      frame.name = getNodeName(node);
      nodeCount++;
      applyFrameStyles(frame, node.styles, options);
      parent.appendChild(frame);
      applyChildLayoutProps(frame, node.styles, parent);
      if (options.preserveHierarchy) {
        for (const child of node.children) {
          await processNode(child, frame);
        }
      } else {
        for (const child of node.children) {
          await processNode(child, frame);
        }
      }
    }
    const rootFrame = figma.createFrame();
    rootFrame.name = "HTML Import";
    rootFrame.fills = [];
    if (options.autoLayout) {
      rootFrame.layoutMode = "VERTICAL";
      rootFrame.primaryAxisSizingMode = "AUTO";
      rootFrame.counterAxisSizingMode = "AUTO";
      rootFrame.itemSpacing = 0;
    }
    figma.currentPage.appendChild(rootFrame);
    for (const child of tree.children) {
      await processNode(child, rootFrame);
    }
    figma.currentPage.selection = [rootFrame];
    figma.viewport.scrollAndZoomIntoView([rootFrame]);
    return { nodeCount, rootNode: rootFrame };
  }
  async function createTextNode(text, styles, parent) {
    if (!text.trim())
      return null;
    const textNode = figma.createText();
    const weight = styles.fontWeight || "400";
    const figmaStyle = FONT_WEIGHT_MAP[weight] || "Regular";
    let fontFamily = "Inter";
    if (styles.fontFamily) {
      const firstFont = styles.fontFamily.split(",")[0].trim().replace(/['"]/g, "");
      if (firstFont && !["monospace", "sans-serif", "serif", "cursive", "fantasy"].includes(firstFont)) {
        fontFamily = firstFont;
      }
    }
    try {
      await figma.loadFontAsync({ family: fontFamily, style: figmaStyle });
    } catch (e) {
      try {
        await figma.loadFontAsync({ family: "Inter", style: figmaStyle });
        fontFamily = "Inter";
      } catch (e2) {
        await figma.loadFontAsync({ family: "Inter", style: "Regular" });
        fontFamily = "Inter";
      }
    }
    textNode.fontName = { family: fontFamily, style: figmaStyle };
    textNode.characters = text;
    const fontSize = parseNumeric(styles.fontSize) || 14;
    textNode.fontSize = fontSize;
    if (styles.lineHeight) {
      const lh = styles.lineHeight;
      if (lh.endsWith("%")) {
        textNode.lineHeight = { value: parseFloat(lh), unit: "PERCENT" };
      } else if (lh === "normal" || lh === "auto") {
        textNode.lineHeight = { unit: "AUTO" };
      } else {
        const val = parseFloat(lh);
        if (val > 0) {
          if (val < 4) {
            textNode.lineHeight = { value: val * 100, unit: "PERCENT" };
          } else {
            textNode.lineHeight = { value: val, unit: "PIXELS" };
          }
        }
      }
    }
    if (styles.letterSpacing) {
      const ls = parseFloat(styles.letterSpacing);
      if (!isNaN(ls)) {
        textNode.letterSpacing = { value: ls, unit: "PIXELS" };
      }
    }
    if (styles.textAlign) {
      const alignMap = { left: "LEFT", center: "CENTER", right: "RIGHT", justify: "JUSTIFIED" };
      textNode.textAlignHorizontal = alignMap[styles.textAlign] || "LEFT";
    }
    if (styles.textDecoration) {
      if (styles.textDecoration.includes("underline")) {
        textNode.textDecoration = "UNDERLINE";
      } else if (styles.textDecoration.includes("line-through")) {
        textNode.textDecoration = "STRIKETHROUGH";
      }
    }
    if (styles.textTransform) {
      const caseMap = { uppercase: "UPPER", lowercase: "LOWER", capitalize: "TITLE" };
      textNode.textCase = caseMap[styles.textTransform] || "ORIGINAL";
    }
    if (styles.color) {
      const color = parseColor(styles.color);
      textNode.fills = [{ type: "SOLID", color: { r: color.r, g: color.g, b: color.b }, opacity: color.a }];
    } else {
      textNode.fills = [{ type: "SOLID", color: { r: 0.1, g: 0.1, b: 0.1 } }];
    }
    textNode.textAutoResize = "WIDTH_AND_HEIGHT";
    return textNode;
  }
  function applyTextLayoutProps(textNode, styles, parent) {
    if (!parent.layoutMode || parent.layoutMode === "NONE")
      return;
    if (styles.width === "100%" || parent.layoutMode === "VERTICAL") {
      textNode.layoutSizingHorizontal = "FILL";
      textNode.textAutoResize = "HEIGHT";
    }
  }
  function applyChildLayoutProps(frame, styles, parent) {
    if (!parent.layoutMode || parent.layoutMode === "NONE")
      return;
    var display = styles.display || "";
    var isInlineLevel = display === "inline" || display === "inline-block" || display === "inline-flex";
    if (styles.width === "100%" || styles.flex === "1" || styles.flexGrow === "1") {
      frame.layoutSizingHorizontal = "FILL";
    } else if (parent.layoutMode === "VERTICAL" && !isInlineLevel && !parseNumeric(styles.width) && styles.width !== "100%") {
      frame.layoutSizingHorizontal = "FILL";
    }
    if (styles.height === "100%") {
      frame.layoutSizingVertical = "FILL";
    }
    if (styles.alignSelf) {
      var selfMap = {
        "flex-start": "MIN",
        "start": "MIN",
        "center": "CENTER",
        "flex-end": "MAX",
        "end": "MAX",
        "stretch": "STRETCH"
      };
      frame.layoutAlign = selfMap[styles.alignSelf] || "INHERIT";
    }
  }
  function applyFrameStyles(frame, styles, options) {
    const width = parseNumeric(styles.width);
    const height = parseNumeric(styles.height);
    if (width && height) {
      frame.resize(Math.max(width, 1), Math.max(height, 1));
    } else if (width) {
      frame.resize(Math.max(width, 1), 40);
    } else if (height) {
      frame.resize(200, Math.max(height, 1));
    } else {
      frame.resize(200, 40);
    }
    frame.fills = [];
    if (styles.background || styles.backgroundColor) {
      const bgValue = styles.background || styles.backgroundColor;
      if (bgValue.includes("gradient")) {
        const gradient = parseGradient(bgValue);
        if (gradient) {
          frame.fills = [gradient];
        }
      } else {
        const color = parseColor(bgValue);
        if (color.a > 0) {
          frame.fills = [{ type: "SOLID", color: { r: color.r, g: color.g, b: color.b }, opacity: color.a }];
        }
      }
    }
    if (styles.borderRadius) {
      const radii = parseBorderRadius(styles.borderRadius);
      if (radii.uniform !== void 0) {
        frame.cornerRadius = radii.uniform;
      } else {
        frame.topLeftRadius = radii.topLeft || 0;
        frame.topRightRadius = radii.topRight || 0;
        frame.bottomRightRadius = radii.bottomRight || 0;
        frame.bottomLeftRadius = radii.bottomLeft || 0;
      }
    }
    if (styles.border && styles.border !== "none") {
      const borderParsed = parseBorder(styles.border);
      if (borderParsed) {
        frame.strokes = [{ type: "SOLID", color: { r: borderParsed.color.r, g: borderParsed.color.g, b: borderParsed.color.b } }];
        frame.strokeWeight = borderParsed.width;
        frame.strokeAlign = "INSIDE";
      }
    } else {
      applyIndividualBorders(frame, styles);
    }
    if (styles.boxShadow) {
      const shadows = parseBoxShadow(styles.boxShadow);
      if (shadows.length > 0) {
        frame.effects = shadows;
      }
    }
    if (styles.opacity) {
      const val = parseFloat(styles.opacity);
      if (val >= 0 && val <= 1)
        frame.opacity = val;
    }
    if (styles.overflow === "hidden") {
      frame.clipsContent = true;
    } else {
      frame.clipsContent = false;
    }
    if (options.autoLayout) {
      applyAutoLayout(frame, styles);
    }
  }
  function applyAutoLayout(frame, styles) {
    const display = styles.display || "";
    const flexDirection = styles.flexDirection || "row";
    if (display === "flex" || display === "inline-flex") {
      frame.layoutMode = flexDirection === "column" || flexDirection === "column-reverse" ? "VERTICAL" : "HORIZONTAL";
    } else if (display === "grid" || display === "inline-grid") {
      frame.layoutMode = "VERTICAL";
    } else {
      frame.layoutMode = "VERTICAL";
    }
    const padding = parsePadding(styles);
    frame.paddingTop = padding.top;
    frame.paddingBottom = padding.bottom;
    frame.paddingLeft = padding.left;
    frame.paddingRight = padding.right;
    if (styles.gap) {
      const gapVal = parseNumeric(styles.gap) || 0;
      frame.itemSpacing = gapVal;
    } else if (styles.columnGap && frame.layoutMode === "HORIZONTAL") {
      frame.itemSpacing = parseNumeric(styles.columnGap) || 0;
    } else if (styles.rowGap && frame.layoutMode === "VERTICAL") {
      frame.itemSpacing = parseNumeric(styles.rowGap) || 0;
    } else {
      frame.itemSpacing = 0;
    }
    if (styles.justifyContent) {
      const justifyMap = {
        "flex-start": "MIN",
        "start": "MIN",
        "center": "CENTER",
        "flex-end": "MAX",
        "end": "MAX",
        "space-between": "SPACE_BETWEEN"
      };
      frame.primaryAxisAlignItems = justifyMap[styles.justifyContent] || "MIN";
    }
    if (styles.alignItems) {
      const alignMap = {
        "flex-start": "MIN",
        "start": "MIN",
        "center": "CENTER",
        "flex-end": "MAX",
        "end": "MAX",
        "stretch": "MIN",
        "baseline": "BASELINE"
      };
      frame.counterAxisAlignItems = alignMap[styles.alignItems] || "MIN";
    }
    if (styles.textAlign === "center" && frame.layoutMode === "VERTICAL") {
      frame.counterAxisAlignItems = "CENTER";
    } else if (styles.textAlign === "right" && frame.layoutMode === "VERTICAL") {
      frame.counterAxisAlignItems = "MAX";
    }
    if (styles.flexWrap === "wrap") {
      frame.layoutWrap = "WRAP";
      if (styles.gap) {
        frame.counterAxisSpacing = parseNumeric(styles.gap) || 0;
      }
    }
    var hasFixedWidth = parseNumeric(styles.width) > 0 && !styles.width.includes("%");
    var hasFixedHeight = parseNumeric(styles.height) > 0 && !styles.height.includes("%");
    frame.primaryAxisSizingMode = "AUTO";
    frame.counterAxisSizingMode = "AUTO";
    if (hasFixedWidth) {
      frame.layoutSizingHorizontal = "FIXED";
    } else if (styles.width !== "100%") {
      frame.layoutSizingHorizontal = "HUG";
    }
    if (hasFixedHeight) {
      frame.layoutSizingVertical = "FIXED";
    } else if (styles.height !== "100%") {
      frame.layoutSizingVertical = "HUG";
    }
    if (styles.minWidth) {
      const val = parseNumeric(styles.minWidth);
      if (val > 0)
        frame.minWidth = val;
    }
    if (styles.maxWidth) {
      const val = parseNumeric(styles.maxWidth);
      if (val > 0)
        frame.maxWidth = val;
    }
    if (styles.minHeight) {
      const val = parseNumeric(styles.minHeight);
      if (val > 0)
        frame.minHeight = val;
    }
    if (styles.maxHeight) {
      const val = parseNumeric(styles.maxHeight);
      if (val > 0)
        frame.maxHeight = val;
    }
  }
  function parsePadding(styles) {
    let top = 0, right = 0, bottom = 0, left = 0;
    if (styles.padding) {
      const parts = styles.padding.trim().split(/\s+/).map((v) => parseNumeric(v) || 0);
      if (parts.length === 1) {
        top = right = bottom = left = parts[0];
      } else if (parts.length === 2) {
        top = bottom = parts[0];
        right = left = parts[1];
      } else if (parts.length === 3) {
        top = parts[0];
        right = left = parts[1];
        bottom = parts[2];
      } else if (parts.length === 4) {
        top = parts[0];
        right = parts[1];
        bottom = parts[2];
        left = parts[3];
      }
    }
    if (styles.paddingTop)
      top = parseNumeric(styles.paddingTop) || top;
    if (styles.paddingRight)
      right = parseNumeric(styles.paddingRight) || right;
    if (styles.paddingBottom)
      bottom = parseNumeric(styles.paddingBottom) || bottom;
    if (styles.paddingLeft)
      left = parseNumeric(styles.paddingLeft) || left;
    return { top, right, bottom, left };
  }
  function parseBorderRadius(value) {
    const parts = value.trim().split(/\s+/).map((v) => parseNumeric(v) || 0);
    if (parts.length === 1)
      return { uniform: parts[0] };
    if (parts.length === 2)
      return { topLeft: parts[0], topRight: parts[1], bottomRight: parts[0], bottomLeft: parts[1] };
    if (parts.length === 3)
      return { topLeft: parts[0], topRight: parts[1], bottomRight: parts[2], bottomLeft: parts[1] };
    return { topLeft: parts[0], topRight: parts[1], bottomRight: parts[2], bottomLeft: parts[3] };
  }
  function parseBorder(borderStr) {
    const match = borderStr.match(/^([\d.]+)(px)?\s+(solid|dashed|dotted)?\s*(.+)?$/i);
    if (!match) {
      const simpleMatch = borderStr.match(/([\d.]+)(px)?/);
      if (simpleMatch) {
        return { width: parseFloat(simpleMatch[1]), color: { r: 0.82, g: 0.82, b: 0.82, a: 1 } };
      }
      return null;
    }
    const width = parseFloat(match[1]);
    const colorStr = match[4] || "#d1d5db";
    const color = parseColor(colorStr);
    return { width, color };
  }
  function applyIndividualBorders(frame, styles) {
    const borders = ["borderTop", "borderRight", "borderBottom", "borderLeft"];
    let hasAny = false;
    for (const b of borders) {
      if (styles[b] && styles[b] !== "none") {
        hasAny = true;
        break;
      }
    }
    if (!hasAny)
      return;
    const first = styles.borderTop || styles.borderRight || styles.borderBottom || styles.borderLeft;
    if (first) {
      const parsed = parseBorder(first);
      if (parsed) {
        frame.strokes = [{ type: "SOLID", color: { r: parsed.color.r, g: parsed.color.g, b: parsed.color.b } }];
        frame.strokeWeight = parsed.width;
        frame.strokeAlign = "INSIDE";
      }
    }
  }
  function isTextElement(node) {
    if (!node.children || node.children.length === 0)
      return false;
    return node.children.every(
      (child) => child.type === "text" || child.type === "element" && child.isInline && isTextElement(child)
    );
  }
  function getTextContent(node) {
    if (node.type === "text")
      return node.content;
    if (!node.children)
      return "";
    return node.children.map(getTextContent).join("");
  }
  function hasBlockStyles(styles) {
    return styles.display === "flex" || styles.display === "grid" || styles.background || styles.backgroundColor || styles.border || styles.boxShadow || styles.borderRadius;
  }
  function getNodeName(node) {
    if (node.attrs && node.attrs.id)
      return `#${node.attrs.id}`;
    if (node.attrs && node.attrs.class)
      return `.${node.attrs.class.split(" ")[0]}`;
    return node.tag;
  }
  function parseNumeric(value) {
    if (!value)
      return 0;
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  }

  // src/code.js
  figma.showUI(__html__, { width: 480, height: 600 });
  figma.ui.onmessage = async (msg) => {
    if (msg.type === "convert-html") {
      try {
        figma.ui.postMessage({ type: "conversion-progress", message: "Parsing HTML..." });
        const tree = parseHTML(msg.html);
        if (!tree.children || tree.children.length === 0) {
          figma.ui.postMessage({
            type: "conversion-error",
            message: "No valid HTML elements found. Check your input."
          });
          return;
        }
        figma.ui.postMessage({ type: "conversion-progress", message: "Creating Figma layers..." });
        const result = await convertToFigma(tree, msg.options);
        figma.ui.postMessage({
          type: "conversion-complete",
          nodeCount: result.nodeCount
        });
      } catch (err) {
        figma.ui.postMessage({
          type: "conversion-error",
          message: `Error: ${err.message || "Unknown error occurred"}`
        });
      }
    }
  };
})();
