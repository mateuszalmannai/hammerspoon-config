# Plan: HSearch in the cheatsheet's search panel

Status: not started (written 2026-10-29). Goal: HSearch (Hyper+G) looks and behaves like the ⌘⌥H hotkey cheatsheet and the Hyper+/ app-shortcuts list: dark, rounded, translucent, fuzzy-searchable.

## Why it needs a port, not a restyle

HSearch draws with `hs.chooser`, which can't be made rounded or translucent and has fixed fonts and highlight colours. `chooser:bgDark(true)` is the one-line fallback, but it stays square, solid and in Apple's style.

## Approach

Keep HSearch and its four sources (`hs_btabs.lua`, `hs_datamuse.lua`, `hs_note.lua`, `hs_time.lua`) unchanged. Replace only `spoon.HSearch.chooser` with a stand-in object that has the same methods but draws with `modules/searchPanel.lua`.

The sources never draw; they only call methods on `spoon.HSearch.chooser`. Methods used across `Spoons/HSearch.spoon/*.lua` (as of this plan), which the stand-in must implement:

- `choices(list)`: set the rows. Rows are hs.chooser tables: `text`, `subText`, `image` (an `hs.image`), plus extra fields HSearch uses (`output`, `arg`, `keyword`, `uuid`). Passing `nil` clears them.
- `query()` / `query(str)`: read or set the search text.
- `queryChangedCallback(fn)` / `queryChangedCallback()`: called on each keystroke; with no argument, removes it.
- `refreshChoicesCallback()`: re-render after `choices` is set from an async callback (the Thesaurus source does this).
- `selectedRowContents()`: the highlighted row's table (used by `switchSource` to pick a source from the overview list).
- `show()`, `hide()`, `isVisible()`.
- `rows(n)` and `searchSubText(bool)`: can be accepted and mostly ignored. `searchSubText(true)` means the fuzzy search should also match `subText`.

`init.lua` (repo root) also uses `spoon.HSearch.chooser:isVisible()` and `:query(...)` in the HSearch rows of the ⌘⌥H cheatsheet, so those keep working through the stand-in.

## Changes to `modules/searchPanel.lua`

- Optional second line (`subText`) and icon (`image`) per row. Send the icon to the page as a data URL (`hs.image:encodeAsURLString()`), cached per image so it isn't re-encoded on every keystroke. Rows without them must look exactly as today, so the cheatsheet and app-shortcuts lists don't change.
- A mode where the panel doesn't filter: while a `queryChangedCallback` is set, show the rows as given and leave matching to the source (Dates and Thesaurus compute their own results). Otherwise fuzzy-filter as today, on `text` and, if `searchSubText` is on, `subText`.
- Tab: post a `tab` message from the page instead of HSearch binding a system-wide Tab hotkey while it's open.
- Tell the owner about the highlighted row (needed for `selectedRowContents`) and about query changes (for `queryChangedCallback`).

## Changes to `Spoons/HSearch.spoon/init.lua`

- In `obj:init()`, build the stand-in instead of `hs.chooser.new`, passing the same on-choose function (it disables the source hotkeys and runs `obj.output_pool[chosen.output](chosen.arg)`).
- Replace the global Tab hotkey (`obj.trigger`) with the panel's `tab` message calling `obj:switchSource()`.
- Leave `loadSources`, `switchSource` and the sources' own hotkeys as they are.

## Risks to check live, one source at a time

- Thesaurus (`s`): results arrive from the network after typing, via `choices` plus `refreshChoicesCallback`. The list must update while the user is still typing, without resetting the typed text.
- Notes (`n`): binds a plain Return hotkey while its source is active to save the note. Check that it still saves and clears the box, and that Enter on a listed note still removes it (`noteremove` output).
- Brave tabs (`t`) and Dates (`d`): choosing a row runs an action in another app (switch tab, or type the date via the `keystrokes` output). Focus must be back in the previous app first; the cheatsheet uses a 0.2 s `hs.timer.doAfter` for the same reason.
- The ⌘⌥H rows "HSearch › Dates / Notes / Thesaurus / Brave tabs" must still open HSearch on that source.
- Reload with the panel open: `searchPanel` already closes its panels on shutdown.

## Tests

- Busted spec for the plain-Lua part of the stand-in: which rows are shown for a given query, with and without a `queryChangedCallback`, and with `searchSubText` on or off.
- `make test` must stay green.

## Size

Roughly 150–200 lines, mostly the stand-in object plus the row and Tab additions to `searchPanel.lua`.
