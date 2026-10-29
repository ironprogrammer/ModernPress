const { request } = require( '@playwright/test' );
const { baseURL, glomarQuery, httpCredentials, testEnv } = require( './env' );

/**
 * Prints the WordPress version the site actually runs, so results are never read against an assumed version.
 *
 * @param {import('@playwright/test').FullConfig} config Playwright config.
 */
module.exports = async ( config ) => {
	const context = await request.newContext( { baseURL, httpCredentials } );
	const feed = await (
		await context.get( glomarQuery ? `/feed/?${ glomarQuery }` : '/feed/' )
	).text();
	const version =
		feed.match(
			/<generator>https:\/\/wordpress\.org\/\?v=([^<]+)/
		)?.[ 1 ] ?? 'unknown';

	// Workers inherit env set here, so specs can record the version in results.
	process.env.E2E_WP_VERSION = version;
	// stderr keeps stdout clean for --reporter=json.
	console.error(
		`WordPress ${ version } at ${ baseURL } (${ testEnv }; projects: ${ config.projects
			.map( ( project ) => project.name )
			.join( ', ' ) })`
	);
	await context.dispose();
};
