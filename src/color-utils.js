/**
 * CSS color string to Figma RGBA { r, g, b, a } converter.
 * All values are 0-1 floats.
 */

const NAMED_COLORS = {
  black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000',
  blue: '#0000ff', yellow: '#ffff00', orange: '#ffa500', purple: '#800080',
  pink: '#ffc0cb', gray: '#808080', grey: '#808080', silver: '#c0c0c0',
  maroon: '#800000', navy: '#000080', teal: '#008080', olive: '#808000',
  aqua: '#00ffff', cyan: '#00ffff', magenta: '#ff00ff', lime: '#00ff00',
  coral: '#ff7f50', tomato: '#ff6347', gold: '#ffd700', wheat: '#f5deb3',
  salmon: '#fa8072', khaki: '#f0e68c', plum: '#dda0dd', orchid: '#da70d6',
  tan: '#d2b48c', crimson: '#dc143c', turquoise: '#40e0d0', indigo: '#4b0082',
  violet: '#ee82ee', beige: '#f5f5dc', ivory: '#fffff0', linen: '#faf0e6',
  chocolate: '#d2691e', firebrick: '#b22222', darkblue: '#00008b',
  darkgreen: '#006400', darkred: '#8b0000', darkgray: '#a9a9a9',
  darkgrey: '#a9a9a9', lightgray: '#d3d3d3', lightgrey: '#d3d3d3',
  lightblue: '#add8e6', lightgreen: '#90ee90', lightyellow: '#ffffe0',
  darkslategray: '#2f4f4f', slategray: '#708090', steelblue: '#4682b4',
  royalblue: '#4169e1', dodgerblue: '#1e90ff', cornflowerblue: '#6495ed',
  deepskyblue: '#00bfff', skyblue: '#87ceeb', midnightblue: '#191970',
  darkslateblue: '#483d8b', mediumblue: '#0000cd', slateblue: '#6a5acd',
  transparent: 'rgba(0,0,0,0)',
  aliceblue: '#f0f8ff', antiquewhite: '#faebd7', aquamarine: '#7fffd4',
  azure: '#f0ffff', bisque: '#ffe4c4', blanchedalmond: '#ffebcd',
  blueviolet: '#8a2be2', burlywood: '#deb887', cadetblue: '#5f9ea0',
  chartreuse: '#7fff00', darkcyan: '#008b8b', darkgoldenrod: '#b8860b',
  darkkhaki: '#bdb76b', darkmagenta: '#8b008b', darkolivegreen: '#556b2f',
  darkorange: '#ff8c00', darkorchid: '#9932cc', darksalmon: '#e9967a',
  darkseagreen: '#8fbc8f', darkturquoise: '#00ced1', darkviolet: '#9400d3',
  deeppink: '#ff1493', dimgray: '#696969', dimgrey: '#696969',
  floralwhite: '#fffaf0', forestgreen: '#228b22', gainsboro: '#dcdcdc',
  ghostwhite: '#f8f8ff', goldenrod: '#daa520', greenyellow: '#adff2f',
  honeydew: '#f0fff0', hotpink: '#ff69b4', indianred: '#cd5c5c',
  lavender: '#e6e6fa', lavenderblush: '#fff0f5', lawngreen: '#7cfc00',
  lemonchiffon: '#fffacd', lightcoral: '#f08080', lightcyan: '#e0ffff',
  lightpink: '#ffb6c1', lightsalmon: '#ffa07a', lightseagreen: '#20b2aa',
  lightskyblue: '#87cefa', lightslategray: '#778899', lightsteelblue: '#b0c4de',
  limegreen: '#32cd32', mediumaquamarine: '#66cdaa', mediumorchid: '#ba55d3',
  mediumpurple: '#9370db', mediumseagreen: '#3cb371', mediumslateblue: '#7b68ee',
  mediumspringgreen: '#00fa9a', mediumturquoise: '#48d1cc',
  mediumvioletred: '#c71585', mintcream: '#f5fffa', mistyrose: '#ffe4e1',
  moccasin: '#ffe4b5', navajowhite: '#ffdead', oldlace: '#fdf5e6',
  olivedrab: '#6b8e23', orangered: '#ff4500', palegoldenrod: '#eee8aa',
  palegreen: '#98fb98', paleturquoise: '#afeeee', palevioletred: '#db7093',
  papayawhip: '#ffefd5', peachpuff: '#ffdab9', peru: '#cd853f',
  powderblue: '#b0e0e6', rosybrown: '#bc8f8f', saddlebrown: '#8b4513',
  sandybrown: '#f4a460', seagreen: '#2e8b57', seashell: '#fff5ee',
  sienna: '#a0522d', snow: '#fffafa', springgreen: '#00ff7f',
  thistle: '#d8bfd8', whitesmoke: '#f5f5f5', yellowgreen: '#9acd32',
};

export function parseColor(colorStr) {
  if (!colorStr || colorStr === 'transparent') {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  const trimmed = colorStr.trim().toLowerCase();

  if (NAMED_COLORS[trimmed]) {
    return parseColor(NAMED_COLORS[trimmed]);
  }

  if (trimmed.startsWith('#')) {
    return parseHex(trimmed);
  }

  if (trimmed.startsWith('rgb')) {
    return parseRgb(trimmed);
  }

  if (trimmed.startsWith('hsl')) {
    return parseHsl(trimmed);
  }

  return { r: 0, g: 0, b: 0, a: 1 };
}

function parseHex(hex) {
  hex = hex.replace('#', '');
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
  if (!nums || nums.length < 3) return { r: 0, g: 0, b: 0, a: 1 };

  return {
    r: parseFloat(nums[0]) / 255,
    g: parseFloat(nums[1]) / 255,
    b: parseFloat(nums[2]) / 255,
    a: nums.length >= 4 ? parseFloat(nums[3]) : 1
  };
}

function parseHsl(str) {
  const nums = str.match(/[\d.]+/g);
  if (!nums || nums.length < 3) return { r: 0, g: 0, b: 0, a: 1 };

  const h = parseFloat(nums[0]) / 360;
  const s = parseFloat(nums[1]) / 100;
  const l = parseFloat(nums[2]) / 100;
  const a = nums.length >= 4 ? parseFloat(nums[3]) : 1;

  const { r, g, b } = hslToRgb(h, s, l);
  return { r, g, b, a };
}

function hslToRgb(h, s, l) {
  if (s === 0) return { r: l, g: l, b: l };

  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: hue2rgb(p, q, h + 1/3),
    g: hue2rgb(p, q, h),
    b: hue2rgb(p, q, h - 1/3)
  };
}

export function parseBoxShadow(shadowStr) {
  if (!shadowStr || shadowStr === 'none') return [];

  const shadows = [];
  const parts = splitShadows(shadowStr);

  for (const part of parts) {
    const isInset = part.includes('inset');
    const cleaned = part.replace('inset', '').trim();

    const colorMatch = cleaned.match(/(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|\b[a-z]+\b(?!\s*\d))/i);
    let color = { r: 0, g: 0, b: 0, a: 0.25 };
    let numericPart = cleaned;

    if (colorMatch) {
      color = parseColor(colorMatch[0]);
      numericPart = cleaned.replace(colorMatch[0], '').trim();
    }

    const nums = numericPart.match(/-?[\d.]+/g);
    if (nums && nums.length >= 2) {
      shadows.push({
        type: isInset ? 'INNER_SHADOW' : 'DROP_SHADOW',
        color: { r: color.r, g: color.g, b: color.b, a: color.a },
        offset: { x: parseFloat(nums[0]), y: parseFloat(nums[1]) },
        radius: nums.length >= 3 ? parseFloat(nums[2]) : 0,
        spread: nums.length >= 4 ? parseFloat(nums[3]) : 0,
        visible: true,
        blendMode: 'NORMAL'
      });
    }
  }

  return shadows;
}

function splitShadows(str) {
  const results = [];
  let depth = 0;
  let current = '';

  for (const char of str) {
    if (char === '(') depth++;
    else if (char === ')') depth--;
    else if (char === ',' && depth === 0) {
      results.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) results.push(current.trim());
  return results;
}

export function parseGradient(gradientStr) {
  if (!gradientStr) return null;

  const linearMatch = gradientStr.match(/linear-gradient\(([^)]+(?:\([^)]*\))*[^)]*)\)/i);
  if (!linearMatch) return null;

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
    } else if (firstPart.startsWith('to ')) {
      angle = directionToAngle(firstPart);
      stopStartIdx = 1;
    }
  }

  const stops = [];
  for (let i = stopStartIdx; i < parts.length; i++) {
    const stopPart = parts[i].trim();
    const percentMatch = stopPart.match(/([\d.]+)%/);
    const colorPart = stopPart.replace(/([\d.]+)%/, '').trim();
    const color = parseColor(colorPart || stopPart);
    const position = percentMatch ? parseFloat(percentMatch[1]) / 100 : i / (parts.length - 1);
    stops.push({ position, color });
  }

  if (stops.length < 2) return null;

  const radians = (angle - 90) * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    type: 'GRADIENT_LINEAR',
    gradientTransform: [
      [cos / 2, sin / 2, 0.5 - cos / 4 - sin / 4],
      [-sin / 2, cos / 2, 0.5 + sin / 4 - cos / 4]
    ],
    gradientStops: stops.map(s => ({
      position: s.position,
      color: s.color
    }))
  };
}

function splitGradientParts(str) {
  const results = [];
  let depth = 0;
  let current = '';
  for (const char of str) {
    if (char === '(') depth++;
    else if (char === ')') depth--;
    else if (char === ',' && depth === 0) {
      results.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) results.push(current.trim());
  return results;
}

function directionToAngle(dir) {
  const map = {
    'to top': 0, 'to right': 90, 'to bottom': 180, 'to left': 270,
    'to top right': 45, 'to top left': 315,
    'to bottom right': 135, 'to bottom left': 225,
  };
  return map[dir] !== undefined ? map[dir] : 180;
}
