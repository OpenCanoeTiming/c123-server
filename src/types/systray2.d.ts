declare module 'systray2' {
  export interface MenuItem {
    title: string;
    tooltip: string;
    checked?: boolean;
    enabled?: boolean;
    hidden?: boolean;
    items?: MenuItem[];
  }

  export interface MenuConfig {
    icon: string;
    title: string;
    tooltip: string;
    items: MenuItem[];
  }

  export interface ClickAction {
    type: 'clicked';
    item: MenuItem;
    seq_id: number;
  }

  export interface UpdateAction {
    type: 'update-item';
    item: Partial<MenuItem>;
    seq_id: number;
  }

  export interface UpdateMenuAction {
    type: 'update-menu';
    menu: Partial<MenuConfig>;
  }

  export interface UpdateMenuAndItemAction {
    type: 'update-menu-and-item';
    menu: Partial<MenuConfig>;
    item: Partial<MenuItem>;
    seq_id: number;
  }

  export default class SysTray {
    constructor(options: { menu: MenuConfig; debug?: boolean; copyDir?: boolean });
    onClick(callback: (action: ClickAction) => void): void;
    sendAction(action: UpdateAction | UpdateMenuAction | UpdateMenuAndItemAction): void;
    ready(): Promise<void>;
    kill(exitNode?: boolean): void;
  }
}
