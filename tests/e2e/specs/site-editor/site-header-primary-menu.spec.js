const { test, expect } = require( '../../support/test' );
const {
	dropdownChecks,
	expectSameOriginLinksOk,
	firstDropdown,
} = require( '../../support/menus' );
const { breakpoints, viewports } = require( '../../support/viewports' );

// The primary menu's navigation wrapper from parts/header.html. Mega menus nest further nav landmarks inside it.
const primaryMenu = ( page ) =>
	page.locator(
		'header.site-header .site-header__primary-menu nav.wp-block-tribe-navigation-wrapper'
	);
const toggle = ( page ) =>
	page
		.locator( 'header.site-header' )
		.getByRole( 'button', { name: 'Toggle Mobile Menu' } );

// Menu items are editable content: assert structure, never labels.
const firstItem = ( page ) =>
	primaryMenu( page ).getByRole( 'listitem' ).first();

test(
	'menu-has-accessible-name',
	{ tag: [ '@readonly', '@a11y' ] },
	async ( { page } ) => {
		await page.goto( '/' );

		await expect( primaryMenu( page ) ).toHaveAccessibleName( /\S/ );
	}
);

test(
	'same-origin-links-return-200',
	{ tag: [ '@readonly', '@functional' ] },
	async ( { page, baseURL } ) => {
		await page.goto( '/' );

		await expectSameOriginLinksOk( page, primaryMenu( page ), baseURL );
	}
);

test.describe( () => {
	test.use( { viewport: viewports.desktop } );

	for ( const [ id, check ] of Object.entries( dropdownChecks ) ) {
		test(
			id,
			{ tag: [ '@readonly', '@functional', '@a11y' ] },
			async ( { page } ) => {
				await page.goto( '/' );
				await check( await firstDropdown( page, primaryMenu( page ) ) );
			}
		);
	}
} );

for ( const name of [ 'mobile', 'mid' ] ) {
	test.describe( () => {
		test.use( { viewport: viewports[ name ] } );

		test(
			`mobile-menu-opens-and-closes-at-${ name }`,
			{ tag: [ '@readonly', '@functional' ] },
			async ( { page } ) => {
				await page.goto( '/' );
				await expect( firstItem( page ) ).toBeHidden();

				await toggle( page ).click();
				await expect( firstItem( page ) ).toBeVisible();

				await toggle( page ).click();
				await expect( firstItem( page ) ).toBeHidden();
			}
		);

		test(
			`mobile-toggle-sets-aria-expanded-at-${ name }`,
			{ tag: [ '@readonly', '@a11y' ] },
			async ( { page } ) => {
				await page.goto( '/' );
				await expect( toggle( page ) ).toHaveAttribute(
					'aria-expanded',
					'false'
				);

				await toggle( page ).click();
				await expect( firstItem( page ) ).toBeVisible();
				await expect( toggle( page ) ).toHaveAttribute(
					'aria-expanded',
					'true'
				);

				await toggle( page ).click();
				await expect( firstItem( page ) ).toBeHidden();
				await expect( toggle( page ) ).toHaveAttribute(
					'aria-expanded',
					'false'
				);
			}
		);
	} );
}

test(
	'switches-to-mobile-at-breakpoint',
	{ tag: [ '@readonly', '@functional' ] },
	async ( { page } ) => {
		const { height } = viewports.desktop;
		await page.setViewportSize( {
			width: breakpoints.mobileNav + 1,
			height,
		} );
		await page.goto( '/' );
		await expect( toggle( page ) ).toBeHidden();
		await expect( firstItem( page ) ).toBeVisible();

		await page.setViewportSize( { width: breakpoints.mobileNav, height } );
		await expect( toggle( page ) ).toBeVisible();
		await expect( firstItem( page ) ).toBeHidden();
	}
);
