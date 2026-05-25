/**
 * HTML/CSS Parser - Parses an HTML string into a tree of style-annotated nodes
 * that can be mapped to Figma layers.
 *
 * Runs inside the Figma sandbox (no DOM access), so we use a regex/state-machine
 * based parser instead of DOMParser.
 */

const SELF_CLOSING_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

const BLOCK_ELEMENTS = new Set([
  'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'section', 'article',
  'header', 'footer', 'nav', 'main', 'aside', 'ul', 'ol', 'li', 'table',
  'tr', 'td', 'th', 'thead', 'tbody', 'form', 'fieldset', 'blockquote',
  'pre', 'figure', 'figcaption', 'details', 'summary', 'address'
]);

const INLINE_ELEMENTS = new Set([
  'span', 'a', 'strong', 'em', 'b', 'i', 'u', 'small', 'sub', 'sup',
  'code', 'kbd', 'mark', 'abbr', 'cite', 'q', 'label', 'time'
]);

const DEFAULT_STYLES = {
  h1: { fontSize: '32px', fontWeight: '700', marginTop: '0px', marginBottom: '16px' },
  h2: { fontSize: '24px', fontWeight: '700', marginTop: '0px', marginBottom: '12px' },
  h3: { fontSize: '20px', fontWeight: '700', marginTop: '0px', marginBottom: '10px' },
  h4: { fontSize: '18px', fontWeight: '600', marginTop: '0px', marginBottom: '8px' },
  h5: { fontSize: '16px', fontWeight: '600', marginTop: '0px', marginBottom: '6px' },
  h6: { fontSize: '14px', fontWeight: '600', marginTop: '0px', marginBottom: '4px' },
  p: { fontSize: '14px', fontWeight: '400', marginTop: '0px', marginBottom: '16px' },
  strong: { fontWeight: '700' },
  b: { fontWeight: '700' },
  em: { fontStyle: 'italic' },
  i: { fontStyle: 'italic' },
  u: { textDecoration: 'underline' },
  small: { fontSize: '12px' },
  code: { fontFamily: 'monospace', fontSize: '13px', background: '#f1f5f9', padding: '2px 4px', borderRadius: '3px' },
  a: { color: '#0ea5e9', textDecoration: 'underline' },
  button: { padding: '8px 16px', fontSize: '14px', borderRadius: '4px', background: '#e2e8f0', cursor: 'pointer' },
  input: { padding: '8px 12px', fontSize: '14px', border: '1px solid #d1d5db', borderRadius: '4px' },
};

export function parseHTML(htmlString) {
  const cleaned = htmlString.trim();
  const tokens = tokenize(cleaned);
  const tree = buildTree(tokens);
  return tree;
}

function tokenize(html) {
  const tokens = [];
  let i = 0;

  while (i < html.length) {
    if (html[i] === '<') {
      if (html.substring(i, i + 4) === '<!--') {
        const endComment = html.indexOf('-->', i + 4);
        i = endComment === -1 ? html.length : endComment + 3;
        continue;
      }

      if (html.substring(i, i + 9).toLowerCase() === '<![cdata[') {
        const endCdata = html.indexOf(']]>', i + 9);
        i = endCdata === -1 ? html.length : endCdata + 3;
        continue;
      }

      const tagEnd = html.indexOf('>', i);
      if (tagEnd === -1) break;

      const tagContent = html.substring(i + 1, tagEnd);
      const isSelfClose = tagContent.endsWith('/');
      const rawTag = isSelfClose ? tagContent.slice(0, -1) : tagContent;

      if (rawTag.startsWith('/')) {
        tokens.push({ type: 'close', tag: rawTag.substring(1).trim().split(/\s/)[0].toLowerCase() });
      } else {
        const parsed = parseTag(rawTag);
        if (parsed) {
          parsed.selfClosing = isSelfClose || SELF_CLOSING_TAGS.has(parsed.tag);
          tokens.push(parsed);
        }
      }
      i = tagEnd + 1;
    } else {
      let textEnd = html.indexOf('<', i);
      if (textEnd === -1) textEnd = html.length;
      const text = html.substring(i, textEnd);
      const decoded = decodeEntities(text);
      if (decoded.trim()) {
        tokens.push({ type: 'text', content: decoded });
      }
      i = textEnd;
    }
  }

  return tokens;
}

function parseTag(raw) {
  const match = raw.match(/^(\w[\w-]*)/);
  if (!match) return null;

  const tag = match[1].toLowerCase();

  if (tag === 'style' || tag === 'script' || tag === 'link' || tag === 'meta') {
    return null;
  }

  const attrs = {};
  const attrRegex = /([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g;
  let attrMatch;
  while ((attrMatch = attrRegex.exec(raw)) !== null) {
    const name = attrMatch[1].toLowerCase();
    const value = (attrMatch[2] !== undefined ? attrMatch[2] : attrMatch[3] !== undefined ? attrMatch[3] : attrMatch[4] !== undefined ? attrMatch[4] : '');
    attrs[name] = value;
  }

  return { type: 'open', tag, attrs, selfClosing: false };
}

function buildTree(tokens) {
  const root = { type: 'element', tag: 'root', children: [], styles: {}, attrs: {} };
  const stack = [root];

  for (const token of tokens) {
    const parent = stack[stack.length - 1];

    if (token.type === 'text') {
      parent.children.push({
        type: 'text',
        content: token.content,
        styles: {}
      });
    } else if (token.type === 'open') {
      const node = {
        type: 'element',
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
    } else if (token.type === 'close') {
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
  const styles = { ...(DEFAULT_STYLES[tag] || {}) };

  if (attrs.style) {
    const inlineStyles = parseInlineStyle(attrs.style);
    Object.assign(styles, inlineStyles);
  }

  return styles;
}

export function parseInlineStyle(styleStr) {
  const styles = {};
  const declarations = styleStr.split(';');

  for (const decl of declarations) {
    const colonIdx = decl.indexOf(':');
    if (colonIdx === -1) continue;

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
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
    '&#39;': "'", '&apos;': "'", '&nbsp;': ' ', '&#x27;': "'",
    '&hellip;': '...', '&mdash;': '\u2014', '&ndash;': '\u2013',
    '&laquo;': '\u00AB', '&raquo;': '\u00BB', '&copy;': '\u00A9',
    '&reg;': '\u00AE', '&trade;': '\u2122',
  };
  let result = text;
  for (const [entity, char] of Object.entries(entities)) {
    result = result.split(entity).join(char);
  }
  result = result.replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  return result;
}
