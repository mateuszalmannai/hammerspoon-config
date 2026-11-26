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
5. Optional, on a Mac with a notch: reduce the gap between menu bar icons, so the Hammerspoon items (Wi-Fi name, SpeedMenu, MicMute) aren't hidden behind the notch. Log out and back in for it to take effect:
   ```sh
   defaults -currentHost write -globalDomain NSStatusItemSpacing -int 6
   defaults -currentHost write -globalDomain NSStatusItemSelectionPadding -int 6
   ```
   To go back to the macOS default spacing, run the same commands with `delete` instead of `write` (and without `-int 6`).

On load you get a "Hammerspoon config loaded" alert and a sound.

The app hotkeys assume Brave, Microsoft Teams, WhatsApp, Fantastical, WezTerm, Strongbox and
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
| ⌘⇧I | Launch or focus IntelliJ IDEA |
| ⌘⇧T | Launch or focus Microsoft Teams |
| ⌘⇧W | Launch or focus WhatsApp |
| ⌘⌥C | Launch or focus Fantastical |
| ⌘⌥M | Launch or focus MailMate |
| ⌘⌥O | Launch or focus Microsoft Outlook |
| ⌘⌥S | Launch or focus Strongbox |
| ⌘⌥W | Launch or focus WezTerm |
| ⌘⌥Y | Launch or focus Yubico Authenticator |

### Tools

| Hotkey | Action |
|---|---|
| Hyper+C | Show big clock (AClock) |
| Hyper+D | Decision tools popup: show or hide (⌘1–⌘8 switch tools; Esc or click elsewhere closes) |
| Hyper+G | HSearch (d/n/s/t + Tab: dates, notes, thesaurus, Brave tabs) |
| Hyper+G → d | HSearch › Dates |
| Hyper+G → n | HSearch › Notes |
| Hyper+G → s | HSearch › Thesaurus |
| Hyper+G → t | HSearch › Brave tabs |
| Hyper+K | Countdowns: add, edit or remove one (topic and date) |
| Hyper+M | Toggle mounted volumes on desktop |
| Hyper+N | Quick note to inbx.md (Uncategorised): Enter saves, Esc cancels |
| Hyper+O | VPN menu: connect or disconnect a vpn-switch tunnel (Esc closes) |
| Hyper+O → 1 | Dev on/off |
| Hyper+O → 2 | Office on/off |
| Hyper+O → 3 | Prod on/off |
| Hyper+O → 4 | Replica on/off |
| Hyper+O → o | Open VPN Switch |
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
| Hyper+Space | Leader menu (apps, window, clipboard, system, timebutler, hammerspoon) |
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
| Hyper+Space → t → b | Timebutler › Vacation balance |
| Hyper+Space → t → e | Timebutler › Recent entries |
| Hyper+Space → t → p | Timebutler › Pause clock |
| Hyper+Space → t → r | Timebutler › Resume clock |
| Hyper+Space → t → s | Timebutler › Start clock |
| Hyper+Space → t → w | Timebutler › Toggle widget |
| Hyper+Space → t → x | Timebutler › Stop clock (asks) |
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
- **Decision tools** (`Spoons/DecisionTools.spoon`): PMI, Eisenhower matrix,
  paired comparison, decision matrix, Pareto, risk analysis, cost-benefit and
  history, in one panel. They're a plain HTML/JS web app in the spoon's `web/`
  folder, served by Hammerspoon on `http://localhost:47823` (only this Mac can
  reach it).
  - What you enter is kept in the panel's local storage, which belongs to that
    port: change `spoon.DecisionTools.port` and the tools start empty.
  - Export saves to `~/Downloads` (set `spoon.DecisionTools.downloadDir`).
  - Import opens a file dialog.

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
- **MountedVolumes**: disks with free-space pie charts in the top-left corner of the desktop.
- **RemindAgenda**: today's and tomorrow's reminders from remind at the bottom left of the desktop, just above the HCalendar strip; it grows upwards as the number of events changes, and CircleClock above it moves up with it. Past events are dimmed, the current one is marked "(now)" and the next one shows a countdown. It re-runs remind every 10 minutes, when a file in `~/markdown/synched_reminders` changes and after wake; clicking it opens the Hyper+W calendar popup.
- **TaskwarriorSummary**: below MountedVolumes (it moves down when more disks are mounted), taskwarrior's state for the active context: how many tasks are overdue and due today, and the top 5 tasks of the `next` report with project and due date ("6d late", "today", "in 3d"). Overdue counts and tasks are red. It re-reads the tasks every 2 minutes and after wake, without changing or syncing anything; clicking it opens the Hyper+T popup.
- **VPNStatus**: the vpn-switch tunnels below TaskwarriorSummary on the left edge of the desktop, each with a coloured dot: green when the tunnel is up and the service behind it answers (a TCP connect to a host and port you give per tunnel), amber when the tunnel is up but the service doesn't answer, red when the tunnel is down. A tunnel marked `onDemand` (connected only when needed) shows a grey "off" when down instead of red; one marked `optional` only appears while connected. It checks every 30 seconds, when a tunnel starts or stops, when the network changes and after wake; clicking it opens VPN Switch and checks again. The tunnel list names internal hosts, so it lives in `local/vpn_tunnels.lua`, which is git-ignored: copy `local/vpn_tunnels.example.lua` to start one. Without it the widget isn't loaded.
- **TimebutlerStatus**: the Timebutler clock below VPNStatus on the left edge of the desktop (straight below TaskwarriorSummary when the VPN widget isn't loaded), read through `util tb ... --json`:
    - a coloured dot with the clock's state: green "running since 08:48", amber "paused since 12:10", grey "stopped";
    - today's worked time against the daily target, with a progress bar in TimeFlow's style (its colour gradient, bright over the part done); the running session is added to the saved entries and keeps counting between reads;
    - while paused, how long the pause has lasted ("paused since 12:10 · 0h 12m") and a second bar for today's break so far (saved entries, earlier pauses and this one) against the break the law asks for: 30 minutes, 45 past 9 hours of work;
    - the vacation days used this year (approved and pending) out of the year's total, with the percentage and a bar in the same style.

  It reads the clock every 2 minutes and the balance every hour, both again after wake. Clicking it starts, pauses or resumes the clock, whichever fits its state; Leader menu → t has the other actions. `util` reads its API token through `secret` in `~/.local/bin`, so the spoon passes its own PATH (`spoon.TimebutlerStatus.path`).
- **Countdown**: countdowns to dates you pick, in the style of TimeFlow, stacked upwards from the bottom-right corner of the desktop. Each shows its topic and date, the years, months and days left (zero units left out), and hours, minutes, seconds and the total number of days below; updated every second. A date can be one-off (DD.MM.YYYY) or every year (DD.MM., e.g. 24.12. for Christmas, which moves on to next year once the day is over). On the day it says "Today!", and a one-off date that has passed says how many days ago. Hyper+K opens a list, in the style of the hotkey cheatsheet, to add one (asks for the topic, then the date, in the same style), edit one (the same two steps, filled in with its current topic and date) or remove one. They're personal, so they're saved in `local/countdowns.json`, which is git-ignored; add `"startDate": "YYYY-MM-DD"` to an entry there to get a TimeFlow-style bar showing how much of the way since then is done.
- **Desktop widgets**: CircleClock, TimeFlow, HCalendar and BingDaily (daily
  Bing wallpaper). All desktop widgets sit in one column on the left edge: MountedVolumes, TaskwarriorSummary, VPNStatus and TimebutlerStatus at the top; CircleClock, RemindAgenda, HCalendar (month) and TimeFlow (year) at the bottom. The exception is Countdown, whose widgets stack up from the bottom-right corner.
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
`Spoons/DecisionTools.spoon/files.lua`,
`Spoons/RemindAgenda.spoon/agenda.lua`,
`Spoons/VPNStatus.spoon/status.lua`,
`Spoons/TaskwarriorSummary.spoon/summary.lua`,
`Spoons/TimebutlerStatus.spoon/status.lua`,
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

Code that does call `hs.*` can be tested by stubbing just the functions it uses: `spec/network_spec.lua` tests the Wi-Fi menu title with fake `hs.*` functions: `network.wifiTitle` with fake `hs.wifi` and `hs.location` for each case (connected, Wi-Fi off, no Location access, not connected), and `network.styledWifiTitle` (small font for long titles, text colour in light and dark mode) with fake `hs.host` and `hs.styledtext`.

## License

MIT, see [LICENSE](LICENSE). The bundled spoons in `Spoons/` belong to their
respective authors and are MIT-licensed as noted in each spoon's `init.lua`.
