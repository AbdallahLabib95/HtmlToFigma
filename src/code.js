/**
 * Figma Plugin Controller - runs in Figma's sandbox.
 * Receives HTML from the UI, parses it, and creates Figma layers.
 */

import { parseHTML } from './parser.js';
import { convertToFigma } from './figma-mapper.js';

figma.showUI(__html__, { width: 480, height: 600 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'convert-html') {
    try {
      figma.ui.postMessage({ type: 'conversion-progress', message: 'Parsing HTML...' });

      const tree = parseHTML(msg.html);

      if (!tree.children || tree.children.length === 0) {
        figma.ui.postMessage({
          type: 'conversion-error',
          message: 'No valid HTML elements found. Check your input.'
        });
        return;
      }

      figma.ui.postMessage({ type: 'conversion-progress', message: 'Creating Figma layers...' });

      const result = await convertToFigma(tree, msg.options);

      figma.ui.postMessage({
        type: 'conversion-complete',
        nodeCount: result.nodeCount
      });

    } catch (err) {
      figma.ui.postMessage({
        type: 'conversion-error',
        message: `Error: ${err.message || 'Unknown error occurred'}`
      });
    }
  }
};
