const { test: setup, expect } = require( '@playwright/test' );
const { glomarQuery, glomarStatePath } = require( '../env' );

// Glomar redirects unauthenticated visitors (via /glomar to wp-login.php) until the secret query sets an access cookie.
setup( 'unlock Glomar access gate', async ( { page } ) => {
	await page.goto( `/?${ glomarQuery }` );

	expect(
		new URL( page.url() ).pathname,
		'Redirected by the Glomar gate; check GLOMAR_QUERY in .env.<TEST_ENV>'
	).toBe( '/' );

	await page.context().storageState( { path: glomarStatePath } );
} );
