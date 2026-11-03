// Fails when a test doesn't carry exactly one of @readonly or @mutating. Production relies on these tags.
const { execFileSync } = require( 'child_process' );
const path = require( 'path' );

// Listing loads the specs without booting Playground.
const listed = JSON.parse(
	execFileSync(
		'npx',
		[ 'playwright', 'test', '--list', '--reporter=json' ],
		{
			cwd: path.join( __dirname, '..' ),
			encoding: 'utf8',
			env: { ...process.env, TEST_ENV: 'playground' },
		}
	)
);

const problems = new Set();
const visit = ( suite ) => {
	// Paths are relative to specs/; setup steps live outside it and aren't tests.
	for ( const spec of ( suite.specs ?? [] ).filter(
		( { file } ) => ! file.startsWith( '../' )
	) ) {
		const safety = spec.tags.filter(
			( tag ) => tag === 'readonly' || tag === 'mutating'
		);
		if ( safety.length !== 1 ) {
			problems.add(
				`${ spec.file }:${ spec.line }  "${ spec.title }" needs exactly one of @readonly or @mutating`
			);
		}
	}
	( suite.suites ?? [] ).forEach( visit );
};
listed.suites.forEach( visit );

if ( problems.size ) {
	console.error( [ ...problems ].join( '\n' ) );
	process.exit( 1 );
}
