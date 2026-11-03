// Root config plus WordPress's Playwright rules. Used by npm run test:e2e:lint, so the root config stays untouched.
const root = require( '../../eslint.config' );
const wordpress = require( '@wordpress/eslint-plugin' );

module.exports = [
	...root,
	...wordpress.configs[ 'test-playwright' ],
	{
		settings: { playwright: { globalAliases: { test: [ 'setup' ] } } },
		rules: {
			// Helpers named expect* hold a test's assertions.
			'playwright/expect-expect': [
				'warn',
				{ assertFunctionPatterns: [ '^expect' ] },
			],
			'playwright/no-skipped-test': [
				'warn',
				{ allowConditional: true },
			],
			// Playwright fixtures call use(), which this rule mistakes for React's use().
			'react-hooks/rules-of-hooks': 'off',
		},
	},
	{
		ignores: [ '**/.results/', '**/.report/', '**/playwright/' ],
	},
];
