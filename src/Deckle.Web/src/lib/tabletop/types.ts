export interface ZoneDef {
  id: string;
  label: string;
  x: number;
  y: number;
  minWidth: number;
  minHeight: number;
}

export interface TabletopController {
  addZone(zone: ZoneDef): void;
  getZones(): ZoneDef[];
  setPlayerCount(count: number): void;
  getPlayerCount(): number;
  getComponentName(id: string): string;
  getComponentsInZone(componentId: string, zoneId: string): string[];
  moveComponents(componentIds: string[], toZoneId: string): Promise<void>;
  promptPlayerCount(min: number, max: number): Promise<number>;
  promptChoosePlayer(playerCount: number): Promise<number>;
  zoomToFitAll(): void;
  zoomToFitZone(zoneId: string): void;
}
