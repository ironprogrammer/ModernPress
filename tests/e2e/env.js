const path = require( 'path' );
const { accounts: playgroundAccounts } = require( './playground/accounts' );

// playground boots a fresh local site. Every other target is an existing site configured in its own .env.<target>:
// local for a throwaway site you run (Lando, a review app), dev/staging/production for the shared ones.
const targets = [ 'playground', 'local', 'dev', 'staging', 'production' ];
const testEnv = process.env.TEST_ENV || 'playground';

if ( ! targets.includes( testEnv ) ) {
	throw new Error(
		`TEST_ENV must be one of: ${ targets.join(
			', '
		) } (got "${ testEnv }").`
	);
}

const isPlayground = testEnv === 'playground';
const isProduction = testEnv === 'production';

if ( ! isPlayground ) {
	try {
		process.loadEnvFile( path.join( __dirname, `.env.${ testEnv }` ) );
	} catch {
		// No file; rely on the shell environment (e.g. CI).
	}
}

// Not 9400: browsing sites from test:e2e:server take that first.
const port = process.env.E2E_PORT || 9500;
const baseURL = isPlayground
	? `http://127.0.0.1:${ port }`
	: process.env.BASE_URL;

if ( ! baseURL ) {
	throw new Error(
		`No BASE_URL for TEST_ENV="${ testEnv }". Copy tests/e2e/.env.example to tests/e2e/.env.${ testEnv } and fill it in.`
	);
}

// Local sites often serve self-signed certificates (Lando, Local). Never allowed for shared sites.
const ignoreHTTPSErrors = process.env.IGNORE_HTTPS_ERRORS === '1';

if ( ignoreHTTPSErrors && testEnv !== 'local' ) {
	throw new Error(
		'IGNORE_HTTPS_ERRORS=1 is only allowed with TEST_ENV=local.'
	);
}

// Query string that unlocks the Glomar access gate, e.g. "secret=1". Empty when the site has no gate.
const glomarQuery = ( ! isPlayground && process.env.GLOMAR_QUERY ) || '';

const authDir = path.join( __dirname, 'playwright/.auth', testEnv );
const glomarStatePath = path.join( authDir, 'glomar.json' );

/**
 * Path of a role's saved login session.
 *
 * @param {string} role WordPress role slug.
 * @return {string} storageState file path.
 */
const roleStatePath = ( role ) => path.join( authDir, `${ role }.json` );

// Production never logs in: no accounts exist there for testing.
let roles = [];
if ( isPlayground ) {
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
	if ( isPlayground ) {
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
	isPlayground
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
	isPlayground,
	port,
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
	ignoreHTTPSErrors,
};
