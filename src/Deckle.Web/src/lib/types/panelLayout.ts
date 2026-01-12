export type PanelPosition = 'left' | 'right' | 'top' | 'bottom' | 'center';
export type PanelOrientation = 'horizontal' | 'vertical';

export interface Panel {
  id: string;
  title: string;
  position: PanelPosition;
  size: number; // percentage or pixels
  minSize?: number;
  maxSize?: number;
  visible: boolean;
  order?: number;
}

export interface TabGroup {
  id: string;
  position: PanelPosition;
  panelIds: string[];
  activePanel: string;
}

export interface PanelLayout {
  panels: Record<string, Panel>;
  tabGroups: TabGroup[];
  splitSizes: {
    horizontal?: number[]; // [left%, right%]
    vertical?: number[]; // [top%, bottom%]
  };
}

export const DEFAULT_PANEL_LAYOUT: PanelLayout = {
  panels: {
    preview: {
      id: 'preview',
      title: 'Preview',
      position: 'left',
      size: 35,
      minSize: 20,
      maxSize: 60,
      visible: true
    },
    editor: {
      id: 'editor',
      title: 'Editor',
      position: 'right',
      size: 65,
      minSize: 40,
      visible: true
    },
    dataSource: {
      id: 'dataSource',
      title: 'Linked Data Source',
      position: 'bottom',
      size: 30,
      minSize: 15,
      maxSize: 60,
      visible: true
    }
  },
  tabGroups: [],
  splitSizes: {
    horizontal: [35, 65],
    vertical: [70, 30]
  }
};
