const { test, expect } = require( '@playwright/test' );
const fs = require( 'fs' );
const path = require( 'path' );
const { bootsPlayground, ledgerPath } = require( '../env' );
const { ApiClient, contentPrefix } = require( '../support/api' );

// Run with `npm run test:e2e:cleanup` (dry run) or `npm run test:e2e:cleanup:apply`. Finds content left by crashed
// runs: anything whose slug starts with "qa-auto-<runId>-" where the run is older than QA_CLEANUP_HOURS (default 2).
// Never on production.
const apply = process.env.QA_CLEANUP_APPLY === '1';
const maxAgeMs = Number( process.env.QA_CLEANUP_HOURS ?? 2 ) * 60 * 60 * 1000;

const runStartedAt = ( slug ) =>
	parseInt( slug.slice( contentPrefix.length + 1 ).split( '-' )[ 0 ], 36 );

test( 'remove leftover test content', async () => {
	test.skip(
		bootsPlayground,
		'Playground sites are discarded after each run'
	);

	const api = await ApiClient.create();
	try {
		const stale = (
			await api.findPrefixed( `${ contentPrefix }-` )
		).filter(
			( item ) => Date.now() - runStartedAt( item.slug ) > maxAgeMs
		);

		console.log(
			stale.length
				? stale
						.map(
							( i ) => `${ i.endpoint }/${ i.id }  ${ i.slug }`
						)
						.join( '\n' )
				: 'Nothing to clean up.'
		);

		if ( ! apply ) {
			if ( stale.length ) {
				console.log(
					`Dry run: ${ stale.length } item(s) found. Run npm run test:e2e:cleanup:apply to delete them.`
				);
			}
			return;
		}

		for ( const item of stale ) {
			await api.deleteForever( item );
		}
		const remaining = await api.findPrefixed( `${ contentPrefix }-` );
		expect(
			remaining.filter( ( i ) =>
				stale.some(
					( s ) => s.id === i.id && s.endpoint === i.endpoint
				)
			)
		).toEqual( [] );
		console.log( `Deleted ${ stale.length } item(s).` );

		// Ledgers from runs whose teardown never ran.
		const ledgerDir = path.dirname( ledgerPath );
		const ledgers = fs.existsSync( ledgerDir )
			? fs.readdirSync( ledgerDir )
			: [];
		for ( const file of ledgers.filter( ( f ) =>
			f.endsWith( '.jsonl' )
		) ) {
			if (
				Date.now() - parseInt( file.split( '-' )[ 0 ], 36 ) >
				maxAgeMs
			) {
				fs.rmSync( path.join( ledgerDir, file ) );
			}
		}
	} finally {
		await api.dispose();
	}
} );
