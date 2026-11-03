const fs = require( 'fs' );
const { ledgerPath } = require( './env' );
const { ApiClient, readLedger, runPrefix } = require( './support/api' );

/**
 * Backstop for the `api` fixture: deletes anything this run created that its test didn't (a crashed worker, a failed
 * cleanup), then fails the run if anything with the run's prefix is left.
 */
module.exports = async () => {
	const ledger = readLedger();
	if ( ! ledger.length ) {
		return;
	}

	const api = await ApiClient.create();
	try {
		for ( const item of ledger.reverse() ) {
			await api.deleteForever( item );
		}

		const leftovers = await api.findPrefixed( runPrefix );
		if ( leftovers.length ) {
			throw new Error(
				`Content left behind by this run: ${ leftovers
					.map( ( item ) => `${ item.endpoint }/${ item.id }` )
					.join( ', ' ) }`
			);
		}
		fs.rmSync( ledgerPath, { force: true } );
	} finally {
		await api.dispose();
	}
};
