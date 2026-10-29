const AxeBuilder = require( '@axe-core/playwright' ).default;
const { expect } = require( '@playwright/test' );

/**
 * Scoped axe check: fails on serious and critical issues inside `include` only.
 *
 * @param {import('@playwright/test').Page} page    Page.
 * @param {string}                          include Selector to scan.
 * @param {string[]}                        exclude Selectors inside it to skip.
 */
const expectNoSeriousA11yIssues = async ( page, include, exclude = [] ) => {
	let builder = new AxeBuilder( { page } ).include( include );
	for ( const selector of exclude ) {
		builder = builder.exclude( selector );
	}

	const { violations } = await builder.analyze();
	const serious = violations
		.filter(
			( violation ) =>
				violation.impact === 'serious' ||
				violation.impact === 'critical'
		)
		.map(
			( violation ) =>
				`${ violation.id } (${ violation.impact }): ${
					violation.help
				} – ${ violation.nodes
					.map( ( node ) => node.target.join( ' ' ) )
					.join( ', ' ) }`
		);

	expect( serious, `Serious accessibility issues in ${ include }` ).toEqual(
		[]
	);
};

module.exports = { expectNoSeriousA11yIssues };
