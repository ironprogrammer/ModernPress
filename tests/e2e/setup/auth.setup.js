const { test: setup } = require( '@playwright/test' );
const { credentials, roleStatePath, roles } = require( '../env' );
const { expectLoggedIn, submitLogin } = require( '../support/login' );

for ( const role of roles ) {
	setup( `log in as ${ role }`, async ( { page } ) => {
		const { username, password, missing } = credentials( role );
		setup.skip(
			! username,
			`No credentials for ${ role }: set ${ missing.join( ' and ' ) }`
		);

		await submitLogin( page, username, password );
		await expectLoggedIn( page );
		await page.context().storageState( { path: roleStatePath( role ) } );
	} );
}
