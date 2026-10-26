local obj={}
obj.__index = obj

obj.name = "browserTabs"
obj.version = "1.1"
obj.author = "ashfinal <ashfinal@gmail.com>"

-- Internal function used to find our location, so we know where to load files from
local function script_path()
    local str = debug.getinfo(2, "S").source:sub(2)
    return str:match("(.*/)")
end

obj.spoonPath = script_path()

local brave_bundle = "com.brave.Browser"
local brave_icon = hs.image.imageFromAppBundle(brave_bundle) or hs.image.imageFromPath(obj.spoonPath .. "/resources/tabs.png")

-- Define the source's overview. A unique `keyword` key should exist, so this source can be found.
obj.overview = {text="Type t ⇥ to search Brave tabs.", image=hs.image.imageFromPath(obj.spoonPath .. "/resources/tabs.png"), keyword="t"}
-- Define the notice when a long-time request is being executed. It could be `nil`.
obj.notice = {text="Requesting data, please wait a while …"}

local function browserTabsRequest()
    local chooser_data = {}
    if #hs.application.applicationsForBundleID(brave_bundle) > 0 then
        local stat, data = hs.osascript.applescript([[
tell application "Brave Browser"
    set tablist to {}
    repeat with w in windows
        set i to 0
        repeat with t in tabs of w
            set i to i + 1
            copy {title of t, URL of t, id of w, i} to the end of tablist
        end repeat
    end repeat
    return tablist
end tell]])
        if stat then
            chooser_data = hs.fnutils.imap(data, function(item)
                -- `arg` is "windowId:tabIndex", consumed by the "bravetab" output below
                return {text=item[1], subText=item[2], image=brave_icon, output="bravetab", arg=item[3] .. ":" .. item[4]}
            end)
        end
    end
    return chooser_data
end

-- Define the function which will be called when the `keyword` triggers a new source. The returned value is a table. Read more: http://www.hammerspoon.org/docs/hs.chooser.html#choices
obj.init_func = browserTabsRequest
-- Insert a friendly tip at the head so users know what to do next.
obj.description = {text="Brave Tabs Search", subText="Search and select one item to switch to that tab.", image=hs.image.imageFromPath(obj.spoonPath .. "/resources/tabs.png")}

-- As the user is typing, the callback function will be called for every keypress. The returned value is a table.
obj.callback = nil

-- Define a new output type: switch to an existing tab instead of opening its URL again
local function focusBraveTab(arg)
    local window_id, tab_index = arg:match("^(%d+):(%d+)$")
    if not window_id then return end
    hs.osascript.applescript(string.format([[
tell application "Brave Browser"
    set active tab index of window id %s to %s
    set index of window id %s to 1
    activate
end tell]], window_id, tab_index, window_id))
end
obj.new_output = {
    name = "bravetab",
    func = focusBraveTab
}

return obj
