import { parseHTML } from './src/parser.js';

const TEMPLATES = {
  button: `<button style="padding: 12px 24px; background: #0ea5e9; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600;">Click Me</button>`,
  card: `<div style="display: flex; flex-direction: column; gap: 16px; width: 320px; padding: 24px; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
  <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #1a1a2e;">Card Title</h2>
  <p style="margin: 0; font-size: 14px; color: #64748b; line-height: 1.5;">This is a sample card component with text content and a call-to-action button below.</p>
  <button style="padding: 10px 20px; background: #0ea5e9; color: white; border: none; border-radius: 6px; font-size: 13px; font-weight: 600;">Learn More</button>
</div>`,
  nav: `<nav style="display: flex; align-items: center; justify-content: space-between; padding: 16px 32px; background: #1a1a2e; border-radius: 8px;">
  <span style="font-size: 18px; font-weight: 700; color: #ffffff;">Brand</span>
  <div style="display: flex; gap: 24px;">
    <a style="font-size: 14px; color: #a0aec0; text-decoration: none;">Home</a>
    <a style="font-size: 14px; color: #a0aec0; text-decoration: none;">About</a>
    <a style="font-size: 14px; color: #a0aec0; text-decoration: none;">Contact</a>
  </div>
</nav>`,
  hero: `<section style="display: flex; flex-direction: column; align-items: center; padding: 64px 48px; gap: 16px; background: linear-gradient(135deg, #0f172a, #1e293b); border-radius: 16px; text-align: center;">
  <h1 style="font-size: 36px; font-weight: 800; color: #f8fafc; margin: 0;">Build Something Amazing</h1>
  <p style="font-size: 16px; color: #94a3b8; margin: 0; max-width: 480px;">The fastest way to turn your HTML prototypes into editable Figma designs with auto-layout.</p>
  <div style="display: flex; gap: 12px; margin-top: 16px;">
    <button style="padding: 12px 28px; background: #0ea5e9; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600;">Get Started</button>
    <button style="padding: 12px 28px; background: transparent; color: #e2e8f0; border: 1px solid #475569; border-radius: 8px; font-size: 14px; font-weight: 500;">Learn More</button>
  </div>
</section>`
};

const htmlInput = document.getElementById('html-input');
const btnConvert = document.getElementById('btn-convert');
const btnClear = document.getElementById('btn-clear');
const layerTree = document.getElementById('layer-tree');
const nodeCountEl = document.getElementById('node-count');
const statusBar = document.getElementById('status-bar');
const statusText = document.getElementById('status-text');

document.querySelectorAll('.template-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    const template = pill.dataset.template;
    if (TEMPLATES[template]) {
      htmlInput.value = TEMPLATES[template];
      convertHTML();
    }
  });
});

btnClear.addEventListener('click', () => {
  htmlInput.value = '';
  layerTree.innerHTML = `<div class="layer-empty"><i class="bi bi-diagram-3"></i><p>Convert HTML to see the Figma layer structure<br>with auto-layout properties</p></div>`;
  nodeCountEl.textContent = '';
  hideStatus();
});

btnConvert.addEventListener('click', convertHTML);

htmlInput.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    convertHTML();
  }
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = htmlInput.selectionStart;
    const end = htmlInput.selectionEnd;
    htmlInput.value = htmlInput.value.substring(0, start) + '  ' + htmlInput.value.substring(end);
    htmlInput.selectionStart = htmlInput.selectionEnd = start + 2;
  }
});

function convertHTML() {
  const html = htmlInput.value.trim();
  if (!html) {
    showStatus('info', 'Paste some HTML to convert.');
    return;
  }

  const tree = parseHTML(html);
  if (!tree.children || tree.children.length === 0) {
    showStatus('info', 'No valid HTML elements found.');
    return;
  }

  const { html: treeHtml, count } = renderLayerTree(tree);
  layerTree.innerHTML = treeHtml;
  nodeCountEl.textContent = `${count} layers`;
  showStatus('success', `Converted to ${count} Figma layers with auto-layout. Install the plugin in Figma to create these on canvas.`);
}

function renderLayerTree(tree) {
  let count = 0;

  function renderNode(node, depth) {
    if (node.type === 'text') {
      const text = node.content.trim();
      if (!text) return '';
      count++;
      const display = text.length > 40 ? text.substring(0, 40) + '...' : text;
      return `<div class="layer-node">
        <div class="layer-row" style="padding-left: ${depth * 4}px">
          <span class="layer-icon text"><i class="bi bi-type"></i></span>
          <span class="layer-name" style="color: var(--figma-text)">"${escHtml(display)}"</span>
        </div>
      </div>`;
    }

    if (node.tag === 'root') {
      let childrenHtml = '';
      for (const child of node.children) {
        childrenHtml += renderNode(child, depth);
      }
      count++;
      const autoInfo = getAutoLayoutInfo({ display: 'flex', flexDirection: 'column' });
      return `<div class="layer-node">
        <div class="layer-row">
          <span class="layer-icon frame"><i class="bi bi-bounding-box"></i></span>
          <span class="layer-name">HTML Import</span>
          <span class="layer-badge autolayout">Auto V</span>
          <span class="layer-badge hug">Hug</span>
        </div>
        <div class="layer-children">${childrenHtml}</div>
      </div>`;
    }

    count++;
    const styles = node.styles || {};
    const name = getNodeName(node);
    const isTextOnly = isTextElement(node);

    if (isTextOnly && !hasBlockStyles(styles)) {
      const text = getTextContent(node);
      const display = text.length > 35 ? text.substring(0, 35) + '...' : text;
      const props = [];
      if (styles.fontSize) props.push(styles.fontSize);
      if (styles.fontWeight && styles.fontWeight !== '400') props.push(`w${styles.fontWeight}`);
      if (styles.color) props.push(styles.color);

      return `<div class="layer-node">
        <div class="layer-row" style="padding-left: ${depth * 4}px">
          <span class="layer-icon text"><i class="bi bi-type"></i></span>
          <span class="layer-name" style="color: var(--figma-text)">${escHtml(name)}</span>
          ${props.length ? `<span class="layer-props">${props.map(p => `<span>${escHtml(p)}</span>`).join('')}</span>` : ''}
        </div>
      </div>`;
    }

    const autoInfo = getAutoLayoutInfo(styles);
    const badges = [];

    if (autoInfo.direction) {
      badges.push(`<span class="layer-badge autolayout">Auto ${autoInfo.direction}</span>`);
    }
    if (autoInfo.sizing) {
      const cls = autoInfo.sizing === 'Fill' ? 'fill' : 'hug';
      badges.push(`<span class="layer-badge ${cls}">${autoInfo.sizing}</span>`);
    }

    const props = [];
    if (autoInfo.padding) props.push(`pad: ${autoInfo.padding}`);
    if (autoInfo.gap) props.push(`gap: ${autoInfo.gap}`);
    if (autoInfo.justify) props.push(autoInfo.justify);
    if (autoInfo.align) props.push(autoInfo.align);

    let childrenHtml = '';
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        childrenHtml += renderNode(child, depth + 1);
      }
    }

    return `<div class="layer-node">
      <div class="layer-row" style="padding-left: ${depth * 4}px">
        <span class="layer-icon frame"><i class="bi bi-bounding-box"></i></span>
        <span class="layer-name">${escHtml(name)}</span>
        ${badges.join('')}
        ${props.length ? `<span class="layer-props">${props.map(p => `<span>${escHtml(p)}</span>`).join('')}</span>` : ''}
      </div>
      ${childrenHtml ? `<div class="layer-children">${childrenHtml}</div>` : ''}
    </div>`;
  }

  const html = renderNode(tree, 0);
  return { html, count };
}

function getAutoLayoutInfo(styles) {
  const info = {};
  const display = styles.display || '';
  const flexDir = styles.flexDirection || 'column';

  if (display === 'flex' || display === 'inline-flex') {
    info.direction = (flexDir === 'row' || flexDir === 'row-reverse') ? 'H' : 'V';
  } else {
    info.direction = 'V';
  }

  if (styles.padding) {
    const parts = styles.padding.trim().split(/\s+/);
    if (parts.length === 1) {
      info.padding = parts[0];
    } else if (parts.length === 2) {
      info.padding = `${parts[0]} ${parts[1]}`;
    } else {
      info.padding = styles.padding.trim();
    }
  }

  if (styles.gap) {
    info.gap = styles.gap;
  }

  if (styles.justifyContent) {
    const map = { 'flex-start': 'start', 'center': 'center', 'flex-end': 'end', 'space-between': 'between' };
    info.justify = map[styles.justifyContent] || styles.justifyContent;
  }

  if (styles.alignItems) {
    const map = { 'flex-start': 'top', 'center': 'center', 'flex-end': 'bottom', 'stretch': 'stretch' };
    info.align = map[styles.alignItems] || styles.alignItems;
  }

  if (styles.width) {
    if (styles.width === '100%') {
      info.sizing = 'Fill';
    } else if (parseFloat(styles.width) > 0) {
      info.sizing = styles.width;
    } else {
      info.sizing = 'Hug';
    }
  } else {
    info.sizing = 'Hug';
  }

  return info;
}

function getNodeName(node) {
  if (node.attrs?.id) return `#${node.attrs.id}`;
  if (node.attrs?.class) return `.${node.attrs.class.split(' ')[0]}`;
  return node.tag;
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

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showStatus(type, message) {
  statusBar.className = `status-bar visible ${type}`;
  statusText.textContent = message;
}

function hideStatus() {
  statusBar.className = 'status-bar';
}
