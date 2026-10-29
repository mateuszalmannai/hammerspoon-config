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
- **Hyper+/**: the same kind of searchable list, for the menu shortcuts of the frontmost app. Each row shows the menu path (e.g. "Edit › Find › Find Next") and its shortcut, so you can search by either; Enter picks that menu item.

## Layout

```
init.lua                      entry point: loads modules and spoons
modules/
  hotkeyCheatsheet.lua        ⌘⌥H searchable cheatsheet + bindHotkey/describe helpers
  appShortcuts.lua            Hyper+/ searchable menu shortcuts of the frontmost app
  searchPanel.lua             the dark searchable panel both of them use
  fuzzy.lua                   fuzzy matching for the cheatsheet search
  popupLayout.lua             font fitting for the Remind and Taskwarrior popups
  app_launcher.lua            launch-or-focus app hotkeys
  window_management.lua       move window to display N
  network.lua                 ping check
  misc_hotkeys.lua            clipboard, lock/sleep, console, reload, etc.
  leader.lua                  Hyper+Space leader menu (RecursiveBinder)
Spoons/                       vendored spoons (see below)
spec/                         busted unit tests (see Tests)
Makefile                      `make test`
```

### Adding a hotkey

Bind through the cheatsheet helper so the hotkey shows up in ⌘⌥H:

```lua
hotkeyCheatsheet.bindHotkey(hyper, "x", function() ... end, "What it does")
```

For hotkeys a spoon binds itself, add a description afterwards:

```lua
hotkeyCheatsheet.describe(hyper, "m", "Toggle mounted volumes on desktop")
```

To add a leader-menu entry, add it to the `keymap` table in `modules/leader.lua`.
Shared actions live in `M.actions` in `modules/misc_hotkeys.lua`, so a hotkey
and its leader entry call the same function.

## Hotkeys

### Leader menu: Hyper+Space

Press Hyper+Space, then follow the helper bar at the bottom of the screen.
Escape cancels.

| Group | Keys |
|---|---|
| `a` apps | `b` Brave, `w` WhatsApp, `f` Fantastical, `t` WezTerm, `s` Strongbox, `y` Yubico |
| `w` window | `1` / `2` / `3` move window to that display |
| `c` clipboard | `d` copy date, `e` copy epoch hex, `v` type clipboard |
| `s` system | `l` lock, `z` sleep, `k` kill Dock, `t` show time |
| `h` hammerspoon | `r` reload, `c` console, `h` cheatsheet |

### Apps

| Hotkey | App |
|---|---|
| ⌘⇧B | Brave Browser |
| ⌘⇧W | WhatsApp |
| ⌘⌥C | Fantastical |
| ⌘⌥W | WezTerm |
| ⌘⌥S | Strongbox |
| ⌘⌥Y | Yubico Authenticator |

### Windows (MiroWindowsManager)

| Hotkey | Action |
|---|---|
| Hyper+←/→/↑/↓ | Snap to that half. Press again to cycle 1/2 → 1/3 → 2/3 |
| Hyper+F | Full screen. Press again to cycle full → 3/4 → 1/2 |
| ⌘⌥1 / 2 / 3 | Move window to display 1 / 2 / 3 |

### Clipboard and text

| Hotkey | Action |
|---|---|
| ⌘⌥D | Copy today's date (`YYYY-MM-DD-`) |
| ⌘⌥T | Copy the current Unix time as uppercase hex |
| Hyper+V | Type the clipboard contents as keystrokes (for fields that block paste) |

### System

| Hotkey | Action |
|---|---|
| Hyper+L | Lock screen |
| Hyper+Z | Sleep |
| ⌘⌥K | Kill (restart) the Dock |
| ⌘⌥P | Ping 8.8.8.8 and report network quality |
| ⌥⇧T | Show the current time |
| Hyper+C | Big clock in the middle of the screen (AClock) |
| Hyper+M | Toggle mounted volumes on the desktop |
| Hyper+W | Remind calendar popup (RemindCalendar). While open: `1` one week, `2` two weeks, `m` month; Esc or click closes |
| Hyper+T | Taskwarrior popup (TaskwarriorViews) for the active context, in taskwarrior's colours. While open: `n` next, `b` weekly burndown, `h` monthly history, `s` project summary; Esc or click closes. Read-only, never syncs |
| Hyper+N | Quick note (QuickNote): one-line box; Enter adds `- <timestamp> text` to the Uncategorised section of `~/markdown/running_notes/inbx.md` (set `file` and `section` in `init.lua`), Esc cancels. Clicking away keeps the text for next time |
| Hyper+⇧N | Open the QuickNote file (`inbx.md`) in Marked, via its `mk` command-line tool |
| Hyper+G | Search box (HSearch): type `d` / `n` / `s` / `t` + Tab for dates, notes, thesaurus, Brave tabs |
| Hyper+P | Pomodoro timer (Cherry): start, or pause/resume. Shown in the menu bar while running |
| Hyper+⇧P | Pomodoro stats overlay (Cherry). Esc or click closes |
| ⌃/ | Mic mute: tap to toggle, hold for push-to-talk (MicMute) |

### Hammerspoon

| Hotkey | Action |
|---|---|
| ⌘⌥H | Hotkey cheatsheet |
| Hyper+/ | Menu shortcuts of the frontmost app |
| Hyper+Y | Hammerspoon console |
| Hyper+R | Reload config |

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
