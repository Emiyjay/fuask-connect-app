# FUASK Connect — UI Blueprint

## Product direction

**Positioning:** Your campus. Your community.  
**Design goal:** A polished, student-first campus app that feels connected, useful, safe, and easy to navigate on a phone.

The UI should combine the richer campus-feed experience with the clarity of a modern university platform. Keep the existing Expo Router routes, API contracts, authentication, role checks, and backend behavior intact while the interface evolves.

## Visual system

| Token | Value | Use |
| --- | --- | --- |
| App background | `#07110E` | Main screen canvas |
| Surface | `#0D1B16` | Cards, sheets, panels |
| Raised surface | `#12271D` | Segmented controls and secondary controls |
| Primary accent | `#38D39F` | Main actions and selected states |
| Accent dark | `#0E3A2C` | Hero and branded panels |
| Main text | `#E8F5ED` | Titles and important copy |
| Body text | `#D5E7DC` | Paragraphs |
| Muted text | `#9BB7AA` | Supporting labels |
| Subtle text | `#80998C` | Hints and metadata |
| Border | `#1F3A2E` | Card outlines and dividers |

### Component rules

- Use a consistent 12–22 px corner-radius range for controls and cards.
- Use 16–20 px horizontal screen padding.
- Reserve the mint accent for primary actions, active navigation, and meaningful status.
- Keep text readable against dark surfaces; metadata should not compete with titles.
- Give interactive elements a clear label and a comfortable touch target.
- Every shortcut must navigate to a real screen; avoid decorative controls that do nothing.
- Preserve loading, empty, error, refresh, and permission states when redesigning existing flows.

## Screen blueprint

### 1. Home / campus feed
- Compact brand header and menu access.
- Campus-wide / cohort scope selector with existing permission messaging.
- Branded hero panel: “Learn. Connect. Grow.”
- Quick links to Learn, Clubs, and Marketplace.
- Feed cards with author, post content/media, pinned state, likes, comments, and cohort messaging.
- Floating compose action only when the current scope permits posting.

### 2. Learn
- Clear page title and upload action.
- Segmented views for General, Cohort, and My Materials.
- Material rows/cards with title, course code, file type, uploader/context, and open/download affordance.
- Upload sheet with title, course code, visibility scope, and selected file.
- Useful empty state when no resources exist.

### 3. Clubs
- Separate “My Clubs” and “Discover” sections.
- Clear membership state and role badge.
- Join action with progress state and feedback.
- Empty states that explain what the student can do next.

### 4. Marketplace
- Business cards with image, verification/featured status, category, location, description, and contact actions.
- A clear “List Business” entry point and a short, well-spaced submission form.
- Never imply a listing is verified until the backend says it is.

### 5. Profile
- Identity and department information first.
- Clear profile actions and account settings.
- Consistent typography, spacing, and safe-area behavior.

### 6. Shared navigation
- Five primary destinations: Home, Learn, Clubs, Market, Profile.
- Persistent bottom tabs with clear active/inactive states.
- Do not add a tab for a feature that does not yet have a reliable route.

## Implementation sequence

1. **Foundation:** unify tokens, typography, spacing, card surfaces, buttons, and tab navigation.
2. **Home:** complete the branded header, hero, real quick navigation, and readable feed hierarchy.
3. **Core screens:** align Learn, Clubs, Marketplace, and Profile with the same component language.
4. **Interaction polish:** empty/loading/error states, form validation feedback, and accessibility labels.
5. **Verification:** run `npm run lint`, TypeScript checks if configured, and device checks on a small Android screen and a larger screen before merging.

## Current implementation status

- [x] Dark forest-green and mint palette applied to the existing main screens.
- [x] Home feed now includes a branded hero and working shortcuts to Learn, Clubs, and Marketplace.
- [x] Existing feed API calls, posting permissions, media, likes, comments, and navigation remain in place.
- [ ] Complete visual pass across every screen and shared modal.
- [ ] Automated lint/type validation.
- [ ] Android/web device verification.

This document describes the intended UI and acceptance criteria. It does not claim that unimplemented screens or untested behavior are complete.
