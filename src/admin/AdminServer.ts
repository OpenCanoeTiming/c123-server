import express, { Express, Request, Response } from 'express';
import { Server } from 'node:http';
import type { EventState } from '../state/EventState.js';
import type { Source } from '../sources/types.js';
import type { WebSocketServer } from '../ws/WebSocketServer.js';
import type { XmlDataService } from '../service/XmlDataService.js';
import type {
  AdminServerConfig,
  ServerStatusResponse,
  SourceStatusInfo,
  ScoreboardConfig,
} from './types.js';
import { Logger } from '../utils/logger.js';

const DEFAULT_PORT = 8084;
const VERSION = '0.1.0';

interface RegisteredSource {
  name: string;
  type: 'tcp' | 'udp' | 'xml';
  source: Source;
  host?: string;
  port?: number;
  path?: string;
}

/**
 * Admin HTTP server for monitoring and configuration.
 *
 * Provides REST API endpoints:
 * - GET /api/status - Overall server status
 * - GET /api/sources - Data source status
 * - GET /api/scoreboards - Connected scoreboards
 */
export class AdminServer {
  private readonly port: number;
  private readonly app: Express;
  private server: Server | null = null;
  private startTime: number = Date.now();

  private eventState: EventState | null = null;
  private sources: RegisteredSource[] = [];
  private wsServer: WebSocketServer | null = null;
  private xmlDataService: XmlDataService | null = null;

  constructor(config?: Partial<AdminServerConfig>) {
    this.port = config?.port ?? DEFAULT_PORT;
    this.app = express();
    this.setupRoutes();
  }

  /**
   * Register EventState for status reporting
   */
  setEventState(state: EventState): void {
    this.eventState = state;
  }

  /**
   * Register WebSocketServer for scoreboard tracking
   */
  setWebSocketServer(ws: WebSocketServer): void {
    this.wsServer = ws;
  }

  /**
   * Register XmlDataService for XML REST API
   */
  setXmlDataService(service: XmlDataService): void {
    this.xmlDataService = service;
  }

  /**
   * Register a data source for status reporting
   */
  registerSource(
    name: string,
    type: 'tcp' | 'udp' | 'xml',
    source: Source,
    meta?: { host?: string; port?: number; path?: string }
  ): void {
    this.sources.push({
      name,
      type,
      source,
      ...meta,
    });
  }

  /**
   * Start the admin server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        resolve();
        return;
      }

      this.startTime = Date.now();

      this.server = this.app.listen(this.port, () => {
        Logger.info('Admin', `Server listening on port ${this.getPort()}`);
        resolve();
      });

      this.server.on('error', (err) => {
        if (!this.server) {
          reject(err);
        }
      });
    });
  }

  /**
   * Stop the admin server
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close(() => {
        this.server = null;
        resolve();
      });
    });
  }

  /**
   * Get the port the server is listening on
   */
  getPort(): number {
    if (this.server) {
      const addr = this.server.address();
      if (addr && typeof addr === 'object') {
        return addr.port;
      }
    }
    return this.port;
  }

  /**
   * Setup Express routes
   */
  private setupRoutes(): void {
    this.app.use(express.json());

    // CORS headers for dashboard
    this.app.use((_req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      next();
    });

    // API routes
    this.app.get('/api/status', this.handleStatus.bind(this));
    this.app.get('/api/sources', this.handleSources.bind(this));
    this.app.get('/api/scoreboards', this.handleScoreboards.bind(this));
    this.app.post('/api/scoreboards/:id/config', this.handleScoreboardConfig.bind(this));

    // XML REST API routes
    this.app.get('/api/xml/status', this.handleXmlStatus.bind(this));
    this.app.get('/api/xml/schedule', this.handleXmlSchedule.bind(this));
    this.app.get('/api/xml/participants', this.handleXmlParticipants.bind(this));
    this.app.get('/api/xml/races', this.handleXmlRaces.bind(this));
    this.app.get('/api/xml/races/:id', this.handleXmlRaceDetail.bind(this));
    this.app.get('/api/xml/races/:id/startlist', this.handleXmlRaceStartlist.bind(this));
    this.app.get('/api/xml/races/:id/results', this.handleXmlRaceResults.bind(this));
    this.app.get('/api/xml/races/:id/results/:run', this.handleXmlRaceResultsByRun.bind(this));

    // Health check
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({ status: 'ok' });
    });

    // Dashboard UI
    this.app.get('/', (_req: Request, res: Response) => {
      res.send(this.getDashboardHtml());
    });
  }

  /**
   * Generate inline dashboard HTML
   */
  private getDashboardHtml(): string {
    return `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>C123 Server - Admin Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a2e; color: #eee; padding: 20px; }
    h1 { color: #00d4ff; margin-bottom: 20px; }
    h2 { color: #ccc; font-size: 1.1em; margin: 20px 0 10px; border-bottom: 1px solid #333; padding-bottom: 5px; }
    .card { background: #16213e; border-radius: 8px; padding: 15px; margin-bottom: 15px; }
    .status { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 8px; }
    .status.connected { background: #00ff88; }
    .status.disconnected { background: #ff4444; }
    .status.connecting { background: #ffaa00; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
    .stat { text-align: center; }
    .stat-value { font-size: 2em; color: #00d4ff; font-weight: bold; }
    .stat-label { color: #888; font-size: 0.9em; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #333; }
    th { color: #888; font-weight: normal; }
    .config-form { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .config-form label { display: flex; align-items: center; gap: 5px; cursor: pointer; }
    .config-form input[type="checkbox"] { width: 16px; height: 16px; }
    .btn { background: #00d4ff; color: #1a1a2e; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; }
    .btn:hover { background: #00b8e6; }
    .error { color: #ff6b6b; }
    #lastUpdate { color: #666; font-size: 0.85em; margin-top: 20px; }
  </style>
</head>
<body>
  <h1>C123 Server Dashboard</h1>

  <div class="grid">
    <div class="card stat">
      <div class="stat-value" id="uptime">-</div>
      <div class="stat-label">Uptime</div>
    </div>
    <div class="card stat">
      <div class="stat-value" id="scoreboardCount">0</div>
      <div class="stat-label">Scoreboards</div>
    </div>
    <div class="card stat">
      <div class="stat-value" id="onCourseCount">0</div>
      <div class="stat-label">On Course</div>
    </div>
    <div class="card stat">
      <div class="stat-value" id="resultsCount">0</div>
      <div class="stat-label">Results</div>
    </div>
  </div>

  <h2>Event</h2>
  <div class="card">
    <div id="eventInfo">Loading...</div>
  </div>

  <h2>Sources</h2>
  <div class="card">
    <table id="sourcesTable">
      <thead><tr><th>Name</th><th>Type</th><th>Status</th><th>Details</th></tr></thead>
      <tbody></tbody>
    </table>
  </div>

  <h2>Connected Scoreboards</h2>
  <div class="card">
    <table id="scoreboardsTable">
      <thead><tr><th>ID</th><th>Connected</th><th>Last Activity</th><th>Config</th></tr></thead>
      <tbody></tbody>
    </table>
    <div id="noScoreboards" style="color: #666; padding: 10px;">No scoreboards connected</div>
  </div>

  <div id="lastUpdate"></div>

  <script>
    function formatUptime(seconds) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      if (h > 0) return h + 'h ' + m + 'm';
      if (m > 0) return m + 'm ' + s + 's';
      return s + 's';
    }

    function formatTime(iso) {
      if (!iso) return '-';
      const d = new Date(iso);
      return d.toLocaleTimeString();
    }

    function statusClass(status) {
      if (status === 'connected') return 'connected';
      if (status === 'connecting') return 'connecting';
      return 'disconnected';
    }

    async function refresh() {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();

        document.getElementById('uptime').textContent = formatUptime(data.uptime);
        document.getElementById('scoreboardCount').textContent = data.scoreboards.connected;
        document.getElementById('onCourseCount').textContent = data.event.onCourseCount;
        document.getElementById('resultsCount').textContent = data.event.resultsCount;

        const eventInfo = data.event.raceName
          ? '<strong>' + data.event.raceName + '</strong> (ID: ' + (data.event.currentRaceId || '-') + ')'
          : 'No active race';
        document.getElementById('eventInfo').innerHTML = eventInfo;

        // Sources
        const sourcesBody = document.querySelector('#sourcesTable tbody');
        sourcesBody.innerHTML = data.sources.map(s =>
          '<tr>' +
          '<td>' + s.name + '</td>' +
          '<td>' + s.type.toUpperCase() + '</td>' +
          '<td><span class="status ' + statusClass(s.status) + '"></span>' + s.status + '</td>' +
          '<td>' + (s.host ? s.host + ':' + s.port : (s.path || '-')) + '</td>' +
          '</tr>'
        ).join('');

        // Scoreboards
        const scoreboardsBody = document.querySelector('#scoreboardsTable tbody');
        const noScoreboards = document.getElementById('noScoreboards');
        if (data.scoreboards.list.length === 0) {
          scoreboardsBody.innerHTML = '';
          noScoreboards.style.display = 'block';
        } else {
          noScoreboards.style.display = 'none';
          scoreboardsBody.innerHTML = data.scoreboards.list.map(s =>
            '<tr>' +
            '<td>' + s.id.substring(0, 8) + '</td>' +
            '<td>' + formatTime(s.connectedAt) + '</td>' +
            '<td>' + formatTime(s.lastActivity) + '</td>' +
            '<td>' + formatConfig(s.config) + '</td>' +
            '</tr>'
          ).join('');
        }

        document.getElementById('lastUpdate').textContent = 'Last update: ' + new Date().toLocaleTimeString();
      } catch (e) {
        document.getElementById('lastUpdate').innerHTML = '<span class="error">Error: ' + e.message + '</span>';
      }
    }

    function formatConfig(cfg) {
      if (!cfg) return '-';
      const parts = [];
      if (cfg.showOnCourse === false) parts.push('oncourse: off');
      if (cfg.showResults === false) parts.push('results: off');
      if (cfg.raceFilter && cfg.raceFilter.length) parts.push('filter: ' + cfg.raceFilter.join(', '));
      return parts.length ? parts.join('; ') : 'default';
    }

    refresh();
    setInterval(refresh, 2000);
  </script>
</body>
</html>`;
  }

  /**
   * GET /api/status - Overall server status
   */
  private handleStatus(_req: Request, res: Response): void {
    const state = this.eventState?.state;
    const sessions = this.wsServer?.getSessions() ?? [];

    const response: ServerStatusResponse = {
      version: VERSION,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      sources: this.getSourcesStatus(),
      scoreboards: {
        connected: sessions.length,
        list: sessions.map((s) => s.getInfo()),
      },
      event: {
        currentRaceId: state?.currentRaceId ?? null,
        raceName: state?.results?.mainTitle ?? null,
        onCourseCount: state?.onCourse.length ?? 0,
        resultsCount: state?.results?.rows.length ?? 0,
      },
    };

    res.json(response);
  }

  /**
   * GET /api/sources - Data source status
   */
  private handleSources(_req: Request, res: Response): void {
    res.json({ sources: this.getSourcesStatus() });
  }

  /**
   * GET /api/scoreboards - Connected scoreboards
   */
  private handleScoreboards(_req: Request, res: Response): void {
    const sessions = this.wsServer?.getSessions() ?? [];
    res.json({
      connected: sessions.length,
      scoreboards: sessions.map((s) => s.getInfo()),
    });
  }

  /**
   * POST /api/scoreboards/:id/config - Update scoreboard configuration
   */
  private handleScoreboardConfig(req: Request, res: Response): void {
    const { id } = req.params;
    const config = req.body as Partial<ScoreboardConfig>;

    if (!this.wsServer) {
      res.status(503).json({ error: 'WebSocket server not available' });
      return;
    }

    const session = this.wsServer.getSession(id);
    if (!session) {
      res.status(404).json({ error: 'Scoreboard not found' });
      return;
    }

    // Validate config
    if (config.raceFilter !== undefined && !Array.isArray(config.raceFilter)) {
      res.status(400).json({ error: 'raceFilter must be an array' });
      return;
    }
    if (config.showOnCourse !== undefined && typeof config.showOnCourse !== 'boolean') {
      res.status(400).json({ error: 'showOnCourse must be a boolean' });
      return;
    }
    if (config.showResults !== undefined && typeof config.showResults !== 'boolean') {
      res.status(400).json({ error: 'showResults must be a boolean' });
      return;
    }

    this.wsServer.setSessionConfig(id, config);
    res.json({ success: true, config: session.getConfig() });
  }

  /**
   * Get status of all registered sources
   */
  private getSourcesStatus(): SourceStatusInfo[] {
    return this.sources.map((s) => {
      const info: SourceStatusInfo = {
        name: s.name,
        type: s.type,
        status: s.source.status,
      };
      if (s.host !== undefined) info.host = s.host;
      if (s.port !== undefined) info.port = s.port;
      if (s.path !== undefined) info.path = s.path;
      return info;
    });
  }

  /**
   * GET /api/xml/status - XML data availability and stats
   */
  private async handleXmlStatus(_req: Request, res: Response): Promise<void> {
    if (!this.xmlDataService) {
      res.status(503).json({ error: 'XML data service not available' });
      return;
    }

    try {
      const status = await this.xmlDataService.getStatus();
      res.json(status);
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/xml/schedule - Race schedule
   */
  private async handleXmlSchedule(_req: Request, res: Response): Promise<void> {
    if (!this.xmlDataService) {
      res.status(503).json({ error: 'XML data service not available' });
      return;
    }

    try {
      const schedule = await this.xmlDataService.getSchedule();
      res.json({ schedule });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/xml/participants - All participants
   */
  private async handleXmlParticipants(_req: Request, res: Response): Promise<void> {
    if (!this.xmlDataService) {
      res.status(503).json({ error: 'XML data service not available' });
      return;
    }

    try {
      const participants = await this.xmlDataService.getParticipants();
      res.json({ participants });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/xml/races - List of all races
   */
  private async handleXmlRaces(_req: Request, res: Response): Promise<void> {
    if (!this.xmlDataService) {
      res.status(503).json({ error: 'XML data service not available' });
      return;
    }

    try {
      const races = await this.xmlDataService.getRaces();
      res.json({ races });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/xml/races/:id - Race detail
   */
  private async handleXmlRaceDetail(req: Request, res: Response): Promise<void> {
    if (!this.xmlDataService) {
      res.status(503).json({ error: 'XML data service not available' });
      return;
    }

    try {
      const { id } = req.params;
      const race = await this.xmlDataService.getRaceDetail(id);

      if (!race) {
        res.status(404).json({ error: 'Race not found' });
        return;
      }

      res.json({ race });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/xml/races/:id/startlist - Race startlist
   */
  private async handleXmlRaceStartlist(req: Request, res: Response): Promise<void> {
    if (!this.xmlDataService) {
      res.status(503).json({ error: 'XML data service not available' });
      return;
    }

    try {
      const { id } = req.params;
      const startlist = await this.xmlDataService.getStartlist(id);

      if (!startlist) {
        res.status(404).json({ error: 'Race not found' });
        return;
      }

      res.json({ startlist });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/xml/races/:id/results - Race results (with optional ?merged=true)
   */
  private async handleXmlRaceResults(req: Request, res: Response): Promise<void> {
    if (!this.xmlDataService) {
      res.status(503).json({ error: 'XML data service not available' });
      return;
    }

    try {
      const { id } = req.params;
      const merged = req.query.merged === 'true';

      if (merged) {
        // Get merged results for the class
        const race = await this.xmlDataService.getRaceDetail(id);
        if (!race) {
          res.status(404).json({ error: 'Race not found' });
          return;
        }

        const results = await this.xmlDataService.getMergedResults(race.classId);
        res.json({ results, merged: true, classId: race.classId });
        return;
      }

      const results = await this.xmlDataService.getResultsWithParticipants(id);

      if (!results) {
        res.status(404).json({ error: 'Race not found or no results' });
        return;
      }

      res.json({ results });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/xml/races/:id/results/:run - Race results for specific run (BR1 or BR2)
   */
  private async handleXmlRaceResultsByRun(req: Request, res: Response): Promise<void> {
    if (!this.xmlDataService) {
      res.status(503).json({ error: 'XML data service not available' });
      return;
    }

    try {
      const { id, run } = req.params;
      const runUpper = run.toUpperCase();

      if (runUpper !== 'BR1' && runUpper !== 'BR2') {
        res.status(400).json({ error: 'Invalid run parameter. Use BR1 or BR2.' });
        return;
      }

      // Find the race detail to get classId
      const race = await this.xmlDataService.getRaceDetail(id);
      if (!race) {
        res.status(404).json({ error: 'Race not found' });
        return;
      }

      // Find the specific run's raceId
      const races = await this.xmlDataService.getRaces();
      const targetRace = races.find((r) => r.classId === race.classId && r.disId === runUpper);

      if (!targetRace) {
        res.status(404).json({ error: `No ${runUpper} race found for this class` });
        return;
      }

      const results = await this.xmlDataService.getResultsWithParticipants(targetRace.raceId);

      if (!results) {
        res.status(404).json({ error: 'No results available for this run' });
        return;
      }

      res.json({ results, run: runUpper, raceId: targetRace.raceId });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }
}
