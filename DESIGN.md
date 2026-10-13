# Jeffy Assistant design

Direction: a calm midnight-blue workstation. Voice is the primary input; no chat composer or message feed.

- Color: background `#081225`, sidebar `#091426`, surface `#0D1B31`, outline `#1C2D47`, primary ink `#E8F0FC`, secondary ink `#8B9BB4`, action `#B2D8FF`.
- Typography: Segoe UI Variable Text on Windows, compact captions, restrained large greeting. No external font requests.
- Layout: fixed-width sidebar, flexible work area, main voice surface with a narrower help column. Cards align to the same horizontal grid. At narrow widths the sidebar becomes an icon rail and cards stack.
- Components: 17px surface radius, 10px controls, explicit focus outlines, disabled and error states, native modal focus handling.
- Motion: a wire globe responds to microphone amplitude and speaking/processing states. Reduced-motion users get a fixed globe. Decorative visualisation is hidden from accessibility APIs.
- Product states are literal: “connected” means a supplied key, not a verified network call. “Check AI” is the live connection check. Missing offline models, microphones, applications and API limits have explicit errors.
