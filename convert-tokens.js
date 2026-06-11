const fs = require('fs');
const path = require('path');

// Target paths
const colorTokenPath = path.join(__dirname, 'color-token.json');
const designTokensPath = path.join(__dirname, 'design-tokens.json');
const outputPath = path.join(__dirname, 'tokens.css');

// Helper to convert strings to kebab-case
function toKebabCase(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([0-9])([a-zA-Z])/g, '$1-$2')
    .replace(/([a-zA-Z])([0-9])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

// Convert aliases like "{color.brand.primary}" to "var(--color-brand-primary)"
function checkAndConvertAlias(value) {
  if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
    const aliasPath = value.slice(1, -1).split('.');
    const kebabPath = aliasPath.map(toKebabCase).join('-');
    return `var(--${kebabPath})`;
  }
  return null;
}

// Helper to format values with appropriate units
function formatValue(key, value, type) {
  const alias = checkAndConvertAlias(value);
  if (alias) return alias;

  if (typeof value === 'number') {
    if (value === 0) return '0';
    const keyLower = key.toLowerCase();
    // Do not append px to fontWeight, opacity, or numbers explicitly declared as simple numbers
    if (keyLower.includes('weight') || keyLower.includes('opacity') || type === 'number') {
      return String(value);
    }
    return `${value}px`;
  }
  if (typeof value === 'string') {
    const keyLower = key.toLowerCase();
    // Wrap font-family names in quotes if not already wrapped
    if (keyLower.includes('family') && !value.includes('"') && !value.includes("'")) {
      return `'${value}'`;
    }
    return value;
  }
  return String(value);
}

const colorVariables = [];
const designVariables = {}; // key -> array of variables
const fontClasses = [];

function addVariable(source, topLevelKey, varName, formattedVal) {
  const line = `  ${varName}: ${formattedVal};`;
  if (source === 'color') {
    colorVariables.push(line);
  } else {
    if (!designVariables[topLevelKey]) {
      designVariables[topLevelKey] = [];
    }
    designVariables[topLevelKey].push(line);
  }
}

// Recursively traverse token trees
function walk(node, pathSegments = [], source = 'design') {
  if (node === null || typeof node === 'undefined') {
    return;
  }

  const topLevelKey = pathSegments[0] || '';

  // If node is a primitive value (direct leaf token, not wrapped in value key)
  if (typeof node !== 'object') {
    const varName = '--' + pathSegments.map(toKebabCase).join('-');
    const formattedVal = formatValue(pathSegments[pathSegments.length - 1], node, '');
    addVariable(source, topLevelKey, varName, formattedVal);
    return;
  }

  // If this object is a standard token with a 'value' property
  if ('value' in node) {
    const tokenValue = node.value;
    const tokenType = node.type || '';
    const varName = '--' + pathSegments.map(toKebabCase).join('-');

    if (tokenType === 'custom-fontStyle' && typeof tokenValue === 'object' && tokenValue !== null) {
      const classProperties = [];
      const FONT_STYLE_MAP = {
        fontFamily: 'font-family',
        fontSize: 'font-size',
        fontWeight: 'font-weight',
        fontStyle: 'font-style',
        fontStretch: 'font-stretch',
        lineHeight: 'line-height',
        letterSpacing: 'letter-spacing',
        textDecoration: 'text-decoration',
        textCase: 'text-transform',
        paragraphIndent: 'text-indent'
      };

      for (const [subKey, subVal] of Object.entries(tokenValue)) {
        const subVarName = `${varName}-${toKebabCase(subKey)}`;
        const formattedVal = formatValue(subKey, subVal, '');
        addVariable(source, topLevelKey, subVarName, formattedVal);

        if (FONT_STYLE_MAP[subKey]) {
          classProperties.push(`  ${FONT_STYLE_MAP[subKey]}: var(${subVarName});`);
        }
      }

      // Generate deduplicated utility class name (e.g. font-display-large)
      let className = pathSegments.map(toKebabCase).join('-');
      const parts = className.split('-');
      const uniqueParts = [];
      for (const part of parts) {
        if (uniqueParts.length === 0 || uniqueParts[uniqueParts.length - 1] !== part) {
          uniqueParts.push(part);
        }
      }
      className = uniqueParts.join('-');

      if (classProperties.length > 0) {
        fontClasses.push(`.${className} {\n${classProperties.join('\n')}\n}`);
      }
    } else {
      const formattedVal = formatValue(pathSegments[pathSegments.length - 1], tokenValue, tokenType);
      addVariable(source, topLevelKey, varName, formattedVal);
    }
    return;
  }

  // Otherwise, traverse all children keys
  for (const [key, value] of Object.entries(node)) {
    if (key === 'extensions' || key === '$metadata') {
      continue;
    }
    walk(value, [...pathSegments, key], source);
  }
}

// 1. Read color-token.json
let colorTokens = {};
try {
  if (fs.existsSync(colorTokenPath)) {
    const colorContent = fs.readFileSync(colorTokenPath, 'utf8').trim();
    if (colorContent) {
      colorTokens = JSON.parse(colorContent);
      console.log('Successfully read color-token.json');
    } else {
      console.log('color-token.json is empty, skipping color parsing');
    }
  } else {
    console.log('color-token.json not found, skipping color parsing');
  }
} catch (err) {
  console.error('Error reading color-token.json:', err.message);
}

// 2. Read design-tokens.json
let designTokens = {};
try {
  if (fs.existsSync(designTokensPath)) {
    const designContent = fs.readFileSync(designTokensPath, 'utf8').trim();
    if (designContent) {
      designTokens = JSON.parse(designContent);
      console.log('Successfully read design-tokens.json');
    } else {
      console.log('design-tokens.json is empty, skipping design tokens parsing');
    }
  } else {
    console.log('design-tokens.json not found, skipping design tokens parsing');
  }
} catch (err) {
  console.error('Error reading design-tokens.json:', err.message);
}

// 3. Process tokens
walk(colorTokens, [], 'color');
walk(designTokens, [], 'design');

// 4. Generate CSS output
let cssContent = `/* ========================================================================= */
/* THIS FILE IS AUTOMATICALLY GENERATED. DO NOT EDIT DIRECTLY.               */
/* ========================================================================= */

:root {
`;

if (colorVariables.length > 0) {
  cssContent += `  /* ------------------------------------------------------------- */
  /* Color Tokens                                                  */
  /* ------------------------------------------------------------- */
${colorVariables.join('\n')}

`;
}

const designKeys = Object.keys(designVariables);
if (designKeys.length > 0) {
  for (const key of designKeys) {
    cssContent += `  /* ------------------------------------------------------------- */
  /* Design Tokens - ${key}                                         */
  /* ------------------------------------------------------------- */
${designVariables[key].join('\n')}

`;
  }
}

// Close :root block
cssContent = cssContent.trimEnd() + '\n}\n\n';

if (fontClasses.length > 0) {
  cssContent += `/* ========================================================================= */
/* Typography Utility Classes                                                */
/* ========================================================================= */

${fontClasses.join('\n\n')}
`;
}

// Write output
try {
  fs.writeFileSync(outputPath, cssContent, 'utf8');
  console.log(`Successfully generated tokens.css at: ${outputPath}`);
} catch (err) {
  console.error('Failed to write tokens.css:', err.message);
  process.exit(1);
}
