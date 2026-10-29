const { test, expect } = require( '../../support/test' );
const { credentials, roles } = require( '../../env' );
const {
	adminPath,
	expectLoggedIn,
	expectNoBotChallenge,
	loginPath,
	submitLogin,
} = require( '../../support/login' );

test(
	'logged-out-admin-redirects-to-login',
	{ tag: [ '@readonly', '@smoke' ] },
	async ( { page } ) => {
		await page.goto( adminPath );
		await expectNoBotChallenge( page );

		await expect( page ).toHaveURL( new RegExp( loginPath ) );
		await expect(
			page.getByLabel( 'Username or Email Address' )
		).toBeVisible();
	}
);

// Mutating: a failed login can change security counters. One attempt only.
test(
	'wrong-password-shows-error',
	{ tag: [ '@mutating', '@functional' ] },
	async ( { page } ) => {
		let loginPosts = 0;
		page.on( 'request', ( request ) => {
			if (
				request.method() === 'POST' &&
				new URL( request.url() ).pathname === loginPath
			) {
				loginPosts++;
			}
		} );

		await submitLogin(
			page,
			`qa-no-such-user-${ Date.now().toString( 36 ) }`,
			'not-a-real-password'
		);

		await expect( page.locator( '#login_error' ) ).toBeVisible();
		await expect( page.locator( '#wpadminbar' ) ).toHaveCount( 0 );
		expect( loginPosts ).toBe( 1 );
	}
);

for ( const role of roles.length ? roles : [ '' ] ) {
	test(
		`valid-credentials-reach-admin${ role ? ` (${ role })` : '' }`,
		{ tag: [ '@readonly', '@smoke', '@requires-account' ] },
		async ( { page } ) => {
			test.skip( ! role, 'No roles configured: set QA_ROLES in .env' );
			const { username, password, missing } = credentials( role );
			test.skip(
				! username,
				`No credentials for ${ role }: set ${ missing.join( ' and ' ) }`
			);

			await submitLogin( page, username, password );
			await expectLoggedIn( page );
		}
	);
}
