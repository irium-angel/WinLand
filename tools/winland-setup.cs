// WinLand-Setup.exe: shows Pip while it unpacks WinLand (the payload.zip inside this program) to a temporary folder,
// then starts WinLand's own installer from there (installer/setup.html) and cleans up when it closes.
// Built on this PC by tools/build-setup.cjs with the C# compiler that comes with Windows.
using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;

class Splash : Form {
  float progress; string line = "Préparation de WinLand…";
  public Splash() {
    FormBorderStyle = FormBorderStyle.None; StartPosition = FormStartPosition.CenterScreen; Size = new Size(360, 230);
    BackColor = Color.FromArgb(11, 11, 16); ShowInTaskbar = true; Text = "WinLand"; DoubleBuffered = true;
    try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }
    using (var path = Round(new Rectangle(0, 0, Width, Height), 22)) Region = new Region(path);
    if (System.Globalization.CultureInfo.CurrentUICulture.TwoLetterISOLanguageName != "fr") line = "Getting WinLand ready…";
  }
  static GraphicsPath Round(Rectangle r, int radius) {
    var p = new GraphicsPath(); int d = radius * 2;
    p.AddArc(r.X, r.Y, d, d, 180, 90); p.AddArc(r.Right - d, r.Y, d, d, 270, 90);
    p.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90); p.AddArc(r.X, r.Bottom - d, d, d, 90, 90); p.CloseFigure(); return p;
  }
  public void Set(float value) { progress = value; Invalidate(); }
  protected override void OnPaint(PaintEventArgs e) {
    var g = e.Graphics; g.SmoothingMode = SmoothingMode.AntiAlias; g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.ClearTypeGridFit;
    using (var glow = new LinearGradientBrush(new Rectangle(0, 0, Width, Height), Color.FromArgb(70, 124, 92, 255), Color.FromArgb(50, 26, 167, 255), 45f)) g.FillRectangle(glow, 0, 0, Width, Height);
    // Pip, blinking now and then
    var body = new Rectangle(Width / 2 - 46, 44, 92, 78);
    using (var shade = new SolidBrush(Color.FromArgb(70, 0, 0, 0))) g.FillEllipse(shade, Width / 2 - 36, 128, 72, 10);
    using (var path = Round(body, 26)) using (var b = new LinearGradientBrush(body, Color.White, Color.FromArgb(222, 222, 230), 90f)) g.FillPath(b, path);
    bool blink = (Environment.TickCount / 120) % 30 == 0;
    using (var eye = new SolidBrush(Color.FromArgb(255, 159, 10)))
      foreach (int side in new[] { -1, 1 }) { int cx = Width / 2 + side * 17; if (blink) g.FillRectangle(eye, cx - 7, 82, 14, 3); else g.FillEllipse(eye, cx - 7, 71, 14, 21); }
    using (var f = new Font("Segoe UI Semibold", 10.5f)) using (var b = new SolidBrush(Color.FromArgb(235, 235, 240))) {
      var size = g.MeasureString(line, f); g.DrawString(line, f, b, (Width - size.Width) / 2, 152);
    }
    var track = new Rectangle(60, 186, Width - 120, 6);
    using (var path = Round(track, 3)) using (var b = new SolidBrush(Color.FromArgb(40, 255, 255, 255))) g.FillPath(b, path);
    int fill = Math.Max(6, (int)(track.Width * progress));
    using (var path = Round(new Rectangle(track.X, track.Y, fill, track.Height), 3))
    using (var b = new LinearGradientBrush(track, Color.FromArgb(124, 92, 255), Color.FromArgb(26, 167, 255), 0f)) g.FillPath(b, path);
  }
}

static class Setup {
  [STAThread]
  static void Main() {
    Application.EnableVisualStyles();
    var splash = new Splash();
    string temp = Path.Combine(Path.GetTempPath(), "WinLand-Setup-" + Guid.NewGuid().ToString("N").Substring(0, 8));
    Process app = null; string error = null;
    var ticker = new System.Windows.Forms.Timer { Interval = 120 }; ticker.Tick += (s, e) => splash.Invalidate(); ticker.Start();
    splash.Shown += (s, e) => new Thread(() => {
      try {
        using (var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("payload.zip"))
        using (var zip = new ZipArchive(stream, ZipArchiveMode.Read)) {
          long total = 0, done = 0; foreach (var entry in zip.Entries) total += entry.Length;
          foreach (var entry in zip.Entries) {
            string to = Path.GetFullPath(Path.Combine(temp, entry.FullName));
            if (!to.StartsWith(temp, StringComparison.OrdinalIgnoreCase)) continue; // never outside the folder
            if (entry.FullName.EndsWith("/")) { Directory.CreateDirectory(to); continue; }
            Directory.CreateDirectory(Path.GetDirectoryName(to));
            entry.ExtractToFile(to, true);
            done += entry.Length; float k = total > 0 ? (float)done / total : 1;
            splash.BeginInvoke((Action)(() => splash.Set(k)));
          }
        }
        app = Process.Start(new ProcessStartInfo(Path.Combine(temp, "WinLand", "WinLand.exe"), "--winland-setup " + string.Join(" ", Environment.GetCommandLineArgs(), 1, Environment.GetCommandLineArgs().Length - 1)) { UseShellExecute = false, WorkingDirectory = Path.Combine(temp, "WinLand") });
        // keep Pip on screen until the installer's window is there
        for (int i = 0; i < 150 && !app.HasExited; i++) { Thread.Sleep(100); try { app.Refresh(); if (app.MainWindowHandle != IntPtr.Zero) break; } catch { } }
      } catch (Exception ex) { error = ex.Message; }
      splash.BeginInvoke((Action)(() => splash.Close()));
    }) { IsBackground = true }.Start();
    Application.Run(splash);
    if (error != null) { MessageBox.Show("WinLand n’a pas pu se préparer :\n" + error, "WinLand", MessageBoxButtons.OK, MessageBoxIcon.Error); }
    else if (app != null) app.WaitForExit();
    // clean up (WinLand's helpers may still hold a file for a moment)
    for (int i = 0; i < 20 && Directory.Exists(temp); i++) { try { Directory.Delete(temp, true); } catch { Thread.Sleep(500); } }
  }
}
