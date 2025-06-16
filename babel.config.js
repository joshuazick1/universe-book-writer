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
      '@babel/preset-react',
      {
        runtime: 'automatic',
      },
    ],
    [
      '@babel/preset-typescript',
      {
        allowDeclareFields: true,
        optimizeConstEnums: true,
        isTSX: true,
        allExtensions: true,
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
        [
          '@babel/preset-react',
          {
            runtime: 'automatic',
          },
        ],
        [
          '@babel/preset-typescript',
          {
            allowDeclareFields: true,
            optimizeConstEnums: true,
            isTSX: true,
            allExtensions: true,
          },
        ],
      ],
    },
  },
};
