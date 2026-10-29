// WinLand.exe: double-click to start WinLand (no console window, WinLand's own icon).
// It starts Electron on this folder; only one WinLand runs at a time (tray-main.cjs), so a second click just
// opens the island. Built by tools/build-launcher.cjs with the C# compiler that comes with Windows.
using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

static class Launcher {
  [STAThread]
  static int Main(string[] args) {
    string dir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\');
    string electron = Path.Combine(dir, "node_modules", "electron", "dist", "electron.exe");
    if (!File.Exists(electron)) {
      MessageBox.Show("WinLand n'est pas encore installé.\n\nOuvre un terminal dans ce dossier et lance : bun install", "WinLand",
        MessageBoxButtons.OK, MessageBoxIcon.Information);
      return 1;
    }
    var line = "\"" + dir + "\"";
    foreach (var a in args) line += " \"" + a.Replace("\"", "") + "\""; // e.g. --settings
    Process.Start(new ProcessStartInfo(electron, line) { WorkingDirectory = dir, UseShellExecute = false });
    return 0;
  }
}
