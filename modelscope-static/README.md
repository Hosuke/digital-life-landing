# ModelScope Static Package

This folder is the self-contained static package for publishing Amberify / 珀存 on ModelScope.

## Files
- `index.html`
- `style.css`
- `script.js`
- `demo_1_432x960.mp4`

## Recommended Space Type
Use **Static SDK**.

## Runtime Behavior
- Trial plan: submits to `https://api.amberify.me/api/apply`, then continues onboarding in QQ.
- Full plan: does not charge on the page. It opens a mail draft to `sukebeta@outlook.com` for manual scheduling.

## Publish Notes
- Upload the contents of this folder as the root of the ModelScope static space.
- Do not rely on Google Fonts, Stripe, or Font Awesome CDN in this package.
