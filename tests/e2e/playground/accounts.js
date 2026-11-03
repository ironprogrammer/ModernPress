/**
 * Accounts on the Playground test site. Not secrets: the site is local and discarded after the run.
 * server.js creates them at boot, and env.js hands them to the tests.
 */
const accounts = {
	administrator: { username: 'admin', password: 'password' },
	editor: { username: 'editor', password: 'password' },
	// Application password for the REST client, on the admin account.
	automation: { username: 'admin', password: 'e2eautomationpassword000' },
};

const { administrator, editor, automation } = accounts;

// Setting `using_application_passwords` is what makes WordPress check them; creating one through the API would set it.
const blueprintStep = {
	step: 'runPHP',
	code: `<?php require '/wordpress/wp-load.php';
wp_set_password( '${ administrator.password }', get_user_by( 'login', '${ administrator.username }' )->ID );
wp_insert_user( [ 'user_login' => '${ editor.username }', 'user_pass' => '${ editor.password }', 'user_email' => 'editor@example.com', 'role' => 'editor' ] );
update_user_meta( get_user_by( 'login', '${ automation.username }' )->ID, WP_Application_Passwords::USERMETA_KEY_APPLICATION_PASSWORDS, [ [ 'uuid' => wp_generate_uuid4(), 'app_id' => '', 'name' => 'e2e automation', 'password' => wp_fast_hash( '${ automation.password }' ), 'created' => time(), 'last_used' => null, 'last_ip' => null ] ] );
update_site_option( 'using_application_passwords', true );`,
};

module.exports = { accounts, blueprintStep };
