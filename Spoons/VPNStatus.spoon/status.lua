-- Plain-Lua part of VPNStatus (no hs.*), so it can be unit-tested.

local M = {}

-- Ids of the vpn-switch tunnels whose openvpn process is running, as a set,
-- from `pgrep -fl` (or `ps`) output. vpn-switch starts each tunnel as
-- ".../vpn-switch/openvpn --config .../profiles/<id>.conf".
function M.runningTunnels(psOutput)
  local running = {}
  for line in (psOutput or ""):gmatch("[^\n]+") do
    local id = line:match("vpn%-switch/openvpn .*%-%-config %S*/([%w%-]+)%.conf")
    if id then running[id] = true end
  end
  return running
end

-- Splits "host:port" into host and port number.
function M.splitProbe(probe)
  local host, port = (probe or ""):match("^(.+):(%d+)$")
  return host, tonumber(port)
end

-- The row shown for one tunnel, or nil to hide it.
--   tunnel:    { label = ..., target = ..., probe = "host:port",
--                onDemand = bool, optional = bool }
--   running:   whether its openvpn process is running
--   reachable: result of the last probe (true / false), or nil if not probed yet
-- Returns { label = ..., detail = ..., state = "ok" | "warn" | "down" | "idle" }:
--   ok    tunnel up and its target answers (or it has no target)
--   warn  tunnel up but its target doesn't answer, or not checked yet
--   down  tunnel down
--   off   an onDemand tunnel that is down: connected only when needed, so
--         being down is normal and not an alarm
-- An optional tunnel that is down isn't shown at all (returns nil).
function M.row(tunnel, running, reachable)
  local target = tunnel.target or tunnel.probe
  if not running then
    if tunnel.optional then return nil end
    if tunnel.onDemand then return { label = tunnel.label, detail = "off", state = "off" } end
    local detail = "down"
    -- e.g. in the office, where the target is reachable without the tunnel
    if target and reachable then detail = "down (" .. target .. " reachable)" end
    return { label = tunnel.label, detail = detail, state = "down" }
  end
  if not tunnel.probe then
    return { label = tunnel.label, detail = "up", state = "ok" }
  end
  if reachable == nil then
    return { label = tunnel.label, detail = target .. " …", state = "warn" }
  end
  if reachable then
    return { label = tunnel.label, detail = target .. " ✓", state = "ok" }
  end
  return { label = tunnel.label, detail = target .. " unreachable", state = "warn" }
end

return M
