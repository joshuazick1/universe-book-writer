export default {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: { node: 'current' },
        modules: false, // Keep ESM modules as-is
        bugfixes: true,
        useBuiltIns: 'usage',
        corejs: 3,
      },
    ],
    [
      '@babel/preset-typescript',
      {
        allowDeclareFields: true,
        optimizeConstEnums: true,
      },
    ],
  ],
  env: {
    test: {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: { node: 'current' },
            modules: 'auto', // Use CommonJS for Jest
          },
        ],
      ],
    },
  },
};
