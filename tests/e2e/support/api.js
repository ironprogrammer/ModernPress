const { request } = require( '@playwright/test' );
const fs = require( 'fs' );
const path = require( 'path' );
const {
	automationCredentials,
	baseURL,
	httpCredentials,
	isProduction,
	ledgerPath,
	runId,
} = require( '../env' );

/**
 * @typedef {'posts'|'pages'|'media'|'categories'|'tags'} Endpoint
 * @typedef {{endpoint: Endpoint, id: number, slug?: string}} Item
 */

const contentPrefix = 'qa-auto';
const runPrefix = `${ contentPrefix }-${ runId }-`;

// Everything tests create. Settings, templates, template parts, and global styles are deliberately absent:
// tests never change them.
const endpoints = [ 'posts', 'pages', 'media', 'categories', 'tags' ];

const mimeTypes = {
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	gif: 'image/gif',
	webp: 'image/webp',
	svg: 'image/svg+xml',
};

const assertWritable = () => {
	if ( isProduction ) {
		throw new Error(
			'Refusing to write: TEST_ENV is production. Tests never create or change content there.'
		);
	}
};

/**
 * Prefixes a name with this run's ID, as a valid slug.
 *
 * @param {string} name Short name for the item.
 * @return {string} Slug, e.g. "qa-auto-<runId>-hero".
 */
const prefixed = ( name ) =>
	`${ runPrefix }${ name }`.toLowerCase().replace( /[^a-z0-9-]+/g, '-' );

/**
 * Items this run created, oldest first.
 *
 * @return {Item[]} Ledger entries.
 */
const readLedger = () => {
	if ( ! fs.existsSync( ledgerPath ) ) {
		return [];
	}
	return fs
		.readFileSync( ledgerPath, 'utf8' )
		.split( '\n' )
		.filter( Boolean )
		.map( ( line ) => JSON.parse( line ) );
};

const json = async ( response, action ) => {
	if ( ! response.ok() ) {
		const body = ( await response.text() ).slice( 0, 300 );
		throw new Error(
			`REST ${ action } failed: ${ response.status() } ${ body }`
		);
	}
	return response.json();
};

class ApiClient {
	#context;
	#created = [];

	constructor( context ) {
		this.#context = context;
	}

	/**
	 * Opens a REST client authenticated as the automation account.
	 *
	 * @return {Promise<ApiClient>} Client.
	 */
	static async create() {
		assertWritable();
		const creds = automationCredentials();
		if ( ! creds.username ) {
			throw new Error(
				`No automation account: set ${ creds.missing.join( ' and ' ) }`
			);
		}

		const token = Buffer.from(
			`${ creds.username }:${ creds.password }`
		).toString( 'base64' );
		const context = await request.newContext( {
			baseURL: `${ baseURL }/wp-json/wp/v2/`,
			httpCredentials,
			extraHTTPHeaders: { Authorization: `Basic ${ token }` },
		} );
		return new ApiClient( context );
	}

	async get( route, params ) {
		return json(
			await this.#context.get( route, { params } ),
			`GET ${ route }`
		);
	}

	async createPost( data ) {
		return this.#createNamed( 'posts', data );
	}

	async createPage( data ) {
		return this.#createNamed( 'pages', data );
	}

	/**
	 * @param {'categories'|'tags'} taxonomy Taxonomy endpoint.
	 * @param {{name: string}}      data     Term fields; `name` gets the run prefix.
	 */
	async createTerm( taxonomy, { name, ...rest } ) {
		return this.#record(
			taxonomy,
			await this.#post( taxonomy, {
				name: prefixed( name ),
				slug: prefixed( name ),
				...rest,
			} )
		);
	}

	async uploadMedia( filePath, data = {} ) {
		const extension = path.extname( filePath );
		const name = prefixed( path.basename( filePath, extension ) );
		const response = await this.#context.post( 'media', {
			multipart: {
				file: {
					name: `${ name }${ extension }`,
					mimeType:
						mimeTypes[ extension.slice( 1 ).toLowerCase() ] ??
						'application/octet-stream',
					buffer: fs.readFileSync( filePath ),
				},
				title: name,
				slug: name,
				...data,
			},
		} );
		return this.#record( 'media', await json( response, 'upload media' ) );
	}

	/**
	 * Permanent delete, so nothing lands in the trash. Already-deleted items are fine.
	 *
	 * @param {Item} item Item to delete.
	 */
	async deleteForever( item ) {
		assertWritable();
		const response = await this.#context.delete(
			`${ item.endpoint }/${ item.id }`,
			{ params: { force: 'true' } }
		);
		if ( ! response.ok() && ! [ 404, 410 ].includes( response.status() ) ) {
			throw new Error(
				`REST delete ${ item.endpoint }/${ item.id } failed: ${ response.status() }`
			);
		}
	}

	// Deletes what this client created, newest first.
	async deleteCreated() {
		for ( const item of this.#created.splice( 0 ).reverse() ) {
			await this.deleteForever( item );
		}
	}

	/**
	 * Finds items whose slug starts with `prefix`, in every status, across every endpoint tests write to.
	 *
	 * @param {string} prefix Slug prefix.
	 * @return {Promise<Item[]>} Matching items.
	 */
	async findPrefixed( prefix ) {
		const found = [];
		for ( const endpoint of endpoints ) {
			const params = { search: prefix, per_page: 100, context: 'edit' };
			if ( endpoint === 'posts' || endpoint === 'pages' ) {
				params.status = 'publish,future,draft,pending,private,trash';
			}
			const results = await this.get( endpoint, params );
			found.push(
				...results
					.filter( ( result ) => result.slug.startsWith( prefix ) )
					.map( ( result ) => ( {
						endpoint,
						id: result.id,
						slug: result.slug,
					} ) )
			);
		}
		return found;
	}

	async dispose() {
		await this.#context.dispose();
	}

	async #createNamed( endpoint, { name, ...rest } ) {
		return this.#record(
			endpoint,
			await this.#post( endpoint, {
				title: prefixed( name ),
				slug: prefixed( name ),
				status: 'draft',
				...rest,
			} )
		);
	}

	async #post( endpoint, data ) {
		assertWritable();
		return json(
			await this.#context.post( endpoint, { data } ),
			`create ${ endpoint }`
		);
	}

	// Written to the run ledger as soon as it exists, so teardown can delete it even if the test fails.
	#record( endpoint, object ) {
		const item = { endpoint, id: object.id, slug: object.slug };
		fs.mkdirSync( path.dirname( ledgerPath ), { recursive: true } );
		fs.appendFileSync( ledgerPath, `${ JSON.stringify( item ) }\n` );
		this.#created.push( item );
		return object;
	}
}

module.exports = { ApiClient, contentPrefix, runPrefix, prefixed, readLedger };
