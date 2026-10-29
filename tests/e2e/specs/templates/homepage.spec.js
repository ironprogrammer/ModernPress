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

test(
	'has-no-uncaught-js-errors',
	{ tag: [ '@readonly', '@smoke' ] },
	async ( { page } ) => {
		const errors = [];
		page.on( 'pageerror', ( error ) => errors.push( error.message ) );

		await page.goto( '/' );
		await page.waitForLoadState( 'networkidle' );

		expect( errors ).toEqual( [] );
	}
);
