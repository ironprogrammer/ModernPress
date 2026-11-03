// ModernPress breakpoints ("this width and narrower"). Client sites can override them through .env.
const breakpoints = {
	columnsStack: Number( process.env.BREAKPOINT_COLUMNS_STACK ?? 781 ),
	mobileNav: Number( process.env.BREAKPOINT_MOBILE_NAV ?? 959 ),
};

const height = 900;

const viewports = {
	mobile: { width: 390, height },
	// Between the breakpoints: columns side by side, mobile menu still active.
	mid: {
		width: Math.floor(
			( breakpoints.columnsStack + 1 + breakpoints.mobileNav ) / 2
		),
		height,
	},
	// Same as the chromium projects in playwright.config.js.
	desktop: { width: 1440, height },
};

/**
 * Tags for a test at one of these viewports: tests at the mobile viewport also run on the emulated iPhone.
 *
 * @param {string} name Viewport name.
 * @return {string[]} `[ '@mobile' ]` for the mobile viewport, otherwise none.
 */
const viewportTags = ( name ) => ( name === 'mobile' ? [ '@mobile' ] : [] );

module.exports = { breakpoints, viewports, viewportTags };
