export interface FsEntry {
  name: string;
  isDir: boolean;
  size: number;
  content: string;
  children: Map<string, FsEntry>;
}

export function createDir(name: string): FsEntry {
  return { name, isDir: true, size: 0, content: "", children: new Map() };
}

export function createFile(name: string, content = ""): FsEntry {
  return { name, isDir: false, size: content.length, content, children: new Map() };
}

export class MiniFS {
  root: FsEntry;
  cwd: FsEntry;
  cwdPath: string[];

  constructor() {
    this.root = createDir("/");
    this.cwd = this.root;
    this.cwdPath = [];
  }

  getPath(): string {
    return "/" + this.cwdPath.join("/");
  }

  resolvePath(name: string): FsEntry | null {
    if (name === "/") return this.root;
    const parts = name.startsWith("/") ? name.split("/").filter(Boolean) : name.split("/").filter(Boolean);
    let cur = name.startsWith("/") ? this.root : this.cwd;
    for (const p of parts) {
      if (p === "..") {
        if (cur === this.root) continue;
        const parentPath = name.startsWith("/") ? parts.slice(0, -1) : this.cwdPath.slice(0, -1);
        let par = this.root;
        for (const pp of parentPath) {
          const c = par.children.get(pp);
          if (!c || !c.isDir) return null;
          par = c;
        }
        cur = par;
      } else if (p === ".") {
        continue;
      } else {
        const c = cur.children.get(p);
        if (!c) return null;
        cur = c;
      }
    }
    return cur;
  }

  exec(cmd: string): string {
    const parts = cmd.trim().split(/\s+/);
    const c = parts[0];
    const args = parts.slice(1);

    switch (c) {
      case "ls": return this.ls();
      case "mkdir": return args[0] ? this.mkdir(args[0]) : "Usage: mkdir <name>";
      case "cd": return args[0] ? this.cd(args[0]) : "Usage: cd <dir>";
      case "create": return args[0] ? this.create(args[0]) : "Usage: create <name>";
      case "write": return args.length >= 2 ? this.write(args[0], args.slice(1).join(" ")) : "Usage: write <file> <content>";
      case "cat": return args[0] ? this.cat(args[0]) : "Usage: cat <file>";
      case "rm": return args[0] ? this.rm(args[0]) : "Usage: rm <name>";
      case "rename": return args.length >= 2 ? this.rename(args[0], args[1]) : "Usage: rename <old> <new>";
      case "pwd": return this.getPath();
      case "format": { this.root = createDir("/"); this.cwd = this.root; this.cwdPath = []; return "Formatted."; }
      case "help": return "Commands: ls, mkdir, cd, create, write, cat, rm, rename, pwd, format, help";
      default: return `Unknown command: ${c}`;
    }
  }

  ls(): string {
    if (this.cwd.children.size === 0) return "(empty)";
    const entries: string[] = [];
    for (const [n, e] of this.cwd.children) {
      entries.push(e.isDir ? `[DIR]  ${n}` : `[FILE] ${n} (${e.size}B)`);
    }
    return entries.join("\n");
  }

  mkdir(name: string): string {
    if (this.cwd.children.has(name)) return `Already exists: ${name}`;
    this.cwd.children.set(name, createDir(name));
    return `Created directory: ${name}`;
  }

  cd(target: string): string {
    if (target === "/") { this.cwd = this.root; this.cwdPath = []; return this.getPath(); }
    if (target === "..") {
      if (this.cwdPath.length === 0) return "/";
      this.cwdPath.pop();
      let cur = this.root;
      for (const p of this.cwdPath) cur = cur.children.get(p)!;
      this.cwd = cur;
      return this.getPath();
    }
    const e = this.cwd.children.get(target);
    if (!e) return `Not found: ${target}`;
    if (!e.isDir) return `Not a directory: ${target}`;
    this.cwdPath.push(target);
    this.cwd = e;
    return this.getPath();
  }

  create(name: string): string {
    if (this.cwd.children.has(name)) return `Already exists: ${name}`;
    this.cwd.children.set(name, createFile(name));
    return `Created file: ${name}`;
  }

  write(name: string, content: string): string {
    const e = this.cwd.children.get(name);
    if (!e) return `Not found: ${name}`;
    if (e.isDir) return `Is a directory: ${name}`;
    e.content += content + "\n";
    e.size = e.content.length;
    return `Written ${content.length + 1} bytes to ${name}`;
  }

  cat(name: string): string {
    const e = this.cwd.children.get(name);
    if (!e) return `Not found: ${name}`;
    if (e.isDir) return `Is a directory: ${name}`;
    return e.content || "(empty file)";
  }

  rm(name: string): string {
    if (!this.cwd.children.has(name)) return `Not found: ${name}`;
    this.cwd.children.delete(name);
    return `Removed: ${name}`;
  }

  rename(oldN: string, newN: string): string {
    const e = this.cwd.children.get(oldN);
    if (!e) return `Not found: ${oldN}`;
    this.cwd.children.delete(oldN);
    e.name = newN;
    this.cwd.children.set(newN, e);
    return `Renamed ${oldN} → ${newN}`;
  }
}
