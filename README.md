# PMVHaven Downloader

A powerful Userscript designed to streamline the archival of video content and its associated metadata from PMVHaven.

## Features
- **One-Click Download**: Save videos directly with sanitized, organized filenames.
- **Metadata Extraction**: Automatically generates a `.json` file containing uploader info, tags, and video details.
- **Playlist Integration**: Works seamlessly on both standalone video pages and active playlist views.
- **Visual Feedback**: Includes a top-loading progress bar and custom toast notifications.

## Requirements
To use this script, you must have a Userscript manager installed in your browser:
- [Tampermonkey](https://www.tampermonkey.net/) (Recommended)
- Violentmonkey

## How to Use
Once installed, navigate to any video or playlist page on PMVHaven. Use the following keyboard combinations:

| Combination | Action |
| :--- | :--- |
| `v` + `d` | **Download Video + Metadata**: Saves the video file and the JSON metadata. |
| `v` + `i` | **Metadata Only**: Only saves the JSON metadata file. |
| `v` + `t` | **Test Script**: Triggers a notification to confirm the script is running. |

### Metadata Extraction
When you trigger a download, the script fetches the full metadata suite from the site's API. It cleans the data (removing unnecessary timeline thumbnails and vote counts) and saves it into a structured `.json` file. This allows for easy importing into personal databases or media managers.

### Latest Update: Playlist Capability
The script now features **Active Video Detection**. Previously limited to standard video URLs, the downloader can now scan playlist pages, identify which video is currently loaded or selected in the sidebar, and extract the correct video key automatically. This allows you to download entire playlists sequentially without manually navigating to each individual video page.
