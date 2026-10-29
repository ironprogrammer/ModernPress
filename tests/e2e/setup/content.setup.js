const { test: setup, expect } = require( '@playwright/test' );
const { automationCredentials } = require( '../env' );
const { ApiClient } = require( '../support/api' );

// Preflight for tests that create content: the REST API is reachable, the application password works, and a write
// can be created and permanently deleted. Without an automation account this skips, and content tests skip too.
setup( 'automation account can create and delete content', async () => {
	const { missing } = automationCredentials();
	setup.skip(
		missing.length > 0,
		`No automation account: set ${ missing.join( ' and ' ) }`
	);

	const api = await ApiClient.create();
	try {
		const me = await api.get( 'users/me', { context: 'edit' } );
		expect(
			me.roles.length,
			'Automation account has no role'
		).toBeGreaterThan( 0 );

		const page = await api.createPage( { name: 'preflight' } );
		expect(
			( await api.get( `pages/${ page.id }`, { context: 'edit' } ) ).id
		).toBe( page.id );

		await api.deleteCreated();
		await expect(
			api.get( `pages/${ page.id }`, { context: 'edit' } )
		).rejects.toThrow( /404/ );
	} finally {
		await api.dispose();
	}
} );
