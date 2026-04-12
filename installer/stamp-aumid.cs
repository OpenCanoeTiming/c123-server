// stamp-aumid.exe — Set System.AppUserModel.ID on a Start Menu shortcut.
// Compiled during build (scripts/prepare-installer-payload.js) and called
// by the Inno Setup installer post-install step.
//
// Usage: stamp-aumid.exe <shortcut.lnk> <aumid> [target] [args] [icon] [workdir]
//
// Creates (or overwrites) a .lnk file with the given AUMID so that WinRT
// toast notifications show under the correct app identity.
// Returns exit code 0 on success, 1 on failure (message on stderr).

using System;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.ComTypes;

// --- COM class ---

[ComImport, Guid("00021401-0000-0000-C000-000000000046")]
class CShellLink {}

// --- COM interfaces ---

[ComImport, Guid("000214F9-0000-0000-C000-000000000046"),
 InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IShellLinkW
{
    void GetPath([Out, MarshalAs(UnmanagedType.LPWStr)] System.Text.StringBuilder pszFile,
                 int cch, IntPtr pfd, int fFlags);
    void GetIDList(out IntPtr ppidl);
    void SetIDList(IntPtr pidl);
    void GetDescription([Out, MarshalAs(UnmanagedType.LPWStr)] System.Text.StringBuilder pszName, int cch);
    void SetDescription([MarshalAs(UnmanagedType.LPWStr)] string pszName);
    void GetWorkingDirectory([Out, MarshalAs(UnmanagedType.LPWStr)] System.Text.StringBuilder pszDir, int cch);
    void SetWorkingDirectory([MarshalAs(UnmanagedType.LPWStr)] string pszDir);
    void GetArguments([Out, MarshalAs(UnmanagedType.LPWStr)] System.Text.StringBuilder pszArgs, int cch);
    void SetArguments([MarshalAs(UnmanagedType.LPWStr)] string pszArgs);
    void GetHotkey(out short pwHotkey);
    void SetHotkey(short wHotkey);
    void GetShowCmd(out int piShowCmd);
    void SetShowCmd(int iShowCmd);
    void GetIconLocation([Out, MarshalAs(UnmanagedType.LPWStr)] System.Text.StringBuilder pszIconPath,
                         int cch, out int piIcon);
    void SetIconLocation([MarshalAs(UnmanagedType.LPWStr)] string pszIconPath, int iIcon);
    void SetRelativePath([MarshalAs(UnmanagedType.LPWStr)] string pszPathRel, int dwReserved);
    void Resolve(IntPtr hwnd, int fFlags);
    void SetPath([MarshalAs(UnmanagedType.LPWStr)] string pszFile);
}

// IPropertyStore — [PreserveSig] is critical: without it, .NET adds a
// phantom [out, retval] parameter that corrupts the COM vtable call.
[ComImport, Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99"),
 InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IPropertyStore
{
    [PreserveSig] int GetCount(out uint cProps);
    [PreserveSig] int GetAt(uint iProp, out PropertyKey pkey);
    [PreserveSig] int GetValue(ref PropertyKey key, out PropVariant pv);
    [PreserveSig] int SetValue(ref PropertyKey key, ref PropVariant propvar);
    [PreserveSig] int Commit();
}

// --- Structs ---

// PROPERTYKEY = GUID fmtid + DWORD pid.
// System.AppUserModel.ID = {9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3}, 5
[StructLayout(LayoutKind.Sequential)]
struct PropertyKey
{
    public Guid fmtid;
    public uint pid;
}

// PROPVARIANT — must use Explicit layout. Sequential with ushort padding
// fields does not marshal correctly for IPropertyStore COM calls.
[StructLayout(LayoutKind.Explicit)]
struct PropVariant
{
    [FieldOffset(0)] public ushort vt;   // VARTYPE (VT_LPWSTR = 31)
    [FieldOffset(8)] public IntPtr data; // union: pwszVal for VT_LPWSTR
}

// --- Entry point ---

class Program
{
    static int Main(string[] args)
    {
        if (args.Length < 2)
        {
            Console.Error.WriteLine("Usage: stamp-aumid <shortcut.lnk> <aumid> [target] [args] [icon] [workdir]");
            return 1;
        }

        string lnkPath = args[0];
        string aumid   = args[1];
        string target   = args.Length > 2 ? args[2] : null;
        string linkArgs = args.Length > 3 ? args[3] : null;
        string icon     = args.Length > 4 ? args[4] : null;
        string workDir  = args.Length > 5 ? args[5] : null;

        try
        {
            var link = (IShellLinkW)new CShellLink();

            if (target != null)  link.SetPath(target);
            if (linkArgs != null) link.SetArguments(linkArgs);
            if (icon != null)    link.SetIconLocation(icon, 0);
            if (workDir != null) link.SetWorkingDirectory(workDir);

            // Set AUMID via IPropertyStore
            var ps  = (IPropertyStore)link;
            var key = new PropertyKey();
            key.fmtid = new Guid("9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3");
            key.pid   = 5;

            var pv = new PropVariant();
            pv.vt   = 31; // VT_LPWSTR
            pv.data = Marshal.StringToCoTaskMemUni(aumid);

            int hr = ps.SetValue(ref key, ref pv);
            if (hr != 0) { Console.Error.WriteLine("SetValue failed: 0x" + hr.ToString("X8")); return 1; }

            hr = ps.Commit();
            if (hr != 0) { Console.Error.WriteLine("Commit failed: 0x" + hr.ToString("X8")); return 1; }

            Marshal.FreeCoTaskMem(pv.data);

            // Save the shortcut
            string dir = System.IO.Path.GetDirectoryName(lnkPath);
            if (!string.IsNullOrEmpty(dir))
                System.IO.Directory.CreateDirectory(dir);
            ((IPersistFile)link).Save(lnkPath, true);

            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
    }
}