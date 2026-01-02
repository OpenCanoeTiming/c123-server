declare module 'node-windows' {
  export interface ServiceOptions {
    name: string;
    description?: string;
    script: string;
    nodeOptions?: string[];
    env?: Array<{ name: string; value: string }>;
  }

  export class Service {
    constructor(options: ServiceOptions);
    install(): void;
    uninstall(): void;
    start(): void;
    stop(): void;
    on(event: 'install' | 'uninstall' | 'start' | 'stop' | 'alreadyinstalled', callback: () => void): void;
    on(event: 'error', callback: (err: Error) => void): void;
  }
}
