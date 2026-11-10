const { execFileSync } = require( 'child_process' );
const fs = require( 'fs' );
const path = require( 'path' );

/**
 * @typedef {Object} ListedTest
 * @property {string}   file           Spec path, relative to specs/.
 * @property {number}   line           Line of the test call.
 * @property {string}   title          Test title.
 * @property {string[]} tags           Tags without the "@".
 * @property {Object[]} annotations    Static annotations: `type` and optional `description`.
 * @property {string}   project        Playwright project name.
 * @property {string}   expectedStatus "failed" for test.fail().
 */

/**
 * Lists the suite as one target would run it, without running anything or booting Playground.
 * Setup steps live outside specs/ and are left out.
 *
 * @param {string} target TEST_ENV value.
 * @param {Object} env    Extra environment variables.
 * @return {ListedTest[]} One entry per test and project.
 */
const listTests = ( target, env = {} ) => {
	const listed = JSON.parse(
		execFileSync(
			'npx',
			[ 'playwright', 'test', '--list', '--reporter=json' ],
			{
				cwd: path.join( __dirname, '..' ),
				encoding: 'utf8',
				env: { ...process.env, ...env, TEST_ENV: target },
			}
		)
	);

	const tests = [];
	const visit = ( suite ) => {
		for ( const spec of suite.specs ?? [] ) {
			if ( spec.file.startsWith( '../' ) ) {
				continue;
			}
			for ( const test of spec.tests ) {
				tests.push( {
					file: spec.file,
					line: spec.line,
					title: spec.title,
					tags: spec.tags,
					annotations: test.annotations,
					project: test.projectName,
					expectedStatus: test.expectedStatus,
				} );
			}
		}
		( suite.suites ?? [] ).forEach( visit );
	};
	listed.suites.forEach( visit );
	return tests;
};

/**
 * A spec's summary: the doc comment that opens the file.
 *
 * @param {string} file Spec path, relative to specs/.
 * @return {string} Summary text, or an empty string when the file doesn't start with one.
 */
const specSummary = ( file ) => {
	const source = fs.readFileSync(
		path.join( __dirname, '../specs', file ),
		'utf8'
	);
	const comment = source.match( /^\/\*\*([\s\S]*?)\*\// )?.[ 1 ] ?? '';
	return comment
		.split( '\n' )
		.map( ( line ) => line.replace( /^\s*\*\s?/, '' ).trim() )
		.filter( Boolean )
		.join( ' ' );
};

module.exports = { listTests, specSummary };
