// Fails on test.only, fixed waits, and tests without exactly one of @readonly / @mutating.
const { execFileSync } = require( 'child_process' );
const fs = require( 'fs' );
const path = require( 'path' );

const root = path.join( __dirname, '..' );
const problems = [];

const files = [ 'specs', 'support', 'setup' ].flatMap( ( dir ) =>
	fs
		.readdirSync( path.join( root, dir ), { recursive: true } )
		.filter( ( file ) => file.endsWith( '.js' ) )
		.map( ( file ) => path.join( root, dir, file ) )
);

for ( const file of files ) {
	fs.readFileSync( file, 'utf8' )
		.split( '\n' )
		.forEach( ( text, i ) => {
			const where = `${ path.relative( root, file ) }:${ i + 1 }`;
			if ( /\.only\s*\(/.test( text ) ) {
				problems.push( `${ where }  .only() is not allowed` );
			}
			if ( /waitForTimeout\s*\(/.test( text ) ) {
				problems.push(
					`${ where }  fixed wait (waitForTimeout) is not allowed`
				);
			}
		} );
}

// A live TEST_ENV so the list needs no Playground; the URL is never requested.
const listed = JSON.parse(
	execFileSync(
		'npx',
		[ 'playwright', 'test', '--list', '--reporter=json' ],
		{
			cwd: root,
			encoding: 'utf8',
			env: {
				...process.env,
				QA_LINT: '1',
				TEST_ENV: 'dev',
				DEV_BASE_URL: 'https://lint.invalid',
			},
		}
	)
);

const visit = ( suite ) => {
	for ( const spec of suite.specs ?? [] ) {
		const safety = spec.tags.filter(
			( tag ) => tag === 'readonly' || tag === 'mutating'
		);
		if ( safety.length !== 1 ) {
			problems.push(
				`${ spec.file }:${ spec.line }  "${ spec.title }" needs exactly one of @readonly or @mutating`
			);
		}
	}
	( suite.suites ?? [] ).forEach( visit );
};
listed.suites.forEach( visit );

if ( problems.length ) {
	console.error( problems.join( '\n' ) );
	process.exit( 1 );
}

console.log( `Test lint passed (${ files.length } files)` );
