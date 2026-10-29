const { test, expect } = require( '@playwright/test' );
const pages = require( './pages' );

const PHP_ERROR =
	/<b>(Fatal error|Warning|Notice|Deprecated)<\/b>:|There has been a critical error/;

for ( const { name, path, status } of pages ) {
	test( `${ name } loads cleanly`, { tag: '@smoke' }, async ( { page } ) => {
		const consoleErrors = [];
		const failedRequests = [];

		page.on( 'console', ( msg ) => {
			// Failed loads are reported through failedRequests with their URL.
			if (
				msg.type() === 'error' &&
				! msg.text().startsWith( 'Failed to load resource' )
			) {
				consoleErrors.push( msg.text() );
			}
		} );
		page.on( 'pageerror', ( error ) =>
			consoleErrors.push( error.message )
		);
		page.on( 'response', ( response ) => {
			if (
				response.status() >= 400 &&
				! response.request().isNavigationRequest()
			) {
				failedRequests.push(
					`${ response.status() } ${ response.url() }`
				);
			}
		} );

		const response = await page.goto( path, { waitUntil: 'networkidle' } );

		expect( response.status() ).toBe( status );
		expect( await page.content() ).not.toMatch( PHP_ERROR );
		expect( consoleErrors, 'console errors' ).toEqual( [] );
		expect( failedRequests, 'failed requests' ).toEqual( [] );
	} );
}
