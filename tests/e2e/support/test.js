// Playwright fixtures call use(), which the React hooks rule mistakes for React's use().
/* eslint-disable react-hooks/rules-of-hooks */
const base = require( '@playwright/test' );
const {
	automationCredentials,
	credentials,
	roleStatePath,
} = require( '../env' );
const { ApiClient } = require( './api' );

const test = base.test.extend( {
	// Set `test.use( { role: 'editor' } )` to run with that role's saved session. Skips if its credentials are missing.
	role: [ undefined, { option: true } ],
	storageState: async ( { role, storageState }, use, testInfo ) => {
		if ( ! role ) {
			return use( storageState );
		}

		const { missing } = credentials( role );
		testInfo.skip(
			missing.length > 0,
			`No credentials for ${ role }: set ${ missing.join( ' and ' ) }`
		);

		await use( roleStatePath( role ) );
	},
	// REST client for creating content. Everything it creates is deleted after the test, and the run's teardown
	// deletes anything left over. Skips the test without an automation account.
	api: async ( {}, use, testInfo ) => {
		const { missing } = automationCredentials();
		testInfo.skip(
			missing.length > 0,
			`No automation account: set ${ missing.join( ' and ' ) }`
		);

		const api = await ApiClient.create();
		await use( api );
		await api.deleteCreated();
		await api.dispose();
	},
	// Abort requests to other hosts (embeds, placeholder images, analytics) so a slow third party can't fail a test.
	blockThirdParty: [
		async ( { page, baseURL }, use ) => {
			const siteHost = new URL( baseURL ).host;
			await page.route( '**/*', ( route ) =>
				new URL( route.request().url() ).host === siteHost
					? route.continue()
					: route.abort()
			);
			await use();
		},
		{ auto: true },
	],
} );

module.exports = { test, expect: base.expect };
