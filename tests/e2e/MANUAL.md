# Manual test checklist

Checks that Playwright and axe can't reliably cover. Run them for new blocks, header/nav changes, and WP major upgrades. The last column notes whether a check could move to automation later.

## Assistive technology

| Check | How | Automation outlook |
|---|---|---|
| Screen reader announcements make sense in context | VoiceOver (Safari, iOS) and NVDA (Firefox or Chrome) on header, nav, tabs, carousel, accordion, and forms | Partial. ARIA states are automated, but whether the result is understandable stays manual. |
| Reading order matches visual order and meaning | Screen reader linear read and Tab through the page | Partial. Tab order can be asserted per component. |
| Live regions announce once, at the right time | Form errors, announcements, search results | Partial |

## Content and visuals

| Check | How | Automation outlook |
|---|---|---|
| Alt text is accurate, or empty when decorative | Review images in fixture and real content (the `alt-audit` skill helps triage) | Partial. Missing or filename-like alt can be flagged, but quality can't. |
| Contrast of text over images, gradients, and video | Visual review with a contrast picker | Unlikely |
| 400% zoom and 320px reflow are usable | Browser zoom and narrow viewport | Partial. Horizontal scroll can be asserted, but usability can't. |
| Text spacing overrides (WCAG 1.4.12) don't clip content | Text spacing bookmarklet | Possible with an injected stylesheet and screenshots |
| Motion respects reduced-motion preference | OS setting on, then check animations, carousel autoplay, and marquee | Likely. Playwright can emulate `prefers-reduced-motion`. |
| Design fidelity | Compare against Figma | Unlikely. This is design QA. |

## Devices and browsers

| Check | How | Automation outlook |
|---|---|---|
| Real iOS Safari behavior (zoom on focus, sticky header, mobile menu) | Physical device or simulator | Partial. WebKit emulation covers layout but not device quirks. |
| Touch and swipe on carousel and marquee | Physical device | Unlikely |

## Editor and author experience

| Check | How | Automation outlook |
|---|---|---|
| Block controls are understandable to content authors | Walk through inserting and configuring each block | Unlikely |
| Pattern library browsing and previews are usable | Insert patterns from each category | Partial. Insertion without errors can be automated. |
| Editor and front end look the same | Compare the editor canvas with the front end per block | Possible with paired screenshots |
