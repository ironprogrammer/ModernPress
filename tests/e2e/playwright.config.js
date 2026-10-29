const { defineConfig, devices } = require( '@playwright/test' );

// Not 9400: browsing sites from test:e2e:server take that first.
const port = process.env.E2E_PORT || 9500;
const baseURL = process.env.WP_BASE_URL || `http://127.0.0.1:${ port }`;

module.exports = defineConfig( {
	testDir: './specs',
	outputDir: './.results',
	globalSetup: './global-setup.js',
	reporter: [
		[ 'list' ],
		[ 'html', { outputFolder: './.report', open: 'never' } ],
	],
	forbidOnly: !! process.env.CI,
	retries: process.env.CI ? 1 : 0,
	use: {
		baseURL,
		trace: 'retain-on-failure',
	},
	projects: [
		{
			name: 'desktop',
			use: {
				...devices[ 'Desktop Chrome' ],
				viewport: { width: 1440, height: 900 },
			},
		},
		{
			name: 'mobile',
			use: { ...devices[ 'iPhone 15' ] },
		},
	],
	// Boot Playground unless pointed at another site (Lando, review app, UAT).
	webServer: process.env.WP_BASE_URL
		? undefined
		: {
				command: 'node tests/e2e/playground/server.js',
				cwd: '../..',
				// No url or port check: HTTP requests before the blueprint finishes
				// leave Playground workers serving the default theme.
				wait: { stdout: /Ready!/ },
				timeout: 180_000,
				env: { E2E_PORT: String( port ) },
			},
} );
