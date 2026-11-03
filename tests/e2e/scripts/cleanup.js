// Finds content left on a site by crashed runs: slugs starting with "qa-auto-<runId>-" from runs older than
// QA_CLEANUP_HOURS (default 2). Lists them by default; pass --apply to delete them.
// TEST_ENV=dev npm run test:e2e:cleanup [-- --apply]
const fs = require( 'fs' );
const path = require( 'path' );
const { isPlayground, ledgerPath } = require( '../env' );
const { ApiClient, contentPrefix } = require( '../support/api' );

const apply = process.argv.includes( '--apply' );
const maxAgeMs = Number( process.env.QA_CLEANUP_HOURS ?? 2 ) * 60 * 60 * 1000;

// Run IDs and ledger names start with a base-36 timestamp.
const isStale = ( id ) =>
	Date.now() - parseInt( id.split( '-' )[ 0 ], 36 ) > maxAgeMs;

const cleanup = async () => {
	if ( isPlayground ) {
		console.log(
			'Nothing to clean up: Playground sites are discarded after each run. Set TEST_ENV.'
		);
		return;
	}

	const api = await ApiClient.create();
	try {
		const stale = (
			await api.findPrefixed( `${ contentPrefix }-` )
		).filter( ( item ) =>
			isStale( item.slug.slice( contentPrefix.length + 1 ) )
		);

		for ( const item of stale ) {
			console.log( `${ item.endpoint }/${ item.id }  ${ item.slug }` );
		}
		if ( ! apply ) {
			console.log(
				stale.length
					? `Dry run: ${ stale.length } item(s). Add -- --apply to delete them.`
					: 'Nothing to clean up.'
			);
			return;
		}

		for ( const item of stale ) {
			await api.deleteForever( item );
		}
		console.log( `Deleted ${ stale.length } item(s).` );

		// Ledgers from runs whose teardown never ran.
		const ledgerDir = path.dirname( ledgerPath );
		if ( fs.existsSync( ledgerDir ) ) {
			for ( const file of fs.readdirSync( ledgerDir ) ) {
				if ( file.endsWith( '.jsonl' ) && isStale( file ) ) {
					fs.rmSync( path.join( ledgerDir, file ) );
				}
			}
		}
	} finally {
		await api.dispose();
	}
};

cleanup().catch( ( error ) => {
	console.error( error.message );
	process.exitCode = 1;
} );
