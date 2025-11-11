// Global chalk mock for Jest
const mockChalk: any = (text: any) => text;

// Add all the methods chalk supports
Object.assign(mockChalk, {
  green: jest.fn((text) => `green(${text})`),
  red: jest.fn((text) => `red(${text})`),
  blue: jest.fn((text) => `blue(${text})`),
  yellow: jest.fn((text) => `yellow(${text})`),
  bold: jest.fn((text) => `bold(${text})`),
  gray: jest.fn((text) => `gray(${text})`),
  cyan: jest.fn((text) => `cyan(${text})`),
  magenta: jest.fn((text) => `magenta(${text})`),
  white: jest.fn((text) => `white(${text})`),
  black: jest.fn((text) => `black(${text})`),
  dim: jest.fn((text) => `dim(${text})`),
  underline: jest.fn((text) => `underline(${text})`),
  inverse: jest.fn((text) => `inverse(${text})`),
  strikethrough: jest.fn((text) => `strikethrough(${text})`),
  bgBlack: jest.fn((text) => `bgBlack(${text})`),
  bgRed: jest.fn((text) => `bgRed(${text})`),
  bgGreen: jest.fn((text) => `bgGreen(${text})`),
  bgYellow: jest.fn((text) => `bgYellow(${text})`),
  bgBlue: jest.fn((text) => `bgBlue(${text})`),
  bgMagenta: jest.fn((text) => `bgMagenta(${text})`),
  bgCyan: jest.fn((text) => `bgCyan(${text})`),
  bgWhite: jest.fn((text) => `bgWhite(${text})`),
  supportsColor: { level: 1 },
});

// Export as default
export default mockChalk;