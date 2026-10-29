/**
 * Boots a fresh WordPress Playground site with ModernPress mounted, then lists the pages the tests cover.
 *
 * Runs Playground in-process, so its own colored output and progress reach the terminal untouched.
 * WP_VERSION accepts a version (7.1.3), "latest", "beta", "nightly", or a zip URL,
 * and defaults to the version pinned in composer.json.
 */
const fs = require( 'fs' );
const net = require( 'net' );
const os = require( 'os' );
const path = require( 'path' );
const { styleText } = require( 'util' );
const { parseOptionsAndRunCLI } = require( '@wp-playground/cli' );
const pages = require( '../specs/pages' );

const ROOT = path.resolve( __dirname, '../../..' );

/**
 * Resolves the WordPress version to boot.
 *
 * @return {Promise<string>} Version, keyword, or zip URL.
 */
const resolveVersion = async () => {
	const version =
		process.env.WP_VERSION ||
		require( path.join( ROOT, 'composer.json' ) ).extra[
			'wordpress-version'
		];

	// Playground's own "latest" can lag a new release, so ask wordpress.org for the exact version.
	if ( version !== 'latest' ) {
		return version;
	}
	const response = await fetch(
		'https://api.wordpress.org/core/version-check/1.7/'
	);
	return ( await response.json() ).offers[ 0 ].current;
};

/**
 * Checks whether a port is free to listen on.
 *
 * @param {number} port Port to try.
 * @return {Promise<number>} The port, or one the OS picks if it's taken.
 */
const freePort = ( port ) =>
	new Promise( ( resolve ) => {
		const server = net.createServer();
		server.once( 'error', () => resolve( freePort( 0 ) ) );
		server.listen( port, () => {
			const { port: open } = server.address();
			server.close( () => resolve( open ) );
		} );
	} );

( async () => {
	const port = Number( process.env.E2E_PORT ) || ( await freePort( 9400 ) );
	const blueprint = path.join(
		os.tmpdir(),
		`mp-e2e-blueprint-${ process.pid }.json`
	);
	const preferredVersions = { wp: await resolveVersion(), php: '8.4' };

	// The CLI ignores --wp and --php when a blueprint is passed, so versions go in the blueprint.
	fs.writeFileSync(
		blueprint,
		JSON.stringify( {
			...require( './blueprint.json' ),
			preferredVersions,
		} )
	);

	const result = await parseOptionsAndRunCLI( [
		'server',
		`--port=${ port }`,
		`--blueprint=${ blueprint }`,
		`--mount=${ ROOT }/vendor:/wordpress/vendor`,
		`--mount=${ ROOT }/wp-content/plugins:/wordpress/wp-content/plugins`,
		`--mount=${ ROOT }/wp-content/mu-plugins:/wordpress/wp-content/mu-plugins`,
		`--mount=${ ROOT }/wp-content/themes/core:/wordpress/wp-content/themes/core`,
		`--mount=${ ROOT }/tests/e2e/fixtures:/e2e/fixtures`,
	] );

	if ( 'exitCode' in result ) {
		fs.rmSync( blueprint, { force: true } );
		process.exit( result.exitCode );
	}

	console.log( styleText( 'bold', 'Pages the tests cover:' ) );
	for ( const { name, path: pagePath } of pages ) {
		console.log(
			`  ${ styleText( 'dim', name.padEnd( 18 ) ) } http://127.0.0.1:${ port }${ pagePath }`
		);
	}

	const stop = async () => {
		await result[ Symbol.asyncDispose ]();
		fs.rmSync( blueprint, { force: true } );
		process.exit( 0 );
	};
	process.on( 'SIGINT', stop );
	process.on( 'SIGTERM', stop );
} )();
