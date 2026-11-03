const { isPlayground } = require( '../env' );

/**
 * Front-end pages covered by smoke and a11y specs. One per template, plus fixture pages.
 */
const pages = [
	{ name: 'home (index)', path: '/', status: 200 },
	{ name: 'single', path: '/sample-post/', status: 200, fixture: true },
	{ name: 'archive', path: '/category/uncategorized/', status: 200 },
	{ name: 'search', path: '/?s=hello', status: 200 },
	{ name: '404', path: '/e2e-not-found/', status: 404 },
	{
		name: 'page: styleguide',
		path: '/styleguide/',
		status: 200,
		fixture: true,
	},
];

// Fixture pages come from fixtures/, which only Playground has.
module.exports = isPlayground
	? pages
	: pages.filter( ( page ) => ! page.fixture );
