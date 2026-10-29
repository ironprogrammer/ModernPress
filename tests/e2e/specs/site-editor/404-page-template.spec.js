const { test, expect } = require( '../../support/test' );

// The 404 template's recovery path is a search form; its heading and copy are editable, so assert structure only.
test(
	'unknown-url-returns-404-with-search',
	{ tag: [ '@readonly', '@smoke', '@functional' ] },
	async ( { page } ) => {
		const response = await page.goto( '/e2e-this-page-should-not-exist/' );

		expect( response?.status() ).toBe( 404 );
		await expect( page.locator( 'header.site-header' ) ).toBeVisible();
		await expect( page.getByRole( 'heading', { level: 1 } ) ).toBeVisible();
		await expect(
			page.getByRole( 'search' ).getByRole( 'searchbox' )
		).toBeVisible();
	}
);
