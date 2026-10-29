// exe-brand.exe <exe> <icon.ico>: gives Electron's program WinLand's icon and name (Task Manager, Explorer),
// like rcedit does, with Windows' own resource functions. Used by tools/build-setup.cjs, built on this PC.
using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;

static class ExeBrand {
  [DllImport("kernel32", SetLastError = true, CharSet = CharSet.Unicode)] static extern IntPtr BeginUpdateResource(string file, bool deleteExisting);
  [DllImport("kernel32", SetLastError = true)] static extern bool UpdateResource(IntPtr h, IntPtr type, IntPtr name, ushort lang, byte[] data, uint size);
  [DllImport("kernel32", SetLastError = true)] static extern bool EndUpdateResource(IntPtr h, bool discard);
  [DllImport("kernel32", SetLastError = true, CharSet = CharSet.Unicode)] static extern IntPtr LoadLibraryEx(string file, IntPtr reserved, uint flags);
  [DllImport("kernel32")] static extern bool FreeLibrary(IntPtr h);
  [DllImport("kernel32")] static extern IntPtr FindResourceEx(IntPtr module, IntPtr type, IntPtr name, ushort lang);
  [DllImport("kernel32")] static extern IntPtr LoadResource(IntPtr module, IntPtr res);
  [DllImport("kernel32")] static extern IntPtr LockResource(IntPtr res);
  [DllImport("kernel32")] static extern uint SizeofResource(IntPtr module, IntPtr res);
  delegate bool NameProc(IntPtr module, IntPtr type, IntPtr name, IntPtr param);
  delegate bool LangProc(IntPtr module, IntPtr type, IntPtr name, ushort lang, IntPtr param);
  [DllImport("kernel32", CharSet = CharSet.Unicode)] static extern bool EnumResourceNames(IntPtr module, IntPtr type, NameProc proc, IntPtr param);
  [DllImport("kernel32", CharSet = CharSet.Unicode)] static extern bool EnumResourceLanguages(IntPtr module, IntPtr type, IntPtr name, LangProc proc, IntPtr param);

  static readonly IntPtr RT_ICON = (IntPtr)3, RT_GROUP_ICON = (IntPtr)14, RT_VERSION = (IntPtr)16;
  class Res { public object Name; public ushort Lang; public byte[] Data; }

  // names are either numbers or strings: keep them as such, they are pointers only while the module is loaded
  static object Keep(IntPtr name) { return ((long)name >> 16) == 0 ? (object)(int)(long)name : Marshal.PtrToStringUni(name); }
  static IntPtr Ptr(object name) { return name is int ? (IntPtr)(int)name : Marshal.StringToHGlobalUni((string)name); }

  static List<Res> Read(IntPtr module, IntPtr type, bool data) {
    var list = new List<Res>();
    EnumResourceNames(module, type, (m, t, n, p) => {
      var name = Keep(n);
      EnumResourceLanguages(m, t, n, (m2, t2, n2, lang, p2) => {
        var r = new Res { Name = name, Lang = lang };
        if (data) { var h = FindResourceEx(m2, t2, n2, lang); var size = SizeofResource(m2, h); r.Data = new byte[size]; Marshal.Copy(LockResource(LoadResource(m2, h)), r.Data, 0, (int)size); }
        list.Add(r); return true;
      }, IntPtr.Zero);
      return true;
    }, IntPtr.Zero);
    return list;
  }

  // same length in UTF-16, so the version block keeps its layout ("WinLand" + NULs where "Electron" was)
  static void Swap(byte[] data, string from, string to) {
    var a = Encoding.Unicode.GetBytes(from); var b = Encoding.Unicode.GetBytes(to.PadRight(from.Length, '\0'));
    for (int i = 0; i + a.Length <= data.Length; i += 2) {
      bool same = true; for (int j = 0; j < a.Length && same; j++) same = data[i + j] == a[j];
      if (same) { Buffer.BlockCopy(b, 0, data, i, b.Length); i += a.Length - 2; }
    }
  }

  static int Main(string[] args) {
    if (args.Length < 2) { Console.Error.WriteLine("exe-brand <exe> <icon.ico>"); return 2; }
    string exe = args[0]; byte[] ico = File.ReadAllBytes(args[1]);
    var module = LoadLibraryEx(exe, IntPtr.Zero, 0x2 /* as data file */);
    if (module == IntPtr.Zero) { Console.Error.WriteLine("cannot read " + exe); return 1; }
    var groups = Read(module, RT_GROUP_ICON, false); var icons = Read(module, RT_ICON, false); var versions = Read(module, RT_VERSION, true);
    FreeLibrary(module);

    var h = BeginUpdateResource(exe, false);
    if (h == IntPtr.Zero) { Console.Error.WriteLine("cannot write " + exe); return 1; }
    foreach (var r in icons) UpdateResource(h, RT_ICON, Ptr(r.Name), r.Lang, null, 0);
    foreach (var r in groups) UpdateResource(h, RT_GROUP_ICON, Ptr(r.Name), r.Lang, null, 0);
    // the .ico: a 6-byte header, 16 bytes per image, then the images; the exe wants 14 bytes per image + their ids
    int count = BitConverter.ToUInt16(ico, 4);
    ushort lang = groups.Count > 0 ? groups[0].Lang : (ushort)1033;
    var group = new MemoryStream(); var w = new BinaryWriter(group);
    w.Write((ushort)0); w.Write((ushort)1); w.Write((ushort)count);
    for (int i = 0; i < count; i++) {
      int e = 6 + i * 16, size = BitConverter.ToInt32(ico, e + 8), offset = BitConverter.ToInt32(ico, e + 12);
      var image = new byte[size]; Buffer.BlockCopy(ico, offset, image, 0, size);
      UpdateResource(h, RT_ICON, (IntPtr)(i + 1), lang, image, (uint)size);
      w.Write(ico, e, 12); w.Write((ushort)(i + 1));
    }
    var groupBytes = group.ToArray();
    UpdateResource(h, RT_GROUP_ICON, Ptr(groups.Count > 0 ? groups[0].Name : (object)1), lang, groupBytes, (uint)groupBytes.Length);
    foreach (var v in versions) {
      Swap(v.Data, "electron.exe", "WinLand.exe"); Swap(v.Data, "Electron", "WinLand"); Swap(v.Data, "GitHub, Inc.", "WinLand");
      UpdateResource(h, RT_VERSION, Ptr(v.Name), v.Lang, v.Data, (uint)v.Data.Length);
    }
    if (!EndUpdateResource(h, false)) { Console.Error.WriteLine("write failed: " + Marshal.GetLastWin32Error()); return 1; }
    Console.WriteLine("branded " + Path.GetFileName(exe) + " (" + count + " icons)");
    return 0;
  }
}
