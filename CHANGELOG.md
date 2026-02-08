# Changelog

All notable changes to the PMVHaven Downloader script will be documented in this file.

## [2026-02-08]

### Added
- **Playlist Page Support**: The script can now identify the active video ID while browsing a playlist URL.
- **Universal Detection**: Added fallback logic to find video IDs via metadata links and page elements if the URL is non-standard.
- **Status Test Shortcut**: Added `v + t` to verify if the script is active and listening.
- **Enhanced Toast UI**: New dark-themed notification style with high-contrast borders for better visibility.

### Modified
- **Keyboard Listener**: Moved registration to the top of the execution block to ensure shortcuts are active even if page elements load slowly.
- **Error Handling**: Improved API response validation and added specific user feedback for unauthorized (401) states.
- **Filename Sanitization**: Updated regex to ensure all illegal characters are stripped from filenames before downloading.

### Removed
- Removed strict path requirements that restricted the script from running only on `/video/` URLs.
