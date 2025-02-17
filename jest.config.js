/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: 'tsconfig.json'
    }],
    '^.+\\.m?js$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }]
      ],
      plugins: ['@babel/plugin-transform-modules-commonjs']
    }]
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node', 'mjs'],
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  transformIgnorePatterns: [
    'node_modules/(?!(unified|remark-parse|remark-frontmatter|mdast-util-from-markdown|micromark|micromark-util.*|mdast-util.*|unist-util.*|bail|is-plain-obj|trough|vfile.*|unified-engine-text-to-text|unified-engine|unified-args|unified-engine-util|unified-diff|unified-message-control|unified-lint-rule|devlop|decode-named-character-reference|character-entities|micromark-factory-space|micromark-util-character|micromark-core-commonmark|micromark-factory-destination|micromark-factory-label|micromark-factory-title|micromark-factory-whitespace|@xmldom|xpath|micromark-extension-frontmatter|mdast-util-frontmatter|fault|format|escape-string-regexp)/.*)'
  ]
}

module.exports = config 