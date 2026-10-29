const path = require( 'path' );

try {
	process.loadEnvFile( path.join( __dirname, '.env' ) );
} catch {
	// No .env file; rely on the shell environment (e.g. CI).
}

const targets = [ 'playground', 'dev', 'staging', 'production' ];
const testEnv = process.env.TEST_ENV || 'playground';

if ( ! targets.includes( testEnv ) ) {
	throw new Error(
		`TEST_ENV must be one of: ${ targets.join(
			', '
		) } (got "${ testEnv }").`
	);
}

const isProduction = testEnv === 'production';
// Dev, Staging, and Production are shared sites; tests treat them with more care than a throwaway one.
const isLive = testEnv !== 'playground';
const prefix = testEnv.toUpperCase();

// Not 9400: browsing sites from test:e2e:server take that first.
const port = process.env.E2E_PORT || 9500;
// WP_BASE_URL points the playground target at another throwaway site (Lando, a review app) instead.
const bootsPlayground = ! isLive && ! process.env.WP_BASE_URL;
const baseURL = isLive
	? process.env[ `${ prefix }_BASE_URL` ]
	: process.env.WP_BASE_URL || `http://127.0.0.1:${ port }`;

if ( ! baseURL ) {
	throw new Error(
		`No base URL for TEST_ENV="${ testEnv }". Set ${ prefix }_BASE_URL in tests/e2e/.env.`
	);
}

// Query string that unlocks the Glomar access gate, e.g. "secret=1". Empty when the site has no gate.
const glomarQuery = process.env[ `${ prefix }_GLOMAR_QUERY` ] ?? '';

const authDir = path.join( __dirname, 'playwright/.auth', testEnv );
const glomarStatePath = path.join( authDir, 'glomar.json' );

/**
 * Path of a role's saved login session.
 *
 * @param {string} role WordPress role slug.
 * @return {string} storageState file path.
 */
const roleStatePath = ( role ) => path.join( authDir, `${ role }.json` );

// Accounts playground/blueprint.json creates. Not secrets: the site is local and discarded after the run.
const playgroundAccounts = {
	administrator: { username: 'admin', password: 'password' },
	editor: { username: 'editor', password: 'password' },
	automation: { username: 'admin', password: 'e2eautomationpassword000' },
};

// Production never logs in: no accounts exist there for testing.
let roles = [];
if ( bootsPlayground ) {
	roles = [ 'administrator', 'editor' ];
} else if ( ! isProduction ) {
	roles = ( process.env.QA_ROLES ?? '' )
		.split( ',' )
		.map( ( role ) => role.trim().toLowerCase() )
		.filter( Boolean );
}

/**
 * Reads a username/password pair from the environment.
 *
 * @param {string} userVar     Username variable.
 * @param {string} passwordVar Password variable.
 * @return {{username?: string, password?: string, missing: string[]}} Credentials, or the variables that are unset.
 */
const fromEnv = ( userVar, passwordVar ) => {
	const username = process.env[ userVar ];
	const password = process.env[ passwordVar ];
	const missing = [ userVar, passwordVar ].filter(
		( name ) => ! process.env[ name ]
	);

	return username && password ? { username, password, missing } : { missing };
};

/**
 * Login credentials for a role, from QA_<ROLE>_USER and QA_<ROLE>_PASSWORD.
 *
 * @param {string} role WordPress role slug.
 * @return {{username?: string, password?: string, missing: string[]}} Credentials, or the variables that are unset.
 */
const credentials = ( role ) => {
	if ( bootsPlayground ) {
		return { ...playgroundAccounts[ role ], missing: [] };
	}

	const name = role.toUpperCase().replace( /-/g, '_' );
	return fromEnv( `QA_${ name }_USER`, `QA_${ name }_PASSWORD` );
};

/**
 * The automation account, which writes content through the REST API with an application password.
 *
 * @return {{username?: string, password?: string, missing: string[]}} Credentials, or the variables that are unset.
 */
const automationCredentials = () =>
	bootsPlayground
		? { ...playgroundAccounts.automation, missing: [] }
		: fromEnv( 'QA_AUTOMATION_USER', 'QA_AUTOMATION_APP_PASSWORD' );

// One ID per run, set in the main process and inherited by workers. It starts with a base-36 timestamp so the
// cleanup script can tell how old a leftover item is.
process.env.QA_RUN_ID ??= `${ Date.now().toString( 36 ) }-${ Math.random()
	.toString( 36 )
	.slice( 2, 6 ) }`;
const runId = process.env.QA_RUN_ID;

const ledgerPath = path.join(
	__dirname,
	'playwright/.ledger',
	testEnv,
	`${ runId }.jsonl`
);

const httpCredentials = process.env.HTTP_USERNAME
	? {
			username: process.env.HTTP_USERNAME,
			password: process.env.HTTP_PASSWORD ?? '',
		}
	: undefined;

module.exports = {
	testEnv,
	isProduction,
	isLive,
	port,
	bootsPlayground,
	baseURL,
	glomarQuery,
	glomarStatePath,
	roleStatePath,
	roles,
	credentials,
	automationCredentials,
	runId,
	ledgerPath,
	httpCredentials,
};
