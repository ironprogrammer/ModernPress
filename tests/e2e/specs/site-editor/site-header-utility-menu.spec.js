const { test, expect } = require( '../../support/test' );
const {
	dropdownChecks,
	expectSameOriginLinksOk,
	firstDropdown,
} = require( '../../support/menus' );
const { viewports } = require( '../../support/viewports' );

// The utility menu's navigation wrapper from parts/header.html. Below the mobile-nav breakpoint its items move into
// the mobile menu.
const utilityMenu = ( page ) =>
	page.locator(
		'header.site-header nav.wp-block-tribe-navigation-wrapper:has(> .site-header__utility-menu)'
	);

test.use( { viewport: viewports.desktop } );

test(
	'menu-has-accessible-name',
	{ tag: [ '@readonly', '@a11y' ] },
	async ( { page } ) => {
		await page.goto( '/' );

		await expect( utilityMenu( page ) ).toHaveAccessibleName( /\S/ );
	}
);

test(
	'same-origin-links-return-200',
	{ tag: [ '@readonly', '@functional' ] },
	async ( { page, baseURL } ) => {
		await page.goto( '/' );

		await expectSameOriginLinksOk( page, utilityMenu( page ), baseURL );
	}
);

for ( const [ id, check ] of Object.entries( dropdownChecks ) ) {
	test(
		id,
		{ tag: [ '@readonly', '@functional', '@a11y' ] },
		async ( { page } ) => {
			await page.goto( '/' );
			await check( await firstDropdown( page, utilityMenu( page ) ) );
		}
	);
}
