// WinLand's helper: one small program instead of three PowerShell scripts that ran all day (each loaded all of
// .NET and PowerShell: ~65-90 MB of memory each). Built on this PC by helper.cjs with the C# compiler that comes with
// Windows (.NET Framework 4), the first time WinLand starts or when this file changed. Same lines in and out as the
// scripts it replaces, which stay as a fallback:
//   winland-helper watch --parent <pid>   volume changes + the window in front   (volume-watch.ps1)
//   winland-helper media                  the music of any player                 (media-session.ps1)
//   winland-helper eyes --skip <pid>      the window under Robo, screen pictures  (buddy-helper.ps1)
using System;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.Globalization;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using Windows.ApplicationModel.Appointments;
using Windows.Foundation;
using Windows.Graphics.Imaging;
using Windows.Media.Control;
using Windows.Media.Ocr;
using Windows.Storage;
using Windows.Storage.Streams;
using Windows.UI.Notifications;
using Windows.UI.Notifications.Management;

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
      // A game: a known game in full screen. Windows also says "Direct3D full screen" for videos and browsers in
      // full screen, so that alone is not enough: those are "cover" and the island comes back with the mouse.
      if (full && !zoomed && IsGame(ExePath(pid))) return "game";
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
    public static void Mute(bool on) { Endpoint().SetMute(on, Guid.Empty); }
    // the default microphone (for calls and for everything else): cut or open it for the whole PC
    static IAudioEndpointVolume Mic(int role) {
      var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumerator());
      IMMDevice device; Marshal.ThrowExceptionForHR(enumerator.GetDefaultAudioEndpoint(1, role, out device));
      IAudioEndpointVolume volume; var id = typeof(IAudioEndpointVolume).GUID;
      Marshal.ThrowExceptionForHR(device.Activate(ref id, 23, 0, out volume));
      return volume;
    }
    public static void MicMute(bool on) { foreach (int role in new[] { 0, 2 }) { try { Mic(role).SetMute(on, Guid.Empty); } catch { } } }
    public static string MicMuted() { try { bool m; Mic(0).GetMute(out m); return m ? "1" : "0"; } catch { return "-"; } }
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

  // ---------- small JSON writer (no library needed) ----------
  static class J {
    public static string S(string s) {
      if (s == null) return "\"\"";
      var b = new StringBuilder("\"");
      foreach (char c in s) {
        if (c == '"' || c == '\\') b.Append('\\').Append(c);
        else if (c == '\n') b.Append("\\n"); else if (c == '\r') b.Append("\\r"); else if (c == '\t') b.Append("\\t");
        else if (c < ' ') b.Append(' '); else b.Append(c);
      }
      return b.Append('"').ToString();
    }
    public static string B(bool v) { return v ? "true" : "false"; }
    public static string N(double v) { return Math.Round(v).ToString(CultureInfo.InvariantCulture); }
  }

  // ---------- music: the Windows media session (Spotify, Apple Music, Deezer, a browser tab…) ----------
  // Same lines as media-session.ps1: "<id> state|play|pause|toggle|next|previous|seek <ms>" -> "<id> {json}",
  // and "push {json}" by itself when the song, the app or play/pause changes (checked 4 times a second).
  static class Media {
    static GlobalSystemMediaTransportControlsSessionManager manager;
    static string lastSong = ""; static bool coverMissing; static int coverTries;
    // WinRT calls are asynchronous: wait for them by looking at their status (only what Windows itself has, no SDK)
    static T Wait<T>(IAsyncOperation<T> op) {
      var clock = Stopwatch.StartNew();
      while (op.Status == AsyncStatus.Started) { if (clock.ElapsedMilliseconds > 3000) { op.Cancel(); throw new TimeoutException("timeout"); } Thread.Sleep(2); }
      if (op.Status != AsyncStatus.Completed) throw op.ErrorCode ?? new Exception("failed");
      return op.GetResults();
    }
    static GlobalSystemMediaTransportControlsSession Pick() {
      var all = manager.GetSessions();
      foreach (var s in all) { try { if (s.GetPlaybackInfo().PlaybackStatus == GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing) return s; } catch { } }
      var current = manager.GetCurrentSession(); if (current != null) return current;
      return all.Count > 0 ? all[0] : null;
    }
    static string Cover(GlobalSystemMediaTransportControlsSessionMediaProperties props) {
      if (props.Thumbnail == null) return "";
      try {
        var stream = Wait(props.Thumbnail.OpenReadAsync());
        ulong size = stream.Size;
        if (size == 0 || size > 2 * 1024 * 1024) return "";
        var reader = new DataReader(stream.GetInputStreamAt(0));
        uint got = Wait(reader.LoadAsync((uint)size));
        var bytes = new byte[got]; reader.ReadBytes(bytes);
        if (bytes.Length == 0) return "";
        return "data:" + (bytes[0] == 0x89 ? "image/png" : "image/jpeg") + ";base64," + Convert.ToBase64String(bytes);
      } catch { return ""; }
    }
    static string State() {
      var s = Pick();
      if (s == null) return "{\"ok\":true,\"active\":false}";
      var props = Wait(s.TryGetMediaPropertiesAsync());
      var info = s.GetPlaybackInfo(); var time = s.GetTimelineProperties();
      bool playing = info.PlaybackStatus == GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing;
      double duration = Math.Max(0, (time.EndTime - time.StartTime).TotalMilliseconds);
      double position = (time.Position - time.StartTime).TotalMilliseconds;
      if (playing && time.LastUpdatedTime.Year > 2000) position += (DateTimeOffset.Now - time.LastUpdatedTime).TotalMilliseconds; // apps update now and then
      if (duration > 0) position = Math.Min(position, duration);
      string artist = string.IsNullOrEmpty(props.Artist) ? props.AlbumArtist : props.Artist, album = props.AlbumTitle;
      int dash = artist == null ? -1 : artist.IndexOf(" — ");
      if (string.IsNullOrEmpty(album) && dash > 0) { album = artist.Substring(dash + 3); artist = artist.Substring(0, dash); } // Apple Music: "Artist — Album"
      string song = s.SourceAppUserModelId + "|" + props.Title + "|" + artist;
      string cover = null;
      if (song != lastSong) { cover = Cover(props); lastSong = song; coverMissing = cover.Length == 0; coverTries = 0; }
      else if (coverMissing && coverTries < 12) { coverTries++; var c = Cover(props); if (c.Length > 0) { cover = c; coverMissing = false; } } // the cover may come a moment after the title
      var b = new StringBuilder("{\"ok\":true");
      b.Append(",\"active\":").Append(J.B(!string.IsNullOrEmpty(props.Title)));
      b.Append(",\"app\":").Append(J.S(s.SourceAppUserModelId)).Append(",\"title\":").Append(J.S(props.Title));
      b.Append(",\"artist\":").Append(J.S(artist)).Append(",\"album\":").Append(J.S(album));
      b.Append(",\"playing\":").Append(J.B(playing)).Append(",\"position\":").Append(J.N(Math.Max(0, position))).Append(",\"duration\":").Append(J.N(duration));
      b.Append(",\"canSeek\":").Append(J.B(info.Controls.IsPlaybackPositionEnabled)).Append(",\"song\":").Append(J.S(song));
      if (cover != null) b.Append(",\"cover\":").Append(J.S(cover));
      return b.Append('}').ToString();
    }
    static string Press(string command, string arg) {
      var s = Pick(); if (s == null) return "{\"ok\":false,\"error\":\"nothing\"}";
      IAsyncOperation<bool> op;
      switch (command) {
        case "play": op = s.TryPlayAsync(); break;
        case "pause": op = s.TryPauseAsync(); break;
        case "toggle": op = s.TryTogglePlayPauseAsync(); break;
        case "next": op = s.TrySkipNextAsync(); break;
        case "previous": op = s.TrySkipPreviousAsync(); break;
        default: op = s.TryChangePlaybackPositionAsync((long)(double.Parse(arg, CultureInfo.InvariantCulture) * 10000)); break; // ms -> 100 ns ticks
      }
      return "{\"ok\":" + J.B(Wait(op)) + "}";
    }
    static string Signature() {
      var s = Pick(); if (s == null) return "none";
      var props = Wait(s.TryGetMediaPropertiesAsync());
      return s.SourceAppUserModelId + "|" + props.Title + "|" + props.Artist + "|" + s.GetPlaybackInfo().PlaybackStatus;
    }
    static void Answer(string line) {
      var parts = line.Trim().Split(' '); if (parts.Length < 2) return;
      string id = parts[0], command = parts[1], arg = parts.Length > 2 ? parts[2] : "", answer;
      try {
        if (command == "state") answer = State();
        else if (command == "forget") { lastSong = ""; answer = "{\"ok\":true}"; }
        else if (command == "play" || command == "pause" || command == "toggle" || command == "next" || command == "previous" || command == "seek") answer = Press(command, arg);
        else answer = "{\"ok\":false,\"error\":\"unknown\"}";
      } catch (Exception e) { answer = "{\"ok\":false,\"error\":" + J.S(e.Message) + "}"; }
      Program.Say(id + " " + answer);
    }
    public static void Run() {
      manager = Wait(GlobalSystemMediaTransportControlsSessionManager.RequestAsync());
      var lines = new BlockingCollection<string>();
      var reader = new Thread(() => { string l; while ((l = Console.In.ReadLine()) != null) lines.Add(l); lines.CompleteAdding(); });
      reader.IsBackground = true; reader.Start();
      string lastSignature = "";
      while (true) {
        string line;
        if (lines.TryTake(out line, 250)) { Answer(line); continue; }
        if (lines.IsCompleted) return; // WinLand closed
        try {
          string now = Signature();
          if (now != lastSignature || coverMissing) {
            bool hadCover = !coverMissing;
            string state = now == "none" ? "{\"ok\":true,\"active\":false}" : State();
            if (now != lastSignature || (!hadCover && !coverMissing)) { lastSignature = now; Program.Say("push " + state); }
          }
        } catch { }
      }
    }
  }

  // ---------- Robo's eyes: the window under a point, and a picture of a part of the screen (was buddy-helper.ps1) ----------
  static class Eyes {
    [StructLayout(LayoutKind.Sequential)] struct R { public int L, T, Rt, B; }
    delegate bool EnumProc(IntPtr h, IntPtr p);
    [DllImport("user32.dll")] static extern bool SetProcessDpiAwarenessContext(IntPtr v);
    [DllImport("user32.dll")] static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc f, IntPtr p);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
    [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr h, int i);
    [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out R r);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
    [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr h, int a, out R r, int size);
    [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr h, int a, out int v, int size);
    static R Visible(IntPtr h) { R r; if (DwmGetWindowAttribute(h, 9, out r, 16) != 0) GetWindowRect(h, out r); return r; } // without the invisible borders
    static string At(int x, int y, uint skip) {
      string found = null;
      EnumWindows((h, p) => {
        if (!IsWindowVisible(h) || IsIconic(h)) return true;
        int cloaked; if (DwmGetWindowAttribute(h, 14, out cloaked, 4) == 0 && cloaked != 0) return true;
        int ex = GetWindowLong(h, -20); if ((ex & 0x20) != 0) return true; // WS_EX_TRANSPARENT: click-through overlays
        uint pid; GetWindowThreadProcessId(h, out pid); if (pid == skip) return true;
        R r = Visible(h); if (r.Rt - r.L < 40 || r.B - r.T < 40) return true;
        if (x < r.L || x >= r.Rt || y < r.T || y >= r.B) return true;
        var sb = new StringBuilder(512); GetWindowText(h, sb, 512);
        string name = ""; try { name = Process.GetProcessById((int)pid).ProcessName; } catch { }
        found = "{\"title\":" + J.S(sb.ToString()) + ",\"process\":" + J.S(name) + ",\"x\":" + r.L + ",\"y\":" + r.T + ",\"w\":" + (r.Rt - r.L) + ",\"h\":" + (r.B - r.T) + "}";
        return false;
      }, IntPtr.Zero);
      return found ?? "{}";
    }
    static string Shot(int x, int y, int w, int h, string file) {
      using (var bmp = new Bitmap(w, h, PixelFormat.Format24bppRgb)) {
        using (var g = Graphics.FromImage(bmp)) g.CopyFromScreen(x, y, 0, 0, new System.Drawing.Size(w, h), CopyPixelOperation.SourceCopy);
        bmp.Save(file, ImageFormat.Png);
      }
      return "{\"ok\":true}";
    }
    public static void Run(uint skip) {
      try { SetProcessDpiAwarenessContext(new IntPtr(-4)); } catch { SetProcessDPIAware(); }
      Program.Say("{\"ready\":true}");
      string line;
      while ((line = Console.In.ReadLine()) != null) {
        var p = line.Split(new[] { ' ' }, 7); string id = p[0], outText;
        try {
          if (p.Length >= 4 && p[1] == "at") outText = At(int.Parse(p[2]), int.Parse(p[3]), skip);
          else if (p.Length >= 7 && p[1] == "shot") outText = Shot(int.Parse(p[2]), int.Parse(p[3]), int.Parse(p[4]), int.Parse(p[5]), p[6]);
          else outText = "{\"error\":\"unknown\"}";
        } catch (Exception e) { outText = "{\"error\":" + J.S(e.Message) + "}"; }
        Program.Say(id + " " + outText);
      }
    }
  }

  // ---------- audio outputs: the list, and which one Windows uses (headphones, speakers, an audio interface…) ----------
  [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDeviceEnumeratorAll {
    int EnumAudioEndpoints(int flow, int stateMask, out IMMDeviceCollection devices);
    int GetDefaultAudioEndpoint(int flow, int role, out IMMDeviceAll device);
  }
  [Guid("0BD7A1BE-7A1A-44DB-8397-CC5392387B5E"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDeviceCollection { int GetCount(out uint count); int Item(uint index, out IMMDeviceAll device); }
  [Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDeviceAll {
    int Activate(ref Guid id, int context, IntPtr parameters, [MarshalAs(UnmanagedType.IUnknown)] out object face);
    int OpenPropertyStore(int access, out IPropertyStore store);
    int GetId([MarshalAs(UnmanagedType.LPWStr)] out string id);
  }
  [StructLayout(LayoutKind.Sequential)] struct PropertyKey { public Guid Format; public int Id; }
  [StructLayout(LayoutKind.Explicit)] struct PropVariant { [FieldOffset(0)] public short Type; [FieldOffset(8)] public IntPtr Pointer; }
  [Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IPropertyStore { int GetCount(out uint count); int GetAt(uint index, out PropertyKey key); int GetValue(ref PropertyKey key, out PropVariant value); }
  // Windows' own (undocumented, stable since Vista) way to choose the default device: what the sound settings use too
  [Guid("F8679F50-850A-41CF-9C72-430F290290C8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IPolicyConfig {
    int a(); int b(); int c(); int d(); int e(); int f(); int g(); int h(); int i(); int j();
    int SetDefaultEndpoint([MarshalAs(UnmanagedType.LPWStr)] string id, int role);
  }
  [ComImport, Guid("870AF99C-171D-4F9E-AF0D-E63DF40C2BC9")] class PolicyConfigClient { }
  static class Outputs {
    static readonly Guid NameFormat = new Guid("A45C254E-DF1C-4EFD-8020-67D146A850E0"); // PKEY_Device_FriendlyName
    static string Name(IMMDeviceAll d) {
      IPropertyStore store; if (d.OpenPropertyStore(0, out store) != 0) return "";
      var key = new PropertyKey { Format = NameFormat, Id = 14 }; PropVariant v;
      if (store.GetValue(ref key, out v) != 0 || v.Type != 31) return ""; // VT_LPWSTR
      return Marshal.PtrToStringUni(v.Pointer);
    }
    public static string List() { // [{"id":…,"name":…,"default":true}, …]
      var e = (IMMDeviceEnumeratorAll)(new MMDeviceEnumerator());
      string current = ""; IMMDeviceAll def; if (e.GetDefaultAudioEndpoint(0, 1, out def) == 0) def.GetId(out current);
      IMMDeviceCollection all; Marshal.ThrowExceptionForHR(e.EnumAudioEndpoints(0, 1, out all)); // render, active only
      uint n; all.GetCount(out n);
      var b = new StringBuilder("[");
      for (uint i = 0; i < n; i++) {
        IMMDeviceAll d; if (all.Item(i, out d) != 0) continue;
        string id; d.GetId(out id);
        if (b.Length > 1) b.Append(',');
        b.Append("{\"id\":").Append(J.S(id)).Append(",\"name\":").Append(J.S(Name(d))).Append(",\"default\":").Append(J.B(id == current)).Append('}');
      }
      return b.Append(']').ToString();
    }
    public static void Use(string id) {
      var policy = (IPolicyConfig)(new PolicyConfigClient());
      for (int role = 0; role < 3; role++) Marshal.ThrowExceptionForHR(policy.SetDefaultEndpoint(id, role)); // console, multimedia, communications
    }
  }

  // ---------- graphics card load: the 3D engines of every process, like Task Manager (only when the System page asks) ----------
  static class Gpu {
    static System.Collections.Generic.List<PerformanceCounter> counters; static DateTime at;
    public static string Read() {
      if (counters == null || (DateTime.Now - at).TotalSeconds > 15) { // processes come and go: refresh the list now and then
        if (counters != null) foreach (var c in counters) c.Dispose();
        counters = new System.Collections.Generic.List<PerformanceCounter>(); at = DateTime.Now;
        try {
          foreach (var name in new PerformanceCounterCategory("GPU Engine").GetInstanceNames())
            if (name.EndsWith("engtype_3D")) { var c = new PerformanceCounter("GPU Engine", "Utilization Percentage", name, true); c.NextValue(); counters.Add(c); }
        } catch { }
        Thread.Sleep(250); // the first reading of a counter is always 0
      }
      double sum = 0; foreach (var c in counters) { try { sum += c.NextValue(); } catch { } }
      return Math.Min(100, Math.Round(sum)).ToString(CultureInfo.InvariantCulture);
    }
  }

  // ---------- microphone / camera in use: Windows writes it down per app (Settings → Privacy shows the same) ----------
  // ConsentStore\<microphone|webcam>\<app> and \NonPackaged\<path>: LastUsedTimeStart newer than LastUsedTimeStop = in use now.
  static class Privacy {
    static string Name(string key) {
      string n = key.Replace('#', '\\');
      int slash = n.LastIndexOf('\\'); if (slash >= 0) n = n.Substring(slash + 1);           // C:#…#Discord.exe -> Discord.exe
      if (n.EndsWith(".exe", StringComparison.OrdinalIgnoreCase)) n = n.Substring(0, n.Length - 4);
      int us = n.IndexOf('_'); if (us > 0 && !key.Contains("#")) n = n.Substring(0, us);      // Microsoft.WindowsCamera_8wek… -> Microsoft.WindowsCamera
      int dot = n.LastIndexOf('.'); if (dot >= 0 && dot < n.Length - 1 && !key.Contains("#")) n = n.Substring(dot + 1); // -> WindowsCamera
      return n;
    }
    static void Scan(Microsoft.Win32.RegistryKey k, System.Collections.Generic.List<string> found) {
      if (k == null) return;
      foreach (var sub in k.GetSubKeyNames()) {
        if (sub == "NonPackaged") { using (var np = k.OpenSubKey(sub)) Scan(np, found); continue; }
        using (var a = k.OpenSubKey(sub)) {
          if (a == null) continue;
          object start = a.GetValue("LastUsedTimeStart"), stop = a.GetValue("LastUsedTimeStop");
          if (!(start is long && stop is long && (long)start > (long)stop)) continue;
          // an app that crashed while using it never writes "stop": only count a desktop app that still exists and runs now
          if (sub.Contains("#")) {
            string exe = sub.Replace('#', '\\');
            if (!File.Exists(exe) || Process.GetProcessesByName(Path.GetFileNameWithoutExtension(exe)).Length == 0) continue;
          }
          var n = Name(sub); if (!found.Contains(n)) found.Add(n);
        }
      }
    }
    public static string InUse(string what) { // "microphone" or "webcam": app names joined by |
      var found = new System.Collections.Generic.List<string>();
      using (var k = Microsoft.Win32.Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\" + what)) Scan(k, found);
      return string.Join("|", found.ToArray());
    }
  }

  // ---------- volume + the window in front (was volume-watch.ps1) ----------
  // ---------- small tools asked by WinLand: OCR of a picture, the colour under the mouse, the app in front ----------
  static class Tools {
    [DllImport("user32.dll")] static extern bool GetCursorPos(out POINT p);
    [DllImport("user32.dll")] static extern IntPtr GetDC(IntPtr h);
    [DllImport("user32.dll")] static extern int ReleaseDC(IntPtr h, IntPtr dc);
    [DllImport("gdi32.dll")] static extern uint GetPixel(IntPtr dc, int x, int y);
    [DllImport("user32.dll")] static extern IntPtr SetThreadDpiAwarenessContext(IntPtr v);
    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
    struct POINT { public int X, Y; }
    struct BOX { public int Left, Top, Right, Bottom; }
    [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out BOX r);
    [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
    [DllImport("user32.dll")] static extern bool IsZoomed(IntPtr h);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetClassName(IntPtr h, StringBuilder name, int size);
    // where the window in front is (Pip on the desktop sits on it): "x y width height", or "-" for none / maximized
    public static string FrontRect(int skipPid) {
      var h = GetForegroundWindow(); if (h == IntPtr.Zero || IsIconic(h) || IsZoomed(h)) return "-";
      var c = new StringBuilder(64); GetClassName(h, c, 64); var cls = c.ToString();
      if (cls == "Progman" || cls == "WorkerW" || cls == "Shell_TrayWnd") return "-";
      uint pid; GetWindowThreadProcessId(h, out pid); if (pid == skipPid) return "-";
      BOX r; if (!GetWindowRect(h, out r) || r.Right - r.Left < 200) return "-";
      return r.Left + " " + r.Top + " " + (r.Right - r.Left) + " " + (r.Bottom - r.Top);
    }
    public static T Wait<T>(IAsyncOperation<T> op) { while (op.Status == AsyncStatus.Started) Thread.Sleep(15); if (op.Status != AsyncStatus.Completed) throw new Exception(op.ErrorCode != null ? op.ErrorCode.Message : "failed"); return op.GetResults(); }
    // the text in a picture (Windows' own OCR, in the languages of this PC)
    public static string Ocr(string path) {
      var engine = OcrEngine.TryCreateFromUserProfileLanguages();
      if (engine == null) return "{\"ok\":false,\"error\":\"no-language\"}";
      var file = Wait(StorageFile.GetFileFromPathAsync(path));
      using (var stream = Wait(file.OpenAsync(FileAccessMode.Read))) {
        var decoder = Wait(BitmapDecoder.CreateAsync(stream));
        var bitmap = Wait(decoder.GetSoftwareBitmapAsync(BitmapPixelFormat.Bgra8, BitmapAlphaMode.Premultiplied));
        var result = Wait(engine.RecognizeAsync(bitmap));
        var text = new StringBuilder(); foreach (var line in result.Lines) text.Append(line.Text).Append('\n');
        return "{\"ok\":true,\"text\":" + J.S(text.ToString().TrimEnd()) + "}";
      }
    }
    // today's appointments of the Windows calendar (Outlook, Google… accounts added to Windows), read on this PC
    public static string Agenda() {
      var store = Wait(AppointmentManager.RequestStoreAsync(AppointmentStoreAccessType.AllCalendarsReadOnly));
      var list = Wait(store.FindAppointmentsAsync(DateTimeOffset.Now.Date, TimeSpan.FromDays(1)));
      var b = new StringBuilder("["); bool first = true;
      foreach (var a in list) {
        if (!first) b.Append(','); first = false;
        b.Append("{\"start\":").Append(J.N(a.StartTime.ToUnixTimeMilliseconds())).Append(",\"minutes\":").Append(J.N(a.Duration.TotalMinutes))
         .Append(",\"title\":").Append(J.S(a.Subject)).Append(",\"place\":").Append(J.S(a.Location)).Append(",\"allDay\":").Append(J.B(a.AllDay)).Append('}');
      }
      return b.Append(']').ToString();
    }
    // the colour under the mouse, as #rrggbb
    public static string Pixel() {
      // real screen pixels on this thread only (on a 125 % or 150 % screen the mouse position would be scaled, the colour wrong)
      IntPtr was = IntPtr.Zero; try { was = SetThreadDpiAwarenessContext(new IntPtr(-4)); } catch { }
      POINT p; GetCursorPos(out p); var dc = GetDC(IntPtr.Zero); uint c = GetPixel(dc, p.X, p.Y); ReleaseDC(IntPtr.Zero, dc);
      if (was != IntPtr.Zero) try { SetThreadDpiAwarenessContext(was); } catch { }
      return string.Format("#{0:x2}{1:x2}{2:x2} {3} {4}", c & 0xff, (c >> 8) & 0xff, (c >> 16) & 0xff, p.X, p.Y);
    }
    // the program in front (its file name), for the screen time
    public static string Front() {
      try { uint pid; GetWindowThreadProcessId(GetForegroundWindow(), out pid); if (pid == 0) return ""; return Process.GetProcessById((int)pid).ProcessName; } catch { return ""; }
    }
  }

  // ---------- Windows notifications (Discord, Outlook, Teams…): each new one, once ----------
  // ---------- keyboard (Stream Deck on the phone): a shortcut like ctrl+shift+m, a media key, or text typed out ----------
  static class Keys {
    [StructLayout(LayoutKind.Sequential)] struct KEYBDINPUT { public ushort wVk; public ushort wScan; public uint dwFlags; public uint time; public IntPtr dwExtraInfo; }
    [StructLayout(LayoutKind.Sequential)] struct MOUSEINPUT { public int dx; public int dy; public uint mouseData; public uint dwFlags; public uint time; public IntPtr dwExtraInfo; }
    [StructLayout(LayoutKind.Explicit)] struct UNION { [FieldOffset(0)] public KEYBDINPUT ki; [FieldOffset(0)] public MOUSEINPUT mi; }
    [StructLayout(LayoutKind.Sequential)] struct INPUT { public uint type; public UNION u; }
    [DllImport("user32.dll", SetLastError = true)] static extern uint SendInput(uint n, INPUT[] inputs, int size);
    const uint KEYUP = 2, UNICODE = 4, EXTENDED = 1;
    static readonly System.Collections.Generic.Dictionary<string, ushort> NAMES = new System.Collections.Generic.Dictionary<string, ushort>(StringComparer.OrdinalIgnoreCase) {
      { "ctrl", 0x11 }, { "control", 0x11 }, { "shift", 0x10 }, { "alt", 0x12 }, { "win", 0x5B }, { "windows", 0x5B },
      { "enter", 0x0D }, { "return", 0x0D }, { "esc", 0x1B }, { "escape", 0x1B }, { "tab", 0x09 }, { "space", 0x20 }, { "backspace", 0x08 },
      { "delete", 0x2E }, { "del", 0x2E }, { "insert", 0x2D }, { "home", 0x24 }, { "end", 0x23 }, { "pageup", 0x21 }, { "pagedown", 0x22 },
      { "left", 0x25 }, { "up", 0x26 }, { "right", 0x27 }, { "down", 0x28 }, { "printscreen", 0x2C }, { "capslock", 0x14 },
      { "playpause", 0xB3 }, { "nexttrack", 0xB0 }, { "prevtrack", 0xB1 }, { "stop", 0xB2 }, { "volumeup", 0xAF }, { "volumedown", 0xAE }, { "volumemute", 0xAD },
      { "plus", 0xBB }, { "minus", 0xBD }, { "comma", 0xBC }, { "period", 0xBE }
    };
    static readonly ushort[] EXTENDED_KEYS = { 0x2E, 0x2D, 0x24, 0x23, 0x21, 0x22, 0x25, 0x26, 0x27, 0x28, 0x5B, 0xB3, 0xB0, 0xB1, 0xB2, 0xAF, 0xAE, 0xAD };
    static INPUT Key(ushort vk, bool up) {
      var i = new INPUT { type = 1 }; i.u.ki.wVk = vk;
      i.u.ki.dwFlags = (up ? KEYUP : 0) | (Array.IndexOf(EXTENDED_KEYS, vk) >= 0 ? EXTENDED : 0); return i;
    }
    static ushort Vk(string name) {
      ushort vk; if (NAMES.TryGetValue(name, out vk)) return vk;
      if (name.Length == 1) { char c = char.ToUpperInvariant(name[0]); if ((c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9')) return c; }
      int f; if (name.Length >= 2 && (name[0] == 'f' || name[0] == 'F') && int.TryParse(name.Substring(1), out f) && f >= 1 && f <= 24) return (ushort)(0x70 + f - 1);
      throw new Exception("unknown key " + name);
    }
    // "ctrl+shift+m": press them in order, let go in the opposite order
    public static void Press(string spec) {
      var parts = spec.Split('+'); var vks = new ushort[parts.Length];
      for (int k = 0; k < parts.Length; k++) vks[k] = Vk(parts[k].Trim());
      var list = new System.Collections.Generic.List<INPUT>();
      foreach (var v in vks) list.Add(Key(v, false));
      for (int k = vks.Length - 1; k >= 0; k--) list.Add(Key(vks[k], true));
      SendInput((uint)list.Count, list.ToArray(), Marshal.SizeOf(typeof(INPUT)));
    }
    // any text, letter by letter (accents and emoji too), a new line is Enter
    public static void Type(string text) {
      var list = new System.Collections.Generic.List<INPUT>();
      foreach (char c in text.Replace("\r\n", "\n")) {
        if (c == '\n') { list.Add(Key(0x0D, false)); list.Add(Key(0x0D, true)); continue; }
        foreach (bool up in new[] { false, true }) { var i = new INPUT { type = 1 }; i.u.ki.wScan = c; i.u.ki.dwFlags = UNICODE | (up ? KEYUP : 0); list.Add(i); }
      }
      if (list.Count > 0) SendInput((uint)list.Count, list.ToArray(), Marshal.SizeOf(typeof(INPUT)));
    }
  }

  // ---------- an app's own logo, big (Stream Deck buttons): the 256 px Windows icon of a program or shortcut ----------
  static class AppIcon {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)] struct SHFILEINFO { public IntPtr hIcon; public int iIcon; public uint attr; [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 260)] public string name; [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 80)] public string type; }
    [DllImport("shell32.dll", CharSet = CharSet.Unicode)] static extern IntPtr SHGetFileInfo(string path, uint attr, ref SHFILEINFO info, uint size, uint flags);
    [DllImport("shell32.dll")] static extern int SHGetImageList(int list, ref Guid iid, out IntPtr ppv);
    [DllImport("comctl32.dll")] static extern IntPtr ImageList_GetIcon(IntPtr list, int i, uint flags);
    [DllImport("user32.dll")] static extern bool DestroyIcon(IntPtr icon);
    static Bitmap Get(string path, int list) {
      var info = new SHFILEINFO(); if (SHGetFileInfo(path, 0, ref info, (uint)Marshal.SizeOf(info), 0x4000) == IntPtr.Zero) return null; // the icon's index (no shortcut arrow)
      var iid = new Guid("46EB5926-582E-4017-9FDF-E8998DAA0950"); IntPtr images; if (SHGetImageList(list, ref iid, out images) != 0) return null;
      var h = ImageList_GetIcon(images, info.iIcon, 1); if (h == IntPtr.Zero) return null; // transparent
      try { using (var icon = Icon.FromHandle(h)) return icon.ToBitmap(); } finally { DestroyIcon(h); }
    }
    // the part that is not transparent (a small icon sits in a corner of the 256 px one)
    static Rectangle Used(Bitmap b) {
      int x0 = b.Width, y0 = b.Height, x1 = -1, y1 = -1;
      for (int y = 0; y < b.Height; y++) for (int x = 0; x < b.Width; x++) if (b.GetPixel(x, y).A > 16) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
      return x1 < 0 ? Rectangle.Empty : Rectangle.FromLTRB(x0, y0, x1 + 1, y1 + 1);
    }
    public static string Png(string path) {
      Bitmap b = Get(path, 4); // jumbo, 256 px
      if (b != null) { var used = Used(b); if (used.IsEmpty || used.Width <= 64 && used.Height <= 64) { b.Dispose(); b = null; } }
      if (b == null) b = Get(path, 2); // extra large, 48 px
      if (b == null) return "";
      using (b) {
        var used = Used(b); if (used.IsEmpty) return "";
        int side = Math.Max(used.Width, used.Height);
        using (var outB = new Bitmap(128, 128, PixelFormat.Format32bppArgb)) {
          using (var g = Graphics.FromImage(outB)) {
            g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic; g.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.HighQuality;
            float k = 128f / side; float w = used.Width * k, hh = used.Height * k;
            g.DrawImage(b, new RectangleF((128 - w) / 2, (128 - hh) / 2, w, hh), used, GraphicsUnit.Pixel);
          }
          using (var ms = new MemoryStream()) { outB.Save(ms, ImageFormat.Png); return Convert.ToBase64String(ms.ToArray()); }
        }
      }
    }
  }

  static class Notify {
    // "notif-take 1": WinLand shows them in the island, so each one also leaves the corner of the screen at once
    public static volatile bool take;
    static readonly System.Collections.Generic.Dictionary<string, string> logos = new System.Collections.Generic.Dictionary<string, string>();
    // the app's own logo, as Windows has it for its notifications (read once per app)
    static string Logo(UserNotification n, string id) {
      string logo; if (logos.TryGetValue(id, out logo)) return logo;
      logo = "";
      try {
        var stream = Tools.Wait(n.AppInfo.DisplayInfo.GetLogo(new Windows.Foundation.Size(64, 64)).OpenReadAsync());
        if (stream.Size > 0 && stream.Size < 512 * 1024) {
          var reader = new DataReader(stream.GetInputStreamAt(0));
          uint got = Tools.Wait(reader.LoadAsync((uint)stream.Size));
          var bytes = new byte[got]; reader.ReadBytes(bytes);
          if (bytes.Length > 0) logo = "data:" + (bytes[0] == 0x89 ? "image/png" : "image/jpeg") + ";base64," + Convert.ToBase64String(bytes);
        }
      } catch { }
      logos[id] = logo; return logo;
    }
    public static void Run() {
      var thread = new Thread(() => {
        var seen = new System.Collections.Generic.HashSet<uint>(); bool first = true;
        UserNotificationListener l;
        try { l = UserNotificationListener.Current; if (Tools.Wait(l.RequestAccessAsync()) != UserNotificationListenerAccessStatus.Allowed) { Program.Say("notif-access denied"); return; } }
        catch { Program.Say("notif-access denied"); return; }
        Program.Say("notif-access allowed");
        while (true) {
          try {
            foreach (var n in Tools.Wait(l.GetNotificationsAsync(NotificationKinds.Toast))) {
              if (!seen.Add(n.Id) || first) continue;
              string app = "", id = "";
              try { app = n.AppInfo.DisplayInfo.DisplayName; } catch { }
              try { id = n.AppInfo.AppUserModelId; } catch { }
              var texts = new System.Collections.Generic.List<string>();
              try { var b = n.Notification.Visual.GetBinding(KnownNotificationBindings.ToastGeneric); if (b != null) foreach (var t in b.GetTextElements()) texts.Add(t.Text); } catch { }
              if (texts.Count == 0) continue;
              bool own = app.IndexOf("winland", StringComparison.OrdinalIgnoreCase) >= 0 || app.IndexOf("electron", StringComparison.OrdinalIgnoreCase) >= 0;
              Program.Say("notif {\"id\":" + n.Id + ",\"app\":" + J.S(app) + ",\"aumid\":" + J.S(id) + ",\"logo\":" + J.S(id == "" ? "" : Logo(n, id)) + ",\"title\":" + J.S(texts[0]) + ",\"body\":" + J.S(string.Join("\n", texts.GetRange(1, texts.Count - 1))) + "}");
              if (take && !own) { try { l.RemoveNotification(n.Id); } catch { } } // shown in the island instead of the corner
            }
            first = false;
          } catch { }
          Thread.Sleep(take ? 300 : 1500);
        }
      });
      thread.IsBackground = true; thread.Start();
    }
  }

  // ---------- desktop widgets: a window that lives on the desktop, under the other windows ----------
  static class Desk {
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern IntPtr FindWindow(string cls, string name);
    [DllImport("user32.dll", EntryPoint = "SetWindowLongPtrW")] static extern IntPtr SetWindowLongPtr(IntPtr h, int index, IntPtr value);
    [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int w, int hh, uint flags);
    const int GWLP_HWNDPARENT = -8; const uint NOSIZE = 1, NOMOVE = 2, NOACTIVATE = 0x10;
    // owned by the desktop (Progman): it stays when Win+D shows the desktop, and sits just above the wallpaper
    public static void Attach(long hwnd) {
      IntPtr h = new IntPtr(hwnd), desk = FindWindow("Progman", null);
      if (desk != IntPtr.Zero) SetWindowLongPtr(h, GWLP_HWNDPARENT, desk);
      Bottom(hwnd);
    }
    public static void Bottom(long hwnd) { SetWindowPos(new IntPtr(hwnd), new IntPtr(1), 0, 0, 0, 0, NOSIZE | NOMOVE | NOACTIVATE); } // HWND_BOTTOM
  }

  static class Watch {
    public static void Run(int parent) {
      var listen = new Thread(() => {
        string line;
        while ((line = Console.In.ReadLine()) != null) {
          try {
            var parts = line.Trim().Split(' ');
            if (parts.Length == 2 && parts[0] == "set") Audio.Set(int.Parse(parts[1]));
            else if (parts.Length == 2 && parts[0] == "mute") Audio.Mute(parts[1] == "1");
            else if (parts[0] == "outputs") Program.Say("outputs " + Outputs.List());
            else if (parts[0] == "gpu") Program.Say("gpu " + Gpu.Read());
            else if (parts.Length == 2 && parts[0] == "output") { Outputs.Use(parts[1]); Program.Say("outputs " + Outputs.List()); }
            else if (parts.Length == 2 && parts[0] == "micmute") { Audio.MicMute(parts[1] == "1"); Program.Say("micmute " + Audio.MicMuted()); }
            else if (parts[0] == "pixel") Program.Say("pixel " + Tools.Pixel());
            else if (parts.Length == 2 && parts[0] == "keys") Keys.Press(parts[1]); // Stream Deck
            else if (parts.Length == 2 && parts[0] == "notif-take") Notify.take = parts[1] == "1";
            else if (parts.Length == 2 && parts[0] == "deskwin") Desk.Attach(long.Parse(parts[1]));
            else if (parts.Length == 2 && parts[0] == "deskbottom") Desk.Bottom(long.Parse(parts[1]));
            else if (parts.Length == 2 && parts[0] == "appicon") { string r; try { r = AppIcon.Png(Encoding.UTF8.GetString(Convert.FromBase64String(parts[1]))); } catch { r = ""; } Program.Say("appicon " + (r == "" ? "-" : r)); }
            else if (parts.Length == 2 && parts[0] == "type") Keys.Type(Encoding.UTF8.GetString(Convert.FromBase64String(parts[1])));
            else if (parts.Length == 2 && parts[0] == "rect") Program.Say("rect " + Tools.FrontRect(int.Parse(parts[1])));
            else if (parts[0] == "agenda") { string a; try { a = Tools.Agenda(); } catch { a = "[]"; } Program.Say("agenda " + a); }
            else if (parts.Length == 2 && parts[0] == "ocr") { string r; try { r = Tools.Ocr(Encoding.UTF8.GetString(Convert.FromBase64String(parts[1]))); } catch (Exception e) { r = "{\"ok\":false,\"error\":" + J.S(e.Message) + "}"; } Program.Say("ocr " + r); }
          } catch { }
        }
      });
      listen.IsBackground = true; listen.Start();
      Notify.Run();
      string last = "", lastMode = "", lastMic = null, lastCam = null, lastMicMute = null, lastFront = null; int tick = 0;
      while (true) {
        tick++;
        if (parent > 0 && tick % 15 == 0) { try { Process.GetProcessById(parent); } catch { return; } } // stop together with WinLand
        string now; try { now = Audio.Read(); } catch { now = last; }
        if (now != last) { Program.Say(now); last = now; }
        string mode; try { mode = Screen.Mode(parent); } catch { mode = "keep"; }
        if (mode != "keep" && mode != lastMode) { Program.Say("fg " + mode); lastMode = mode; }
        if (tick % 6 == 0) { // about once a second: microphone and camera
          try { var mic = Privacy.InUse("microphone"); if (mic != lastMic) { Program.Say("mic " + mic); lastMic = mic; } } catch { }
          try { var cam = Privacy.InUse("webcam"); if (cam != lastCam) { Program.Say("cam " + cam); lastCam = cam; } } catch { }
          var mm = Audio.MicMuted(); if (mm != lastMicMute) { Program.Say("micmute " + mm); lastMicMute = mm; }
          var front = Tools.Front(); if (front != lastFront) { Program.Say("front " + front); lastFront = front; }
        }
        Thread.Sleep(150);
      }
    }
  }

  static class Program {
    static readonly object gate = new object();
    public static void Say(string line) { lock (gate) { Console.Out.WriteLine(line); Console.Out.Flush(); } }
    static int Arg(string[] args, string name) { for (int i = 0; i + 1 < args.Length; i++) if (args[i] == name) return int.Parse(args[i + 1]); return 0; }
    static int Main(string[] args) {
      Console.OutputEncoding = new UTF8Encoding(false); Console.InputEncoding = new UTF8Encoding(false);
      string mode = args.Length > 0 ? args[0] : "";
      try {
        if (mode == "watch") Watch.Run(Arg(args, "--parent"));
        else if (mode == "media") Media.Run();
        else if (mode == "eyes") Eyes.Run((uint)Arg(args, "--skip"));
        else { Console.Error.WriteLine("usage: winland-helper watch --parent <pid> | media | eyes --skip <pid>"); return 2; }
      } catch (Exception e) { Console.Error.WriteLine(e.Message); return 1; }
      return 0;
    }
  }
}
