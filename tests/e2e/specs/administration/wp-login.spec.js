/**
 * WordPress login: the redirect for logged-out visitors, the wrong-password error, and a saved session for each role.
 */
const { test, expect } = require( '../../support/test' );
const { roles } = require( '../../env' );
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

test(
	'wrong-password-shows-error',
	{
		tag: [ '@mutating', '@functional' ],
		annotation: {
			type: 'description',
			description:
				'Submits one wrong password and checks the error. Mutating: a failed login can change security counters, so it makes one attempt only.',
		},
	},
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

// auth-setup logs each role in once; this checks the saved session works, without logging in again.
for ( const role of roles ) {
	test.describe( () => {
		test.use( { role } );

		test(
			`saved-session-reaches-admin (${ role })`,
			{ tag: [ '@readonly', '@smoke', '@requires-account' ] },
			async ( { page } ) => {
				await page.goto( adminPath );

				await expectLoggedIn( page );
			}
		);
	} );
}
