# Hammerspoon config

My [Hammerspoon](https://www.hammerspoon.org/) setup: app launching, window
management, a leader-key menu, clipboard helpers, and a few menu bar / desktop
widgets.

**Hyper** below means `⌃⌥⌘` (Ctrl+Option+Cmd).

## Setup on a new Mac

1. Install Hammerspoon:
   ```sh
   brew install --cask hammerspoon
   ```
2. Clone this repo into `~/.hammerspoon` (move any existing one aside first):
   ```sh
   git clone https://github.com/mateuszalmannai/hammerspoon-config.git ~/.hammerspoon
   ```
3. Launch Hammerspoon and grant it **Accessibility** permission
   (System Settings → Privacy & Security → Accessibility). Hotkeys and window
   management do not work without it.
4. Optional: install the `hs` command-line tool by running this once in the
   Hammerspoon console (Hyper+Y):
   ```lua
   hs.ipc.cliInstall("/opt/homebrew")
   ```

On load you get a "Hammerspoon config loaded" alert and a sound.

The app hotkeys assume Brave, WhatsApp, Fantastical, WezTerm, Strongbox and
Yubico Authenticator are installed. Edit `modules/app_launcher.lua` and
`modules/leader.lua` to change them.

## Finding your hotkeys

- **⌘⌥H**: searchable list of every active Hammerspoon hotkey with a
  description. Type to fuzzy-search descriptions and shortcuts (e.g. `rcal`
  finds "Remind calendar", `⌘⌃⌥` lists the Hyper bindings). Enter runs the
  selected hotkey; Esc closes. It's built from the live hotkey list, so it's
  always current.
- The ⌘⌥H list also has a row for every leader-menu action, e.g. "System › Lock screen" with `⌘⌃⌥SPACE S L`, so searching "lock" finds it even if you've forgotten the key sequence. Enter runs the action directly. The rows are built from the leader's own keymap in `modules/leader.lua`, so they stay in sync.
- It also has a row for each key inside the Remind, Taskwarrior and HSearch popups, e.g. "Remind calendar › Two weeks" with `⌘⌃⌥W 2` (open the popup, then press 2). Enter opens the popup straight on that view or source. The Remind and Taskwarrior rows come from each spoon's `views` list, so they stay in sync; the HSearch sources are listed in `init.lua`.
- With the search box empty, the list is split into sections (Windows, Apps, Tools, Clipboard, System, Hammerspoon, Leader menu) for browsing; typing switches to one list ranked by match. A hotkey's section is set by calling `hotkeyCheatsheet.group("Name")` before binding it, and the section order is `hotkeyCheatsheet.groupOrder` in `modules/hotkeyCheatsheet.lua`.
- **Hyper+/**: the same kind of searchable list, for the menu shortcuts of the frontmost app. Each row shows the menu path (e.g. "Edit › Find › Find Next") and its shortcut, so you can search by either; Enter picks that menu item.

## Layout

```
init.lua                      entry point: loads modules and spoons
modules/
  hotkeyCheatsheet.lua        ⌘⌥H searchable cheatsheet + bindHotkey/describe helpers
  appShortcuts.lua            Hyper+/ searchable menu shortcuts of the frontmost app
  searchPanel.lua             the dark searchable panel both of them use
  hotkeyReadme.lua            `make readme`: writes the README's hotkey tables from the cheatsheet
  fuzzy.lua                   fuzzy matching for the cheatsheet search
  popupLayout.lua             font fitting for the Remind and Taskwarrior popups
  app_launcher.lua            launch-or-focus app hotkeys
  window_management.lua       move window to display N
  network.lua                 ping check
  misc_hotkeys.lua            clipboard, lock/sleep, console, reload, etc.
  leader.lua                  Hyper+Space leader menu (RecursiveBinder)
Spoons/                       vendored spoons (see below)
spec/                         busted unit tests (see Tests)
Makefile                      `make test`, `make readme`
```

### Adding a hotkey

Bind through the cheatsheet helper so the hotkey shows up in ⌘⌥H:

```lua
hotkeyCheatsheet.group("Tools")  -- the ⌘⌥H section for the hotkeys bound after this
hotkeyCheatsheet.bindHotkey(hyper, "x", function() ... end, "What it does")
```

For hotkeys a spoon binds itself, add a description afterwards:

```lua
hotkeyCheatsheet.describe(hyper, "m", "Toggle mounted volumes on desktop")
```

To add a leader-menu entry, add it to the `keymap` table in `modules/leader.lua`.

Then run `make readme` to update the hotkey tables below.
Shared actions live in `M.actions` in `modules/misc_hotkeys.lua`, so a hotkey
and its leader entry call the same function.

## Hotkeys

Hyper is ⌘⌃⌥. An arrow means "then": Hyper+Space → s → l is Hyper+Space, then `s`, then `l`. For the leader menu (Hyper+Space), a helper bar at the bottom of the screen shows the next keys; Escape cancels.

The tables below are generated from the ⌘⌥H cheatsheet with `make readme`, so don't edit them by hand: change the description in the code and rerun it.

<!-- hotkeys:start -->

### Windows

| Hotkey | Action |
|---|---|
| Hyper+↓ | Snap window to bottom (repeat: 1/2, 1/3, 2/3) |
| Hyper+F | Full screen (repeat: full, 3/4, 1/2) |
| Hyper+← | Snap window to left (repeat: 1/2, 1/3, 2/3) |
| Hyper+→ | Snap window to right (repeat: 1/2, 1/3, 2/3) |
| Hyper+↑ | Snap window to top (repeat: 1/2, 1/3, 2/3) |
| ⌘⌥1 | Move window to display 1 |
| ⌘⌥2 | Move window to display 2 |
| ⌘⌥3 | Move window to display 3 |

### Apps

| Hotkey | Action |
|---|---|
| ⌘⇧B | Launch or focus Brave Browser |
| ⌘⇧W | Launch or focus WhatsApp |
| ⌘⌥C | Launch or focus Fantastical |
| ⌘⌥S | Launch or focus Strongbox |
| ⌘⌥W | Launch or focus WezTerm |
| ⌘⌥Y | Launch or focus Yubico Authenticator |

### Tools

| Hotkey | Action |
|---|---|
| Hyper+C | Show big clock (AClock) |
| Hyper+G | HSearch (d/n/s/t + Tab: dates, notes, thesaurus, Brave tabs) |
| Hyper+G → d | HSearch › Dates |
| Hyper+G → n | HSearch › Notes |
| Hyper+G → s | HSearch › Thesaurus |
| Hyper+G → t | HSearch › Brave tabs |
| Hyper+M | Toggle mounted volumes on desktop |
| Hyper+N | Quick note to inbx.md (Uncategorised): Enter saves, Esc cancels |
| Hyper+P | Pomodoro timer: start, or pause/resume (Cherry) |
| Hyper+T | Taskwarrior popup: show or hide (n/b/h/s: next, burndown, history, summary; Esc or click closes) |
| Hyper+T → b | Taskwarrior › Burndown |
| Hyper+T → h | Taskwarrior › History |
| Hyper+T → n | Taskwarrior › Next |
| Hyper+T → s | Taskwarrior › Summary |
| Hyper+W | Remind calendar popup: show or hide (1/2/m: week, two weeks, month; Esc or click closes) |
| Hyper+W → 1 | Remind calendar › Week |
| Hyper+W → 2 | Remind calendar › Two weeks |
| Hyper+W → m | Remind calendar › Month |
| Hyper+⇧N | Open inbx.md in Marked (mk) |
| Hyper+⇧P | Pomodoro stats overlay: show or hide (Esc or click also closes it) (Cherry) |

### Clipboard

| Hotkey | Action |
|---|---|
| Hyper+V | Type clipboard contents: circumvent pasteblockers |
| ⌘⌥D | Copy date to clipboard |
| ⌘⌥T | Copy unix epoch hex value to clipboard |

### System

| Hotkey | Action |
|---|---|
| ⌃/ | Toggle mic mute (hold for push-to-talk) |
| Hyper+L | Lock screen |
| Hyper+Z | Put system to sleep |
| ⌘⌥K | Kill Dock |
| ⌘⌥P | Check network speed |
| ⌥⇧T | Show current time |

### Hammerspoon

| Hotkey | Action |
|---|---|
| Hyper+/ | Search menu shortcuts of frontmost app |
| Hyper+R | Reload Hammerspoon Config |
| Hyper+Y | Toggle Hammerspoon Console |
| ⌘⌥H | Toggle Hammerspoon cheatsheet |

### Leader menu

| Hotkey | Action |
|---|---|
| Hyper+Space | Leader menu (apps, window, clipboard, system, hammerspoon) |
| Hyper+Space → a → b | Apps › Brave |
| Hyper+Space → a → f | Apps › Fantastical |
| Hyper+Space → a → s | Apps › Strongbox |
| Hyper+Space → a → t | Apps › WezTerm |
| Hyper+Space → a → w | Apps › WhatsApp |
| Hyper+Space → a → y | Apps › Yubico |
| Hyper+Space → c → d | Clipboard › Copy date |
| Hyper+Space → c → e | Clipboard › Copy epoch hex |
| Hyper+Space → c → v | Clipboard › Type clipboard |
| Hyper+Space → h → c | Hammerspoon › Console |
| Hyper+Space → h → h | Hammerspoon › Cheatsheet |
| Hyper+Space → h → r | Hammerspoon › Reload |
| Hyper+Space → s → k | System › Kill Dock |
| Hyper+Space → s → l | System › Lock screen |
| Hyper+Space → s → t | System › Show time |
| Hyper+Space → s → z | System › Sleep |
| Hyper+Space → w → 1 | Window › To display 1 |
| Hyper+Space → w → 2 | Window › To display 2 |
| Hyper+Space → w → 3 | Window › To display 3 |

<!-- hotkeys:end -->

### More about some hotkeys

- **Copy date** copies today's date as `YYYY-MM-DD-`.
- **Copy unix epoch hex** copies the current Unix time as uppercase hex.
- **Type clipboard contents** types the clipboard as keystrokes, for fields that block paste.
- **Kill Dock** restarts the Dock.
- **Check network speed** pings 8.8.8.8 and reports the network quality.
- **Taskwarrior popup** shows the active context, in taskwarrior's colours. It's read-only and never syncs.
- **Quick note**:
  - Enter adds `- <timestamp> text` to the Uncategorised section of `~/markdown/running_notes/inbx.md`; set `file` and `section` in `init.lua`.
  - Clicking away keeps the text for next time.
- **Pomodoro timer** (Cherry) is shown in the menu bar while running.

## Automatic behaviour

- **Auto-reload**: saving any `.lua` file in `~/.hammerspoon` reloads the
  config, so Hyper+R is rarely needed. Other changes (e.g. Cherry writing
  `cherry.db`) don't trigger a reload.
- **Cherry**: finished and abandoned pomodoros are logged to `cherry.db`
  (SQLite, git-ignored) for the stats overlay.
- **SpeedMenu**: upload and download speed in the menu bar. It rescans when the
  network changes (Wi-Fi, Ethernet, VPN) and when switching between light and
  dark mode.
- **MicMute**: microphone status in the menu bar.
- **MountedVolumes**: disks with free-space pie charts on the desktop.
- **Desktop widgets**: CircleClock, TimeFlow, HCalendar and BingDaily (daily
  Bing wallpaper).
- **FadeLogo**: the Hammerspoon logo fades in on load.

## Spoons

Spoons are committed in `Spoons/` so the config works offline and on a fresh
machine. Spoons loaded with `Install:andUse(...)` in `init.lua` are fetched by
SpoonInstall if they're missing. Spoons loaded with `hs.loadSpoon(...)` must
already be in `Spoons/`.

Installed but not currently used: MouseCircle, ReloadConfiguration,
TimeMachineProgress.

## Tests

Logic that doesn't need `hs.*` lives in plain Lua files inside the spoon
or module (`Spoons/Cherry.spoon/days.lua`,
`Spoons/TaskwarriorViews.spoon/ansi.lua`, `Spoons/QuickNote.spoon/insert.lua`,
`modules/popupLayout.lua`,
`modules/fuzzy.lua`) and is tested
with
[busted](https://lunarmodules.github.io/busted/); specs are in `spec/`.
Hammerspoon runs Lua 5.4, so install busted for 5.4 rather than Homebrew's
default `lua`:

```sh
brew install lua@5.4 luarocks
luarocks --lua-version 5.4 --lua-dir "$(brew --prefix lua@5.4)" install busted
make test
```

`make test` pins `TZ=Europe/Berlin` so the daylight-saving cases are
deterministic.

## License

MIT, see [LICENSE](LICENSE). The bundled spoons in `Spoons/` belong to their
respective authors and are MIT-licensed as noted in each spoon's `init.lua`.
