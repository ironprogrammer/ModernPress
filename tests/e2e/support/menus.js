const { test, expect } = require( './test' );

/**
 * @typedef {import('@playwright/test').Page}    Page
 * @typedef {import('@playwright/test').Locator} Locator
 * @typedef {{page: Page, toggle: Locator, submenu: Locator}} Dropdown
 */

/**
 * Requests every same-origin link in the menu, including ones hidden in closed dropdowns. Placeholder "#" links
 * resolve to the current page, so fragments are dropped.
 *
 * @param {Page}    page    Page.
 * @param {Locator} menu    Menu container.
 * @param {string}  baseURL Site URL.
 */
const expectSameOriginLinksOk = async ( page, menu, baseURL ) => {
	const origin = new URL( baseURL ).origin;
	const hrefs = await menu
		.locator( 'a[href]' )
		.evaluateAll( ( links ) => links.map( ( link ) => link.href ) );
	const urls = [
		...new Set( hrefs.map( ( href ) => href.split( '#' )[ 0 ] ) ),
	].filter( ( url ) => new URL( url ).origin === origin );

	expect( urls.length, 'Menu has no same-origin links' ).toBeGreaterThan( 0 );
	for ( const url of urls ) {
		const response = await page.request.get( url );
		expect.soft( response.status(), url ).toBe( 200 );
	}
};

// Lets the page react to an input (two rendered frames) before asserting that nothing changed.
const nextFrames = ( page ) =>
	page.evaluate(
		() =>
			new Promise( ( resolve ) =>
				window.requestAnimationFrame( () =>
					window.requestAnimationFrame( resolve )
				)
			)
	);

const focusIsInside = ( submenu ) =>
	submenu.evaluate( ( el ) => el.contains( el.ownerDocument.activeElement ) );

// Intended dropdown behavior (confirmed by the team, 2026-10-28): opens on click, not hover. Escape closes it and leaves
// focus on the parent. Toggles report their state with aria-expanded. Arrow keys do nothing; only Tab moves focus.
// Opening keeps focus on the parent, and the next Tab enters the sub-menu.
// Each check gets the first dropdown in the menu; specs define the tests so failures point at their own file.
/** @type {Record<string, (dropdown: Dropdown) => Promise<void>>} */
const dropdownChecks = {
	'dropdown-opens-on-click': async ( { toggle, submenu } ) => {
		await expect( submenu ).toBeHidden();
		await toggle.click();
		await expect( submenu ).toBeVisible();
	},

	'dropdown-toggle-sets-aria-expanded': async ( {
		page,
		toggle,
		submenu,
	} ) => {
		await expect( toggle ).toHaveAttribute( 'aria-expanded', 'false' );
		await toggle.click();
		await expect( submenu ).toBeVisible();
		await expect( toggle ).toHaveAttribute( 'aria-expanded', 'true' );
		await page.keyboard.press( 'Escape' );
		await expect( submenu ).toBeHidden();
		await expect( toggle ).toHaveAttribute( 'aria-expanded', 'false' );
	},

	'dropdown-does-not-open-on-hover': async ( { page, toggle, submenu } ) => {
		await toggle.hover();
		await nextFrames( page );
		await expect( submenu ).toBeHidden();

		// Prove the locator finds the dropdown, so "hidden" above means something.
		await toggle.click();
		await expect( submenu ).toBeVisible();
	},

	'escape-closes-dropdown': async ( { page, toggle, submenu } ) => {
		await toggle.click();
		await expect( submenu ).toBeVisible();
		await page.keyboard.press( 'Escape' );
		await expect( submenu ).toBeHidden();
	},

	// Tab after Escape lands on the next item either way, so check focus directly: the parent must have it.
	'escape-from-submenu-returns-focus-to-parent': async ( {
		page,
		toggle,
		submenu,
	} ) => {
		await toggle.focus();
		await page.keyboard.press( 'Enter' );
		await page.keyboard.press( 'Tab' );
		await expect.poll( () => focusIsInside( submenu ) ).toBe( true );

		await page.keyboard.press( 'Escape' );
		await expect( submenu ).toBeHidden();
		await expect( toggle ).toBeFocused();
	},

	'focus-stays-on-parent-when-opened': async ( {
		page,
		toggle,
		submenu,
	} ) => {
		await toggle.focus();
		await page.keyboard.press( 'Enter' );
		await expect( submenu ).toBeVisible();
		await expect( toggle ).toBeFocused();
	},

	'tab-moves-into-open-dropdown': async ( { page, toggle, submenu } ) => {
		await toggle.focus();
		await page.keyboard.press( 'Enter' );
		await expect( submenu ).toBeVisible();
		await page.keyboard.press( 'Tab' );
		await expect.poll( () => focusIsInside( submenu ) ).toBe( true );
	},

	'arrow-keys-do-not-control-dropdown': async ( {
		page,
		toggle,
		submenu,
	} ) => {
		await toggle.focus();
		for ( const key of [
			'ArrowDown',
			'ArrowRight',
			'ArrowUp',
			'ArrowLeft',
		] ) {
			await page.keyboard.press( key );
			await nextFrames( page );
			await expect(
				submenu,
				`${ key } should not open the dropdown`
			).toBeHidden();
			await expect(
				toggle,
				`${ key } should not move focus`
			).toBeFocused();
		}
	},
};

/**
 * Menu items are editable content, so checks use the first dropdown, and skip when the menu has none.
 *
 * @param {Page}    page Page.
 * @param {Locator} menu Menu container.
 * @return {Promise<Dropdown>} The first dropdown's toggle and sub-menu.
 */
const firstDropdown = async ( page, menu ) => {
	const toggle = menu.locator( ':scope li > button' ).first();
	test.skip(
		( await toggle.count() ) === 0,
		'This menu has no dropdown items'
	);
	return {
		page,
		toggle,
		submenu: toggle.locator( 'xpath=following-sibling::*[1]' ),
	};
};

module.exports = { expectSameOriginLinksOk, dropdownChecks, firstDropdown };
