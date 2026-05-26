/**
 * Figma Node Mapper - Converts parsed HTML nodes into Figma API calls.
 * Runs in the Figma plugin sandbox with access to `figma.*`.
 *
 * Focuses on creating auto-layout frames that mirror CSS flexbox.
 */

import { parseColor, parseBoxShadow, parseGradient } from './color-utils.js';

const FONT_WEIGHT_MAP = {
  '100': 'Thin', '200': 'Extra Light', '300': 'Light',
  '400': 'Regular', '500': 'Medium', '600': 'Semi Bold',
  '700': 'Bold', '800': 'Extra Bold', '900': 'Black',
  'normal': 'Regular', 'bold': 'Bold',
  'lighter': 'Light', 'bolder': 'Bold'
};

export async function convertToFigma(tree, options) {
  let nodeCount = 0;

  // Default viewport width for calculating percentage-based sizing
  const VIEWPORT_WIDTH = 1200;

  async function processNode(node, parent, isFullWidth = false) {
    if (node.type === 'text') {
      const textNode = await createTextNode(node.content, node.styles || {}, parent);
      if (textNode) {
        parent.appendChild(textNode);
        nodeCount++;
      }
      return;
    }

    if (node.tag === 'root') {
      for (const child of node.children) {
        await processNode(child, parent, isFullWidth);
      }
      return;
    }

    if (node.tag === 'br' || node.tag === 'hr') {
      if (node.tag === 'hr') {
        const line = figma.createRectangle();
        line.name = 'hr';
        line.resize(200, 1);
        line.fills = [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85 } }];
        if (parent.layoutMode && parent.layoutMode !== 'NONE') {
          line.layoutSizingHorizontal = 'FILL';
        }
        parent.appendChild(line);
        nodeCount++;
      }
      return;
    }

    if (node.tag === 'img') {
      const frame = figma.createFrame();
      const w = parseNumeric((node.attrs && node.attrs.width) || node.styles.width) || 150;
      const h = parseNumeric((node.attrs && node.attrs.height) || node.styles.height) || 100;
      frame.resize(w, h);
      frame.fills = [{ type: 'SOLID', color: { r: 0.92, g: 0.92, b: 0.95 } }];
      frame.name = (node.attrs && node.attrs.alt) || 'Image';
      frame.cornerRadius = parseNumeric(node.styles.borderRadius) || 0;
      parent.appendChild(frame);
      nodeCount++;
      return;
    }

    const isTextOnly = isTextElement(node);

    if (isTextOnly && !hasBlockStyles(node.styles)) {
      const text = getTextContent(node);
      const mergedStyles = { ...node.styles };
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

    // Pass viewport width context for proper frame sizing
    // This applies to body, section, and other layout containers
    const useViewportWidth = isFullWidthContainer(node) || !node.styles.maxWidth;

    applyFrameStyles(frame, node.styles, options, useViewportWidth ? VIEWPORT_WIDTH : undefined, node.tag);

    parent.appendChild(frame);

    applyChildLayoutProps(frame, node.styles, parent);

    if (options.preserveHierarchy) {
      for (const child of node.children) {
        await processNode(child, frame, useViewportWidth);
      }
    } else {
      for (const child of node.children) {
        await processNode(child, frame, useViewportWidth);
      }
    }
  }

  const rootFrame = figma.createFrame();
  rootFrame.name = 'HTML Import';
  rootFrame.fills = [];

  if (options.autoLayout) {
    rootFrame.layoutMode = 'VERTICAL';
    rootFrame.primaryAxisSizingMode = 'AUTO';
    rootFrame.counterAxisSizingMode = 'AUTO';
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
  if (!text.trim()) return null;

  const textNode = figma.createText();

  const weight = styles.fontWeight || '400';
  const figmaStyle = FONT_WEIGHT_MAP[weight] || 'Regular';

  let fontFamily = 'Inter';
  if (styles.fontFamily) {
    const firstFont = styles.fontFamily.split(',')[0].trim().replace(/['"]/g, '');
    if (firstFont && !['monospace', 'sans-serif', 'serif', 'cursive', 'fantasy'].includes(firstFont)) {
      fontFamily = firstFont;
    }
  }

  try {
    await figma.loadFontAsync({ family: fontFamily, style: figmaStyle });
  } catch {
    try {
      await figma.loadFontAsync({ family: 'Inter', style: figmaStyle });
      fontFamily = 'Inter';
    } catch {
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
      fontFamily = 'Inter';
    }
  }

  textNode.fontName = { family: fontFamily, style: figmaStyle };
  textNode.characters = text;

  const fontSize = parseNumeric(styles.fontSize) || 14;
  textNode.fontSize = fontSize;

  if (styles.lineHeight) {
    const lh = styles.lineHeight;
    if (lh.endsWith('%')) {
      textNode.lineHeight = { value: parseFloat(lh), unit: 'PERCENT' };
    } else if (lh === 'normal' || lh === 'auto') {
      textNode.lineHeight = { unit: 'AUTO' };
    } else {
      const val = parseFloat(lh);
      if (val > 0) {
        if (val < 4) {
          textNode.lineHeight = { value: val * 100, unit: 'PERCENT' };
        } else {
          textNode.lineHeight = { value: val, unit: 'PIXELS' };
        }
      }
    }
  }

  if (styles.letterSpacing) {
    const ls = parseFloat(styles.letterSpacing);
    if (!isNaN(ls)) {
      textNode.letterSpacing = { value: ls, unit: 'PIXELS' };
    }
  }

  if (styles.textAlign) {
    const alignMap = { left: 'LEFT', center: 'CENTER', right: 'RIGHT', justify: 'JUSTIFIED' };
    textNode.textAlignHorizontal = alignMap[styles.textAlign] || 'LEFT';
  }

  if (styles.textDecoration) {
    if (styles.textDecoration.includes('underline')) {
      textNode.textDecoration = 'UNDERLINE';
    } else if (styles.textDecoration.includes('line-through')) {
      textNode.textDecoration = 'STRIKETHROUGH';
    }
  }

  if (styles.textTransform) {
    const caseMap = { uppercase: 'UPPER', lowercase: 'LOWER', capitalize: 'TITLE' };
    textNode.textCase = caseMap[styles.textTransform] || 'ORIGINAL';
  }

  if (styles.color) {
    const color = parseColor(styles.color);
    textNode.fills = [{ type: 'SOLID', color: { r: color.r, g: color.g, b: color.b }, opacity: color.a }];
  } else {
    textNode.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }];
  }

  textNode.textAutoResize = 'WIDTH_AND_HEIGHT';

  return textNode;
}

function applyTextLayoutProps(textNode, styles, parent) {
  if (!parent.layoutMode || parent.layoutMode === 'NONE') return;

  if (styles.width === '100%' || parent.layoutMode === 'VERTICAL') {
    textNode.layoutSizingHorizontal = 'FILL';
    textNode.textAutoResize = 'HEIGHT';
  }
}

function applyChildLayoutProps(frame, styles, parent) {
  if (!parent.layoutMode || parent.layoutMode === 'NONE') return;

  var display = styles.display || '';
  var isInlineLevel = display === 'inline' || display === 'inline-block' || display === 'inline-flex';

  // Don't apply FILL if max-width is constrained — max-width indicates desired size
  const hasMaxWidth = parseNumeric(styles.maxWidth) > 0;

  // FILL can only be set after the child is appended to an auto-layout parent
  if (!hasMaxWidth) {
    if (styles.width === '100%' || styles.flex === '1' || styles.flexGrow === '1') {
      frame.layoutSizingHorizontal = 'FILL';
    } else if (parent.layoutMode === 'VERTICAL' && !isInlineLevel && !parseNumeric(styles.width) && styles.width !== '100%') {
      frame.layoutSizingHorizontal = 'FILL';
    }
  }

  if (styles.height === '100%') {
    frame.layoutSizingVertical = 'FILL';
  }

  if (styles.alignSelf) {
    var selfMap = {
      'flex-start': 'MIN', 'start': 'MIN', 'center': 'CENTER',
      'flex-end': 'MAX', 'end': 'MAX', 'stretch': 'STRETCH'
    };
    frame.layoutAlign = selfMap[styles.alignSelf] || 'INHERIT';
  }
}

function applyFrameStyles(frame, styles, options, viewportWidth, nodeTag) {
  let width = parseNumeric(styles.width);
  let height = parseNumeric(styles.height);

  // Handle percentage widths if we have a viewport reference
  if (!width && styles.width && styles.width.includes('%') && viewportWidth) {
    const percent = parseNumeric(styles.width) / 100;
    width = Math.round(viewportWidth * percent);
  }

  // Use max-width as frame width if no explicit width is set
  if (!width && parseNumeric(styles.maxWidth) > 0) {
    width = parseNumeric(styles.maxWidth);
  }

  // For full-width containers with no explicit width, use viewport width
  if (!width && viewportWidth && ['body', 'section', 'header', 'footer', 'main'].includes(nodeTag)) {
    width = viewportWidth;
  }

  if (width && height) {
    frame.resize(Math.max(width, 1), Math.max(height, 1));
  } else if (width) {
    frame.resize(Math.max(width, 1), 40);
  } else if (height) {
    frame.resize(1200, Math.max(height, 1));
  } else {
    frame.resize(1200, 40);
  }

  frame.fills = [];
  if (styles.background || styles.backgroundColor) {
    const bgValue = styles.background || styles.backgroundColor;
    if (bgValue.includes('gradient')) {
      const gradient = parseGradient(bgValue);
      if (gradient) {
        frame.fills = [gradient];
      }
    } else {
      const color = parseColor(bgValue);
      if (color.a > 0) {
        frame.fills = [{ type: 'SOLID', color: { r: color.r, g: color.g, b: color.b }, opacity: color.a }];
      }
    }
  }

  if (styles.borderRadius) {
    const radii = parseBorderRadius(styles.borderRadius);
    if (radii.uniform !== undefined) {
      frame.cornerRadius = radii.uniform;
    } else {
      frame.topLeftRadius = radii.topLeft || 0;
      frame.topRightRadius = radii.topRight || 0;
      frame.bottomRightRadius = radii.bottomRight || 0;
      frame.bottomLeftRadius = radii.bottomLeft || 0;
    }
  }

  if (styles.border && styles.border !== 'none') {
    const borderParsed = parseBorder(styles.border);
    if (borderParsed) {
      frame.strokes = [{ type: 'SOLID', color: { r: borderParsed.color.r, g: borderParsed.color.g, b: borderParsed.color.b } }];
      frame.strokeWeight = borderParsed.width;
      frame.strokeAlign = 'INSIDE';
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
    if (val >= 0 && val <= 1) frame.opacity = val;
  }

  if (styles.overflow === 'hidden') {
    frame.clipsContent = true;
  } else {
    frame.clipsContent = false;
  }

  if (options.autoLayout) {
    applyAutoLayout(frame, styles);
  }
}

function applyAutoLayout(frame, styles) {
  const display = styles.display || '';
  const flexDirection = styles.flexDirection || 'row';

  if (display === 'flex' || display === 'inline-flex') {
    frame.layoutMode = flexDirection === 'column' || flexDirection === 'column-reverse' ? 'VERTICAL' : 'HORIZONTAL';
  } else if (display === 'grid' || display === 'inline-grid') {
    frame.layoutMode = 'VERTICAL';
  } else {
    frame.layoutMode = 'VERTICAL';
  }

  const padding = parsePadding(styles);
  frame.paddingTop = padding.top;
  frame.paddingBottom = padding.bottom;
  frame.paddingLeft = padding.left;
  frame.paddingRight = padding.right;

  if (styles.gap) {
    const gapVal = parseNumeric(styles.gap) || 0;
    frame.itemSpacing = gapVal;
  } else if (styles.columnGap && frame.layoutMode === 'HORIZONTAL') {
    frame.itemSpacing = parseNumeric(styles.columnGap) || 0;
  } else if (styles.rowGap && frame.layoutMode === 'VERTICAL') {
    frame.itemSpacing = parseNumeric(styles.rowGap) || 0;
  } else {
    frame.itemSpacing = 0;
  }

  if (styles.justifyContent) {
    const justifyMap = {
      'flex-start': 'MIN', 'start': 'MIN', 'center': 'CENTER',
      'flex-end': 'MAX', 'end': 'MAX', 'space-between': 'SPACE_BETWEEN'
    };
    frame.primaryAxisAlignItems = justifyMap[styles.justifyContent] || 'MIN';
  }

  if (styles.alignItems) {
    const alignMap = {
      'flex-start': 'MIN', 'start': 'MIN', 'center': 'CENTER',
      'flex-end': 'MAX', 'end': 'MAX', 'stretch': 'MIN', 'baseline': 'BASELINE'
    };
    frame.counterAxisAlignItems = alignMap[styles.alignItems] || 'MIN';
  }

  if (styles.textAlign === 'center' && frame.layoutMode === 'VERTICAL') {
    frame.counterAxisAlignItems = 'CENTER';
  } else if (styles.textAlign === 'right' && frame.layoutMode === 'VERTICAL') {
    frame.counterAxisAlignItems = 'MAX';
  }

  if (styles.flexWrap === 'wrap') {
    frame.layoutWrap = 'WRAP';
    if (styles.gap) {
      frame.counterAxisSpacing = parseNumeric(styles.gap) || 0;
    }
  }

  var hasFixedWidth = parseNumeric(styles.width) > 0 && !styles.width.includes('%');
  var hasFixedHeight = parseNumeric(styles.height) > 0 && !styles.height.includes('%');

  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';

  // Only set FIXED or HUG here — FILL requires the frame to already be a child
  // of an auto-layout parent, which hasn't happened yet at this point.
  // FILL sizing is applied in applyChildLayoutProps after appendChild.
  if (hasFixedWidth) {
    frame.layoutSizingHorizontal = 'FIXED';
  } else if (styles.width !== '100%') {
    frame.layoutSizingHorizontal = 'HUG';
  }

  if (hasFixedHeight) {
    frame.layoutSizingVertical = 'FIXED';
  } else if (styles.height !== '100%') {
    frame.layoutSizingVertical = 'HUG';
  }

  if (styles.minWidth) {
    const val = parseNumeric(styles.minWidth);
    if (val > 0) frame.minWidth = val;
  }
  if (styles.maxWidth) {
    const val = parseNumeric(styles.maxWidth);
    if (val > 0) frame.maxWidth = val;
  }
  if (styles.minHeight) {
    const val = parseNumeric(styles.minHeight);
    if (val > 0) frame.minHeight = val;
  }
  if (styles.maxHeight) {
    const val = parseNumeric(styles.maxHeight);
    if (val > 0) frame.maxHeight = val;
  }
}

function parsePadding(styles) {
  let top = 0, right = 0, bottom = 0, left = 0;

  if (styles.padding) {
    const parts = styles.padding.trim().split(/\s+/).map(v => parseNumeric(v) || 0);
    if (parts.length === 1) {
      top = right = bottom = left = parts[0];
    } else if (parts.length === 2) {
      top = bottom = parts[0];
      right = left = parts[1];
    } else if (parts.length === 3) {
      top = parts[0]; right = left = parts[1]; bottom = parts[2];
    } else if (parts.length === 4) {
      top = parts[0]; right = parts[1]; bottom = parts[2]; left = parts[3];
    }
  }

  if (styles.paddingTop) top = parseNumeric(styles.paddingTop) || top;
  if (styles.paddingRight) right = parseNumeric(styles.paddingRight) || right;
  if (styles.paddingBottom) bottom = parseNumeric(styles.paddingBottom) || bottom;
  if (styles.paddingLeft) left = parseNumeric(styles.paddingLeft) || left;

  return { top, right, bottom, left };
}

function parseBorderRadius(value) {
  const parts = value.trim().split(/\s+/).map(v => parseNumeric(v) || 0);
  if (parts.length === 1) return { uniform: parts[0] };
  if (parts.length === 2) return { topLeft: parts[0], topRight: parts[1], bottomRight: parts[0], bottomLeft: parts[1] };
  if (parts.length === 3) return { topLeft: parts[0], topRight: parts[1], bottomRight: parts[2], bottomLeft: parts[1] };
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
  const colorStr = match[4] || '#d1d5db';
  const color = parseColor(colorStr);
  return { width, color };
}

function applyIndividualBorders(frame, styles) {
  const borders = ['borderTop', 'borderRight', 'borderBottom', 'borderLeft'];
  let hasAny = false;
  for (const b of borders) {
    if (styles[b] && styles[b] !== 'none') { hasAny = true; break; }
  }
  if (!hasAny) return;

  const first = styles.borderTop || styles.borderRight || styles.borderBottom || styles.borderLeft;
  if (first) {
    const parsed = parseBorder(first);
    if (parsed) {
      frame.strokes = [{ type: 'SOLID', color: { r: parsed.color.r, g: parsed.color.g, b: parsed.color.b } }];
      frame.strokeWeight = parsed.width;
      frame.strokeAlign = 'INSIDE';
    }
  }
}

function isTextElement(node) {
  if (!node.children || node.children.length === 0) return false;
  return node.children.every(child =>
    child.type === 'text' ||
    (child.type === 'element' && child.isInline && isTextElement(child))
  );
}

function getTextContent(node) {
  if (node.type === 'text') return node.content;
  if (!node.children) return '';
  return node.children.map(getTextContent).join('');
}

function hasBlockStyles(styles) {
  return styles.display === 'flex' || styles.display === 'grid' ||
    styles.background || styles.backgroundColor ||
    styles.border || styles.boxShadow ||
    styles.borderRadius;
}

function getNodeName(node) {
  if (node.attrs && node.attrs.id) return `#${node.attrs.id}`;
  if (node.attrs && node.attrs.class) return `.${node.attrs.class.split(' ')[0]}`;
  return node.tag;
}

function isFullWidthContainer(node) {
  // Body, section, header, footer typically span full width
  if (['body', 'section', 'header', 'footer', 'main'].includes(node.tag)) {
    return true;
  }

  // If it has percentage-based padding (like 8%), it's meant for full-width layouts
  const padding = node.styles.padding || '';
  const paddingLeft = node.styles.paddingLeft || '';
  const paddingRight = node.styles.paddingRight || '';

  if (padding.includes('%') || paddingLeft.includes('%') || paddingRight.includes('%')) {
    return true;
  }

  return false;
}

function parseNumeric(value) {
  if (!value) return 0;
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}
