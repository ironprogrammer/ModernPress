const { test, expect } = require( '../../support/test' );

test(
	'returns-200-with-site-landmarks',
	{ tag: [ '@readonly', '@smoke' ] },
	async ( { page } ) => {
		const response = await page.goto( '/' );

		expect( response?.ok() ).toBe( true );
		await expect( page.locator( 'header.site-header' ) ).toBeVisible();
		await expect( page.locator( 'main' ) ).toBeVisible();
		await expect( page.locator( 'footer.site-footer' ) ).toBeAttached();
	}
);
