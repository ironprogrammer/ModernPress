/**
 * Site header: logo link, landmark names, the mobile toggle at each width, and an axe scan of the header.
 */
const { test, expect } = require( '../../support/test' );
const { expectNoAxeViolations } = require( '../../support/a11y' );
const { viewports, viewportTags } = require( '../../support/viewports' );

const header = 'header.site-header';
const announcement = '.b-announcement';

test(
	'logo-links-home',
	{ tag: [ '@readonly', '@functional' ] },
	async ( { page, baseURL } ) => {
		await page.goto( '/' );

		const homeLink = page
			.locator(
				`${ header } :is(.wp-block-site-title, .wp-block-site-logo) a`
			)
			.first();
		const href = await homeLink.getAttribute( 'href' );

		expect( new URL( href, baseURL ).pathname ).toBe( '/' );
	}
);

test(
	'landmarks-have-accessible-names',
	{ tag: [ '@readonly', '@a11y' ] },
	async ( { page } ) => {
		await page.goto( '/' );

		await expect( page.getByRole( 'banner' ) ).toBeVisible();

		const navs = page.locator( header ).getByRole( 'navigation' );
		expect( await navs.count() ).toBeGreaterThan( 0 );
		for ( const nav of await navs.all() ) {
			await expect( nav ).toHaveAccessibleName( /\S/ );
		}
	}
);

for ( const [ name, viewport ] of Object.entries( viewports ) ) {
	const shown = name !== 'desktop';

	test.describe( () => {
		test.use( { viewport } );

		test(
			`mobile-toggle-${ shown ? 'shown' : 'hidden' }-at-${ name }`,
			{ tag: [ '@readonly', '@functional', ...viewportTags( name ) ] },
			async ( { page } ) => {
				await page.goto( '/' );

				const toggle = page
					.locator( header )
					.getByRole( 'button', { name: 'Toggle Mobile Menu' } );
				await expect( toggle ).toBeVisible( { visible: shown } );
			}
		);
	} );
}

for ( const name of [ 'mobile', 'desktop' ] ) {
	test.describe( () => {
		test.use( { viewport: viewports[ name ] } );

		test(
			`header-has-no-axe-violations-at-${ name }`,
			{ tag: [ '@readonly', '@a11y', ...viewportTags( name ) ] },
			async ( { page } ) => {
				await page.goto( '/' );

				// Announcements render inside the banner but are separate content with their own topic.
				await expectNoAxeViolations( page, {
					include: header,
					exclude: [ announcement ],
				} );
			}
		);
	} );
}
