export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // New feature
        'fix', // Bug fix
        'docs', // Documentation only changes
        'style', // Changes that do not affect the meaning of the code
        'refactor', // Code change that neither fixes a bug nor adds a feature
        'perf', // Code change that improves performance
        'test', // Adding missing tests or correcting existing tests
        'chore', // Changes to the build process or auxiliary tools
        'ci', // Changes to CI configuration files and scripts
        'revert', // Reverts a previous commit
        'update', // General updates
        'wip', // Work in progress
      ],
    ],
    'type-case': [1, 'always', 'lower-case'], // Warning instead of error
    'subject-case': [0], // Disable case checking entirely
    'subject-empty': [2, 'never'],
    'subject-full-stop': [0], // Allow periods
    'body-leading-blank': [0], // Don't require blank line
    'header-max-length': [0], // No length limit
    'body-max-line-length': [0], // No body line length limit
  },
};
