const { test, expect } = require( '@playwright/test' );
const AxeBuilder = require( '@axe-core/playwright' ).default;
const pages = require( './pages' );

const WCAG_TAGS = [ 'wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa' ];
const TAGS =
	process.env.A11Y_BEST_PRACTICE === '0'
		? WCAG_TAGS
		: [ ...WCAG_TAGS, 'best-practice' ];
const MAX_NODES = 5;

/**
 * Labels a violation with its WCAG success criteria (e.g. "WCAG 2.1.1"), or as a best practice.
 *
 * @param {string[]} tags axe rule tags.
 * @return {string} Label.
 */
const label = ( tags ) => {
	const criteria = tags
		.filter( ( tag ) => /^wcag\d{3,}$/.test( tag ) )
		.map( ( tag ) => tag.replace( /^wcag(\d)(\d)(\d+)$/, '$1.$2.$3' ) );

	return criteria.length
		? `WCAG ${ criteria.join( ', ' ) }`
		: 'best practice';
};

/**
 * Formats a violation as its rule, then each flagged element's selector and opening tag.
 *
 * @param {Object} violation axe violation.
 * @return {string} Readable summary.
 */
const summarize = ( violation ) => {
	const nodes = violation.nodes
		.slice( 0, MAX_NODES )
		.map(
			( node ) =>
				`    ${ node.target.join( ' ' ) }\n      ${
					node.html.match( /^<[^>]+>/ )?.[ 0 ] ?? node.html
				}`
		);

	if ( violation.nodes.length > MAX_NODES ) {
		nodes.push( `    …and ${ violation.nodes.length - MAX_NODES } more` );
	}

	return `[${ label( violation.tags ) }] ${ violation.id } (${
		violation.impact
	}): ${ violation.help }\n${ nodes.join( '\n' ) }`;
};

for ( const { name, path } of pages ) {
	test(
		`${ name } has no axe violations`,
		{ tag: '@a11y' },
		async ( { page }, testInfo ) => {
			await page.goto( path, { waitUntil: 'networkidle' } );

			const { violations } = await new AxeBuilder( { page } )
				.withTags( TAGS )
				.analyze();

			if ( violations.length ) {
				await testInfo.attach( 'axe-results', {
					contentType: 'application/json',
					body: JSON.stringify(
						{
							path,
							project: testInfo.project.name,
							wpVersion: process.env.E2E_WP_VERSION,
							violations,
						},
						null,
						2
					),
				} );
			}

			expect( violations.map( summarize ), 'axe violations' ).toEqual(
				[]
			);
		}
	);
}
