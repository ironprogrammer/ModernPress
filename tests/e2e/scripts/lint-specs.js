// Fails when a test doesn't carry exactly one of @readonly or @mutating (production relies on these tags), or a
// spec file doesn't open with a summary comment (the coverage map shows it).
const { listTests, specSummary } = require( './list-tests' );

const tests = listTests( 'playground' );
const problems = new Set();

for ( const test of tests ) {
	const safety = test.tags.filter(
		( tag ) => tag === 'readonly' || tag === 'mutating'
	);
	if ( safety.length !== 1 ) {
		problems.add(
			`${ test.file }:${ test.line }  "${ test.title }" needs exactly one of @readonly or @mutating`
		);
	}
}

for ( const file of new Set( tests.map( ( test ) => test.file ) ) ) {
	if ( ! specSummary( file ) ) {
		problems.add(
			`${ file }  needs a summary: start the file with a /** … */ comment saying what it covers`
		);
	}
}

if ( problems.size ) {
	console.error( [ ...problems ].join( '\n' ) );
	process.exit( 1 );
}
