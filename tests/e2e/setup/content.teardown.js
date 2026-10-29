const { test: teardown, expect } = require( '@playwright/test' );
const fs = require( 'fs' );
const { automationCredentials, ledgerPath } = require( '../env' );
const { ApiClient, readLedger, runPrefix } = require( '../support/api' );

// Runs after every content test, even failed ones: deletes everything in this run's ledger, newest first, then
// confirms nothing with this run's prefix is left.
teardown( 'delete content created by this run', async () => {
	const { missing } = automationCredentials();
	teardown.skip(
		missing.length > 0,
		`No automation account: set ${ missing.join( ' and ' ) }`
	);

	const api = await ApiClient.create();
	try {
		for ( const item of readLedger().reverse() ) {
			await api.deleteForever( item );
		}

		const leftovers = await api.findPrefixed( runPrefix );
		expect(
			leftovers,
			`Content left behind by this run (${ runPrefix })`
		).toEqual( [] );
		fs.rmSync( ledgerPath, { force: true } );
	} finally {
		await api.dispose();
	}
} );
