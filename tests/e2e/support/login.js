const { expect } = require( '@playwright/test' );

const loginPath = '/wp-login.php';
const adminPath = '/wp-admin/';

/**
 * Fails fast with a clear message instead of timing out on a bot-check page.
 *
 * @param {import('@playwright/test').Page} page Page.
 */
const expectNoBotChallenge = async ( page ) => {
	await expect(
		page.getByRole( 'heading', {
			name: 'Performing security verification',
		} ),
		'Blocked by the Cloudflare bot check. The test runner needs a Cloudflare bypass for wp-login.php and wp-admin.'
	).toHaveCount( 0 );
};

/**
 * Submits the core WordPress login form once. Never retries.
 *
 * @param {import('@playwright/test').Page} page     Page.
 * @param {string}                          username Username.
 * @param {string}                          password Password.
 */
const submitLogin = async ( page, username, password ) => {
	await page.goto( loginPath );
	await expectNoBotChallenge( page );

	await page.getByLabel( 'Username or Email Address' ).fill( username );
	await page.getByLabel( 'Password', { exact: true } ).fill( password );
	await page.getByRole( 'button', { name: 'Log In' } ).click();
};

/**
 * Some roles land on their profile page, not the Dashboard, so success is "in wp-admin with the admin bar".
 *
 * @param {import('@playwright/test').Page} page Page.
 */
const expectLoggedIn = async ( page ) => {
	await expect( page ).toHaveURL( new RegExp( adminPath ) );
	await expect( page.locator( '#wpadminbar' ) ).toBeVisible();
};

module.exports = {
	loginPath,
	adminPath,
	expectNoBotChallenge,
	submitLogin,
	expectLoggedIn,
};
