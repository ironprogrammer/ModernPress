const { defineConfig, devices } = require( '@playwright/test' );
const {
	baseURL,
	bootsPlayground,
	glomarQuery,
	glomarStatePath,
	httpCredentials,
	isLive,
	isProduction,
	port,
} = require( './env' );

const storageState = glomarQuery ? glomarStatePath : undefined;
const glomar = glomarQuery ? [ 'glomar-setup' ] : [];
const desktop = {
	...devices[ 'Desktop Chrome' ],
	viewport: { width: 1440, height: 900 },
	storageState,
};

// Tests without @requires-account don't wait on logins, so a failed login can't block them.
const withAccount = ( safety ) =>
	new RegExp( `^(?=.*@${ safety })(?=.*@requires-account)` );
// @fixtures tests load pages from fixtures/, which only Playground has.
const readonlyInvert = isLive
	? /@requires-account|@fixtures/
	: /@requires-account/;

let projects = [
	{
		name: 'readonly',
		grep: /@readonly/,
		grepInvert: readonlyInvert,
		use: desktop,
		dependencies: glomar,
	},
	// Page-level smoke and a11y specs also run on a phone, in WebKit.
	{
		name: 'readonly-mobile',
		testMatch: /(smoke|a11y)\.spec\.js/,
		grep: /@readonly/,
		grepInvert: readonlyInvert,
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

// Production only gets read-only tests that need no account: no logins, no mutating tests.
if ( ! isProduction ) {
	projects.push(
		{
			name: 'auth-setup',
			testDir: './setup',
			testMatch: /auth\.setup\.js/,
			use: { storageState },
			dependencies: glomar,
		},
		// REST preflight for tests that create content; its teardown deletes everything the run created.
		{
			name: 'content-setup',
			testDir: './setup',
			testMatch: /content\.setup\.js/,
			teardown: 'content-teardown',
		},
		{
			name: 'content-teardown',
			testDir: './setup',
			testMatch: /content\.teardown\.js/,
		},
		{
			name: 'readonly-account',
			grep: withAccount( 'readonly' ),
			use: desktop,
			dependencies: [ 'auth-setup' ],
		},
		{
			name: 'mutating',
			grep: /@mutating/,
			grepInvert: /@requires-account/,
			use: desktop,
			dependencies: [ ...glomar, 'content-setup' ],
		},
		{
			name: 'mutating-account',
			grep: withAccount( 'mutating' ),
			use: desktop,
			dependencies: [ 'auth-setup', 'content-setup' ],
		}
	);
}

// scripts/lint-tests.js lists every spec, including untagged ones the projects above would filter out.
// test:e2e:cleanup runs only scripts/cleanup.task.js.
if ( process.env.QA_LINT ) {
	projects = [ { name: 'lint' } ];
} else if ( process.env.QA_CLEANUP ) {
	projects = [
		{
			name: 'cleanup',
			testDir: './scripts',
			testMatch: /cleanup\.task\.js/,
		},
	];
}

module.exports = defineConfig( {
	testDir: './specs',
	outputDir: './.results',
	globalSetup: './global-setup.js',
	reporter: [
		[ 'list' ],
		[ 'html', { outputFolder: './.report', open: 'never' } ],
	],
	forbidOnly: !! process.env.CI || isLive,
	// Never retry: a retried failed login can trip security lockouts, and retries hide flaky tests.
	retries: 0,
	use: {
		baseURL,
		httpCredentials,
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
	},
	projects,
	// Boot Playground unless pointed at another site.
	webServer:
		bootsPlayground && ! process.env.QA_CLEANUP
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
