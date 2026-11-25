--- === VPNStatus ===
---
--- Desktop widget showing which vpn-switch tunnels are up and whether the
--- service behind each one answers (a TCP connect to host:port), e.g.
--- "dev  Bitbucket ✓". A tunnel counts as up while its openvpn process runs;
--- the management sockets aren't used because the VPN Switch app holds them.

local canvas = require("hs.canvas")
local task   = require("hs.task")
local status = dofile(hs.spoons.resourcePath("status.lua"))

local obj = {
    name    = "VPNStatus",
    version = "0.1",
    license = "MIT - https://opensource.org/licenses/MIT",
}
obj.__index = obj

--- VPNStatus.tunnels
--- Variable
--- Tunnels to show, in order: { id = vpn-switch tunnel id, label = ...,
--- target = name of what's behind it, probe = "host:port" to connect to,
--- onDemand = true for a tunnel normally off (shown grey rather than red
--- when down), optional = true to show the row only while the tunnel is up }.
obj.tunnels = {}

--- VPNStatus.runDir
--- Variable
--- vpn-switch's run directory (pid files appear and vanish as tunnels start
--- and stop, which triggers a refresh).
obj.runDir = "/usr/local/var/vpn-switch"

--- VPNStatus.refreshInterval
--- Variable
--- Seconds between checks.
obj.refreshInterval = 30

--- VPNStatus.probeTimeout
--- Variable
--- Seconds to wait for a probe's TCP connect.
obj.probeTimeout = 3

--- VPNStatus.minWidth
--- Variable
--- Minimum width of the widget.
obj.minWidth = 200

--- VPNStatus.font / backgroundColor / borderColor / textColor / stateColors
--- Variable
--- Styling, matching the other desktop widgets.
obj.font = { name = "Menlo", boldName = "Menlo-Bold", size = 11 }
obj.backgroundColor = { hex = "#000000", alpha = 0.25 }
obj.borderColor = { hex = "#FFFFFF", alpha = 0.1 }
obj.textColor = { hex = "#FFFFFF", alpha = 0.7 }
obj.stateColors = {
    ok   = { hex = "#5FD068", alpha = 0.9 },
    warn = { hex = "#FFB347", alpha = 0.9 },
    down = { hex = "#FF7878", alpha = 0.9 },
    off  = { hex = "#FFFFFF", alpha = 0.3 },
}

--- VPNStatus.onClick
--- Variable
--- Function called when the widget is clicked, or nil.
obj.onClick = nil

--- VPNStatus.onLayout
--- Variable
--- Function called with the widget's frame each time it is drawn (its height
--- changes as optional tunnels come and go), e.g. to place a widget below
--- it; or nil.
obj.onLayout = nil

local padding = 10

local function styled(text, color, bold)
    return hs.styledtext.new(text, {
        font = { name = bold and obj.font.boldName or obj.font.name, size = obj.font.size },
        color = color,
    })
end

function obj:_render()
    local labelWidth = 0
    for _, t in ipairs(self.tunnels) do labelWidth = math.max(labelWidth, utf8.len(t.label)) end

    local text = styled("VPN", { hex = "#FFFFFF", alpha = 0.45 }, true)
    for _, t in ipairs(self.tunnels) do
        local row = status.row(t, self._running and self._running[t.id], self._reachable[t.id])
        if row then
            local label = row.label .. string.rep(" ", labelWidth - utf8.len(row.label))
            local dim = (row.state == "down" or row.state == "off") and 0.45 or self.textColor.alpha
            text = text .. styled("\n● ", self.stateColors[row.state])
                        .. styled(label .. "  " .. row.detail, { hex = self.textColor.hex, alpha = dim })
        end
    end
    if not self._running then
        text = text .. styled("\nchecking…", { hex = "#FFFFFF", alpha = 0.35 })
    end

    local c = self.canvas
    local size = c:minimumTextSize(text)
    local w = math.max(self.minWidth, math.ceil(size.w) + 4 + 2 * padding)
    local h = math.ceil(size.h) + 2 * padding
    local anchor = self._topLeft or { x = 20, y = hs.screen.mainScreen():frame().y + 20 }
    c:frame({ x = anchor.x, y = anchor.y, w = w, h = h })
    c[2].frame = { x = padding, y = padding, w = w - 2 * padding, h = h - 2 * padding }
    c[2].text = text
    if self.onLayout then self.onLayout(c:frame()) end
end

function obj:_probe(t)
    local host, port = status.splitProbe(t.probe)
    if not host then return end
    local key = t.id
    if self._probes[key] and self._probes[key]:isRunning() then return end
    -- nc -z: connect only; -G: connect timeout in seconds (macOS nc)
    self._probes[key] = task.new("/usr/bin/nc", function(code)
        self._probes[key] = nil
        local reachable = code == 0
        if self._reachable[key] ~= reachable then
            self._reachable[key] = reachable
            if self.canvas then self:_render() end
        end
    end, { "-z", "-G", tostring(self.probeTimeout), host, tostring(port) })
    self._probes[key]:start()
end

--- VPNStatus:refresh()
--- Method
--- Checks which tunnels run and probes their targets, then redraws.
function obj:refresh()
    if self._ps and self._ps:isRunning() then return self end
    -- pgrep rather than ps: hs.task stalls on ps's large output. pgrep exits
    -- 1 when nothing matches, which just means no tunnel is running.
    self._ps = task.new("/usr/bin/pgrep", function(code, stdout)
        if code == 0 or code == 1 then
            self._running = status.runningTunnels(stdout)
            if self.canvas then self:_render() end
        end
    end, { "-fl", "vpn-switch/openvpn" })
    self._ps:start()
    for _, t in ipairs(self.tunnels) do
        if t.probe then self:_probe(t) end
    end
    return self
end

--- VPNStatus:setTopLeft(point)
--- Method
--- Puts the widget's top-left corner at `point` ({x=, y=}).
function obj:setTopLeft(point)
    self._topLeft = point
    if self.canvas then self:_render() end
    return self
end

--- VPNStatus:start()
--- Method
--- Shows the widget and starts checking.
function obj:start()
    if self.canvas then return self end
    self._reachable, self._probes = {}, {}
    local c = canvas.new({ x = 0, y = 0, w = self.minWidth, h = 50 })
    c:behaviorAsLabels({ "canJoinAllSpaces" })
    c:level(canvas.windowLevels.desktopIcon + 1)
    c[1] = { type = "rectangle", action = "strokeAndFill", fillColor = self.backgroundColor,
             strokeColor = self.borderColor, strokeWidth = 1,
             roundedRectRadii = { xRadius = 10, yRadius = 10 }, trackMouseUp = true }
    c[2] = { type = "text", text = "", trackMouseUp = true }
    c:mouseCallback(function()
        if self.onClick then self.onClick() end
        self:refresh()
    end)
    self.canvas = c
    self:_render()
    c:show()

    self:refresh()
    self._timer = hs.timer.doEvery(self.refreshInterval, function() self:refresh() end)
    -- a tunnel starting or stopping writes or removes its pid file
    self._delayed = hs.timer.delayed.new(1, function() self:refresh() end)
    self._watcher = hs.pathwatcher.new(self.runDir, function() self._delayed:start() end):start()
    -- network changes (Wi-Fi, office LAN) change what's reachable
    self._net = hs.network.configuration.open()
    self._net:setCallback(function() self._delayed:start() end)
    self._net:monitorKeys("State:/Network/Global/IPv4")
    self._net:start()
    self._wake = hs.caffeinate.watcher.new(function(event)
        if event == hs.caffeinate.watcher.systemDidWake then self._delayed:start() end
    end):start()
    return self
end

--- VPNStatus:stop()
--- Method
--- Hides the widget and stops checking.
function obj:stop()
    for _, k in ipairs({ "_timer", "_delayed", "_watcher", "_net", "_wake" }) do
        if self[k] then self[k]:stop(); self[k] = nil end
    end
    if self.canvas then self.canvas:delete(); self.canvas = nil end
    return self
end

--- VPNStatus:toggle()
--- Method
--- Shows the widget, or hides it if shown.
function obj:toggle()
    if self.canvas then return self:stop() end
    return self:start()
end

return obj
