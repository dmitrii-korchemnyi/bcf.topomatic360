export type MessageType = "info" | "warning" | "error";

export interface Disposable {
  dispose(): void;
}

export interface OutputChannel {
  appendLine(message: string): void;
  show?(): void;
  dispose?(): void;
}

export interface DialogFilter {
  name: string;
  extensions: string[];
}

export interface DialogOptions {
  title: string;
  filters?: DialogFilter[];
}

export interface QuickPickOptions {
  placeHolder?: string;
  title?: string;
}

export interface InputBoxOptions {
  title?: string;
  prompt?: string;
  placeHolder?: string;
  value?: string;
}

export interface TopomaticContext {
  app?: unknown;
  cadview?: unknown;
  window?: unknown;
  manager?: {
    broadcast?: (event: string, payload?: unknown) => void;
  };
  el?: HTMLElement;
  value?: unknown;
  treeview?: {
    message?: string;
    onDidBroadcast?: (handler: (event: { event: string }) => void) => void;
  };
  showMessage(message: string, type?: MessageType, options?: unknown): void;
  showInputBox(options?: InputBoxOptions): Promise<string | undefined>;
  showQuickPick(items: string[], options?: QuickPickOptions): Promise<string | undefined>;
  openDialog(options: DialogOptions): Promise<unknown>;
  saveDialog(options: DialogOptions): Promise<unknown>;
  showDefinedDialog?(options: { title: string; content: HTMLElement; width?: number; height?: number }): Promise<unknown>;
  createOutputChannel(name: string): OutputChannel;
  setStatusBarMessage(message: string, ...args: unknown[]): Disposable;
  createEventHandler?<T>(): {
    fire(value?: T): void;
    event?: unknown;
  };
}

export interface TreeItem {
  id: string;
  label: string;
  description?: string;
  details?: string;
  contextValue?: string;
  icon?: string;
  children?: TreeItem[];
  command?: string;
  dblCommand?: string;
}

export interface TreeViewOptions<T extends TreeItem> {
  treeDataProvider: {
    onDidChangeTreeData?: unknown;
    getChildren(element?: T): T[];
    hasChildren(element: T): boolean;
  };
}
