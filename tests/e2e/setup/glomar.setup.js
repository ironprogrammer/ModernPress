const { test: setup, expect } = require( '@playwright/test' );
const { glomarQuery, glomarStatePath } = require( '../env' );

// Glomar redirects unauthenticated visitors (via /glomar to wp-login.php) until the secret query sets an access cookie.
setup( 'unlock Glomar access gate', async ( { page } ) => {
	await page.goto( `/?${ glomarQuery }` );

	expect(
		new URL( page.url() ).pathname,
		'Redirected by the Glomar gate; check *_GLOMAR_QUERY in .env'
	).toBe( '/' );

	await page.context().storageState( { path: glomarStatePath } );
} );
