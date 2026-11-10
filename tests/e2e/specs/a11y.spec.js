/**
 * Scans every page in pages.js with axe: WCAG 2.x A/AA plus best practices.
 */
const { test } = require( '../support/test' );
const { expectNoAxeViolations } = require( '../support/a11y' );
const pages = require( './pages' );

for ( const { name, path } of pages ) {
	test(
		`${ name } has no axe violations`,
		{ tag: [ '@a11y', '@readonly', '@mobile' ] },
		async ( { page } ) => {
			// Scan once late scripts and requests have finished.
			// eslint-disable-next-line playwright/no-networkidle
			await page.goto( path, { waitUntil: 'networkidle' } );

			await expectNoAxeViolations( page );
		}
	);
}
