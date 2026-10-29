# Prints "<volume 0-100> <muted 0/1>" whenever the Windows master volume changes (WinLand volume bar).
# Also listens on stdin: "set <0-100>" sets the master volume (the volume block on the home screen), "mute <0/1>" mutes.
# And prints "fg none|cover|game" when the window in front changes what the island should do (see Screen below).
param([int]$Parent = 0) # must come first in a script
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
namespace WinLand {
  // What the window in front means for the island (main screen only):
  //   "game"  a game fills the screen (exclusive full screen, or a full-screen window of a known game): stay hidden
  //   "cover" a maximized or full-screen window (browser, video, explorer…): hide, come back when the mouse goes up
  //   "none"  nothing in the way;  "keep" the island itself is in front (nothing changes)
  public static class Screen {
    [StructLayout(LayoutKind.Sequential)] struct RECT { public int Left, Top, Right, Bottom; }
    [StructLayout(LayoutKind.Sequential)] struct MONITORINFO { public int Size; public RECT Monitor, Work; public int Flags; }
    [DllImport("shell32.dll")] static extern int SHQueryUserNotificationState(out int state);
    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] static extern IntPtr GetShellWindow();
    [DllImport("user32.dll")] static extern IntPtr GetDesktopWindow();
    [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out RECT r);
    [DllImport("user32.dll")] static extern IntPtr MonitorFromWindow(IntPtr h, uint flags);
    [DllImport("user32.dll")] static extern bool GetMonitorInfo(IntPtr m, ref MONITORINFO info);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
    [DllImport("user32.dll")] static extern bool IsZoomed(IntPtr h);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetClassName(IntPtr h, System.Text.StringBuilder name, int size);
    [DllImport("kernel32.dll")] static extern IntPtr OpenProcess(int access, bool inherit, uint pid);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] static extern bool QueryFullProcessImageName(IntPtr h, int flags, System.Text.StringBuilder name, ref int size);
    [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);
    static string ExePath(uint pid) {
      var h = OpenProcess(0x1000, false, pid); if (h == IntPtr.Zero) return "";
      try { var sb = new System.Text.StringBuilder(1024); int n = sb.Capacity; return QueryFullProcessImageName(h, 0, sb, ref n) ? sb.ToString() : ""; }
      finally { CloseHandle(h); }
    }
    // Games: Windows' own list (Xbox Game Bar, GameConfigStore) and the usual game folders
    static readonly string[] GameDirs = { "\\steamapps\\", "\\epic games\\", "\\riot games\\", "\\xboxgames\\", "\\gog galaxy\\games\\", "\\gog games\\",
      "\\ea games\\", "\\electronic arts\\", "\\ubisoft game launcher\\games\\", "\\battle.net\\", "\\blizzard entertainment\\", "\\rockstar games\\", "\\minecraft" };
    static System.Collections.Generic.HashSet<string> known; static DateTime knownAt;
    static bool IsGame(string exe) {
      if (string.IsNullOrEmpty(exe)) return false;
      var low = exe.ToLowerInvariant();
      foreach (var d in GameDirs) if (low.Contains(d)) return true;
      if (known == null || (DateTime.Now - knownAt).TotalMinutes > 5) {
        known = new System.Collections.Generic.HashSet<string>(); knownAt = DateTime.Now;
        try {
          using (var root = Microsoft.Win32.Registry.CurrentUser.OpenSubKey(@"System\GameConfigStore\Children")) {
            if (root != null) foreach (var name in root.GetSubKeyNames()) using (var k = root.OpenSubKey(name)) {
              var path = k == null ? null : k.GetValue("MatchedExeFullPath") as string; if (!string.IsNullOrEmpty(path)) known.Add(path.ToLowerInvariant());
            }
          }
        } catch { }
      }
      return known.Contains(low);
    }
    public static string Mode(int skipPid) {
      int state; bool exclusive = SHQueryUserNotificationState(out state) == 0 && state == 3; // a Direct3D game in exclusive full screen
      var h = GetForegroundWindow();
      if (h == IntPtr.Zero || h == GetShellWindow() || h == GetDesktopWindow() || !IsWindowVisible(h)) return exclusive ? "game" : "none";
      var cls = new System.Text.StringBuilder(64); GetClassName(h, cls, 64);
      var c = cls.ToString(); if (c == "Progman" || c == "WorkerW" || c == "Shell_TrayWnd") return exclusive ? "game" : "none"; // desktop, taskbar
      uint pid; GetWindowThreadProcessId(h, out pid); if (pid == skipPid) return "keep"; // the island itself
      var info = new MONITORINFO(); info.Size = Marshal.SizeOf(typeof(MONITORINFO));
      if (!GetMonitorInfo(MonitorFromWindow(h, 2), ref info) || (info.Flags & 1) == 0) return exclusive ? "game" : "none"; // only the main screen
      RECT r; if (!GetWindowRect(h, out r)) return "none";
      bool zoomed = IsZoomed(h);
      bool full = r.Left <= info.Monitor.Left && r.Top <= info.Monitor.Top && r.Right >= info.Monitor.Right && r.Bottom >= info.Monitor.Bottom;
      if (!zoomed && !full) return exclusive ? "game" : "none";
      if (full && !zoomed && (exclusive || IsGame(ExePath(pid)))) return "game";
      return "cover";
    }
  }
  [Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioEndpointVolume {
    int f(); int g(); int h(); int i();
    int SetMasterVolumeLevelScalar(float level, Guid context);
    int j();
    int GetMasterVolumeLevelScalar(out float level);
    int k(); int l(); int m(); int n();
    int SetMute([MarshalAs(UnmanagedType.Bool)] bool mute, Guid context);
    int GetMute(out bool mute);
  }
  [Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDevice { int Activate(ref Guid id, int context, int parameters, out IAudioEndpointVolume volume); }
  [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDeviceEnumerator { int f(); int GetDefaultAudioEndpoint(int flow, int role, out IMMDevice device); }
  [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumerator { }
  public static class Audio {
    static IAudioEndpointVolume Endpoint() {
      var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumerator());
      IMMDevice device; Marshal.ThrowExceptionForHR(enumerator.GetDefaultAudioEndpoint(0, 1, out device));
      IAudioEndpointVolume volume; var id = typeof(IAudioEndpointVolume).GUID;
      Marshal.ThrowExceptionForHR(device.Activate(ref id, 23, 0, out volume));
      return volume;
    }
    public static string Read() {
      var v = Endpoint(); float level; bool mute;
      Marshal.ThrowExceptionForHR(v.GetMasterVolumeLevelScalar(out level));
      Marshal.ThrowExceptionForHR(v.GetMute(out mute));
      return ((int)Math.Round(level * 100)).ToString() + " " + (mute ? "1" : "0");
    }
    public static void Set(int percent) {
      var v = Endpoint(); percent = Math.Max(0, Math.Min(100, percent));
      Marshal.ThrowExceptionForHR(v.SetMasterVolumeLevelScalar(percent / 100f, Guid.Empty));
      if (percent > 0) v.SetMute(false, Guid.Empty);
    }
    // Commands from WinLand come in on stdin, on their own thread (the main loop keeps reporting changes).
    public static void Listen() {
      var thread = new System.Threading.Thread(() => {
        string line;
        while ((line = Console.In.ReadLine()) != null) {
          try {
            var parts = line.Trim().Split(' ');
            if (parts.Length == 2 && parts[0] == "set") Set(int.Parse(parts[1]));
            else if (parts.Length == 2 && parts[0] == "mute") Endpoint().SetMute(parts[1] == "1", Guid.Empty);
          } catch { }
        }
      });
      thread.IsBackground = true; thread.Start();
    }
  }
}
'@
$last = ''
$lastMode = ''
$tick = 0
[WinLand.Audio]::Listen()
while ($true) {
  # Stop together with WinLand, also when it was closed abruptly.
  if ($Parent -and (++$tick % 15 -eq 0) -and -not (Get-Process -Id $Parent -ErrorAction SilentlyContinue)) { exit 0 }
  try { $now = [WinLand.Audio]::Read() } catch { $now = $last }
  if ($now -ne $last) { [Console]::Out.WriteLine($now); [Console]::Out.Flush(); $last = $now }
  # about 3 times a second: the window in front (maximized, full screen, a game)
  try { $mode = [WinLand.Screen]::Mode($Parent) } catch { $mode = 'keep' }
  if ($mode -ne 'keep' -and $mode -ne $lastMode) { [Console]::Out.WriteLine('fg ' + $mode); [Console]::Out.Flush(); $lastMode = $mode }
  Start-Sleep -Milliseconds 150
}
