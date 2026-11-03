const { defineConfig, devices } = require( '@playwright/test' );
const {
	baseURL,
	glomarQuery,
	glomarStatePath,
	httpCredentials,
	ignoreHTTPSErrors,
	isPlayground,
	isProduction,
	port,
} = require( './env' );

const storageState = glomarQuery ? glomarStatePath : undefined;
const glomar = glomarQuery ? [ 'glomar-setup' ] : [];
// Production only gets read-only tests that need no account.
const grep = isProduction ? /@readonly/ : undefined;
// @mobile tests also run on an emulated iPhone; on production they must be @readonly as well.
const mobileGrep = isProduction ? /^(?=.*@mobile)(?=.*@readonly)/ : /@mobile/;
const chromium = {
	...devices[ 'Desktop Chrome' ],
	viewport: { width: 1440, height: 900 },
	storageState,
};

const projects = [
	{
		name: 'chromium',
		grep,
		grepInvert: /@requires-account/,
		use: chromium,
		dependencies: glomar,
	},
	{
		name: 'webkit-mobile',
		grep: mobileGrep,
		use: { ...devices[ 'iPhone 15' ], storageState },
		dependencies: glomar,
	},
];

if ( glomarQuery ) {
	projects.unshift( {
		name: 'glomar-setup',
		testDir: './setup',
		testMatch: /glomar\.setup\.js/,
	} );
}

// Logged-in tests wait for the logins in their own project, so a failed login can't block the rest.
if ( ! isProduction ) {
	projects.push(
		{
			name: 'auth-setup',
			testDir: './setup',
			testMatch: /auth\.setup\.js/,
			use: { storageState },
			dependencies: glomar,
		},
		{
			name: 'chromium-account',
			grep: /@requires-account/,
			use: chromium,
			dependencies: [ 'auth-setup' ],
		}
	);
}

module.exports = defineConfig( {
	testDir: './specs',
	outputDir: './.results',
	globalSetup: './global-setup.js',
	globalTeardown: './global-teardown.js',
	reporter: [
		[ 'list' ],
		[ 'html', { outputFolder: './.report', open: 'never' } ],
	],
	forbidOnly: !! process.env.CI,
	// Only Playground retries: on other sites a retried login can trip security lockouts, and a retried test creates
	// content again.
	retries: process.env.CI && isPlayground ? 1 : 0,
	use: {
		baseURL,
		httpCredentials,
		ignoreHTTPSErrors,
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
	},
	projects,
	// Boot Playground unless pointed at an existing site.
	webServer: isPlayground
		? {
				command: 'node tests/e2e/playground/server.js',
				cwd: '../..',
				// No url or port check: HTTP requests before the blueprint finishes
				// leave Playground workers serving the default theme.
				wait: { stdout: /Ready!/ },
				timeout: 180_000,
				env: { E2E_PORT: String( port ) },
			}
		: undefined,
} );
