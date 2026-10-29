const { request } = require( '@playwright/test' );

/**
 * Prints the WordPress version the site actually runs, so results are never read against an assumed version.
 *
 * @param {import('@playwright/test').FullConfig} config Playwright config.
 */
module.exports = async ( config ) => {
	const { baseURL } = config.projects[ 0 ].use;
	const context = await request.newContext( { baseURL } );
	const feed = await ( await context.get( '/feed/' ) ).text();
	const version =
		feed.match(
			/<generator>https:\/\/wordpress\.org\/\?v=([^<]+)/
		)?.[ 1 ] ?? 'unknown';

	// Workers inherit env set here, so specs can record the version in results.
	process.env.E2E_WP_VERSION = version;
	// stderr keeps stdout clean for --reporter=json.
	console.error( `WordPress ${ version } at ${ baseURL }` );
	await context.dispose();
};
