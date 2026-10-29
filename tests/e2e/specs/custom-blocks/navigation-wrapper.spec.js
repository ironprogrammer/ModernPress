const { test, expect } = require( '../../support/test' );

const pages = { homepage: '/', 404: '/e2e-this-page-should-not-exist/' };

for ( const [ name, path ] of Object.entries( pages ) ) {
	test(
		`every-nav-landmark-has-a-name-on-${ name }`,
		{ tag: [ '@readonly', '@a11y' ] },
		async ( { page } ) => {
			await page.goto( path );

			const navs = page.getByRole( 'navigation' );
			expect( await navs.count() ).toBeGreaterThan( 0 );
			for ( const nav of await navs.all() ) {
				await expect( nav ).toHaveAccessibleName( /\S/ );
			}
		}
	);
}
