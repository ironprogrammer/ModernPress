// Writes the coverage map: one self-contained HTML page listing every spec and test, with where each test runs.
// It lists the suite per environment and never runs a test or contacts a site.
//
//   node tests/e2e/scripts/coverage.js [--site-name "Name"] [--out path/to/page.html]
const { execFileSync } = require( 'child_process' );
const fs = require( 'fs' );
const path = require( 'path' );
const { parseArgs } = require( 'util' );
const { listTests, specSummary } = require( './list-tests' );

const e2eDir = path.join( __dirname, '..' );
const { values: args } = parseArgs( {
	options: {
		'site-name': { type: 'string', default: '' },
		out: {
			type: 'string',
			default: path.join( e2eDir, '.coverage/index.html' ),
		},
	},
} );

// Playground needs no settings, and production only needs a URL to list its tests (its tests don't depend on
// accounts). Dev and Staging are listed when their settings file exists, since their roles come from it.
const environments = [
	{ key: 'playground', label: 'Playground', short: 'Playground' },
	{ key: 'dev', label: 'Dev', short: 'Dev' },
	{ key: 'staging', label: 'Staging', short: 'Staging' },
	{ key: 'production', label: 'Production', short: 'Prod' },
];
const hasSettings = ( key ) =>
	fs.existsSync( path.join( e2eDir, `.env.${ key }` ) );
const listed = environments.filter(
	( { key } ) =>
		key === 'playground' || key === 'production' || hasSettings( key )
);

// Folder names as the page shows them. Anything not here is shown in sentence case.
const categoryNames = { '': 'Page checks', cpt: 'Custom post types' };
const categoryName = ( folder ) =>
	categoryNames[ folder ] ??
	folder.charAt( 0 ).toUpperCase() + folder.slice( 1 ).replace( /-/g, ' ' );

const tests = new Map();
for ( const { key } of listed ) {
	// Listing doesn't contact the site, so production without a settings file gets a placeholder URL.
	const env =
		key === 'production' && ! hasSettings( key )
			? { BASE_URL: 'https://production.invalid' }
			: {};
	for ( const test of listTests( key, env ) ) {
		const id = `${ test.file }:${ test.line }:${ test.title }`;
		if ( ! tests.has( id ) ) {
			const note = ( type ) =>
				test.annotations.find( ( a ) => a.type === type )?.description;
			tests.set( id, {
				file: test.file,
				line: test.line,
				title: test.title,
				tags: test.tags,
				desc: note( 'description' ),
				known:
					test.expectedStatus === 'failed'
						? { ticket: note( 'issue' ), reason: note( 'fail' ) }
						: undefined,
				runs: {},
			} );
		}
		const runs = tests.get( id ).runs;
		runs[ key ] = [
			...new Set( [ ...( runs[ key ] ?? [] ), test.project ] ),
		];
	}
}

const files = [ ...new Set( [ ...tests.values() ].map( ( t ) => t.file ) ) ];
const folders = new Set(
	files.map( ( file ) =>
		file.includes( '/' ) ? file.slice( 0, file.lastIndexOf( '/' ) ) : ''
	)
);

const git = ( ...gitArgs ) => {
	try {
		return execFileSync( 'git', gitArgs, {
			cwd: e2eDir,
			encoding: 'utf8',
		} ).trim();
	} catch {
		return '';
	}
};
const commit = git( 'rev-parse', '--short', 'HEAD' );
const dirty = git( 'status', '--porcelain', '--', '.' ) !== '';

const data = {
	siteName: args[ 'site-name' ],
	generatedAt: new Date().toISOString(),
	commit: commit && dirty ? `${ commit } with uncommitted changes` : commit,
	environments: listed,
	unlisted: environments
		.filter( ( e ) => ! listed.includes( e ) )
		.map( ( e ) => e.label ),
	categories: Object.fromEntries(
		[ ...folders ].map( ( folder ) => [ folder, categoryName( folder ) ] )
	),
	specs: Object.fromEntries(
		files.map( ( file ) => [ file, specSummary( file ) ] )
	),
	tests: [ ...tests.values() ],
};

const template = fs.readFileSync(
	path.join( __dirname, 'coverage.html' ),
	'utf8'
);
// Escape "<" so no value can close the <script> tag it's embedded in.
const json = JSON.stringify( data ).replace( /</g, '\\u003c' );
fs.mkdirSync( path.dirname( args.out ), { recursive: true } );
fs.writeFileSync( args.out, template.replace( '/* DATA */ null', json ) );

console.log(
	`Coverage map: ${ data.tests.length } tests in ${ files.length } specs (${ listed
		.map( ( e ) => e.label )
		.join( ', ' ) }).\n${ args.out }`
);
