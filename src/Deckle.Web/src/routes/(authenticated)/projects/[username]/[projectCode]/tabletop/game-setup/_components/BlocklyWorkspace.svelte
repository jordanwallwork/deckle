<script lang="ts">
  import { browser } from '$app/environment';
  import type { GameComponent } from '$lib/types';
  import { PRESET_ZONE_BLOCKLY_OPTIONS } from '$lib/tabletop/zones';

  interface Props {
    components: GameComponent[];
    storageKey: string;
    initialState?: string | null;
  }

  let { components, storageKey, initialState = null }: Props = $props();

  let containerEl = $state<HTMLDivElement | null>(null);

  // Reactive component options — read lazily by FieldDropdown getters so they
  // always reflect the latest components list without re-creating the workspace.
  let componentOptions = $state<[string, string][]>([['(no components)', '__none__']]);
  $effect(() => {
    componentOptions =
      components.length > 0
        ? (components.map((c) => [c.name, c.id]) as [string, string][])
        : [['(no components)', '__none__']];
  });

  // ── Exported methods for the parent ────────────────────────────────────────
  let _workspace: any = null;
  let _Blockly: any = null;

  export function clear() {
    _workspace?.clear();
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  }

  export function getState(): string | null {
    if (!_workspace || !_Blockly) return null;
    try {
      const state = _Blockly.serialization.workspaces.save(_workspace);
      return JSON.stringify(state);
    } catch {
      return null;
    }
  }

  // ── Custom renderer ──────────────────────────────────────────────────────────
  // Registers a custom Zelos-based renderer with type-specific connection shapes:
  //   ZONE       → triangular tab (pointed V-shape / chevron)
  //   PLAYER     → trapezoid tab (beveled corners, flat middle)
  //   COMPONENTS → square tab (rectangular notch, 90° corners)
  //   other      → Zelos default (round)
  function registerDeckleRenderer(Blockly: any) {
    class DeckleConstantProvider extends Blockly.zelos.ConstantProvider {
      TRIANGULAR_TAB: any = null;
      TRAPEZOID_TAB: any = null;
      SQUARE_TAB: any = null;

      init() {
        super.init();
        this.MEDIUM_PADDING = 4;
        this.LARGE_PADDING = 6;
        this.FIELD_TEXT_FONTWEIGHT = '400';
        this.TRIANGULAR_TAB = this.makeTriangularTab();
        this.TRAPEZOID_TAB = this.makeTrapezoidTab();
        this.SQUARE_TAB = this.makeSquareTab();
      }

      makeTriangularTab() {
        const maxWidth: number = this.MAX_DYNAMIC_CONNECTION_SHAPE_WIDTH;
        return {
          type: this.SHAPES.HEXAGONAL,
          isDynamic: true,
          width(height: number) {
            const h = height / 2;
            return h > maxWidth ? maxWidth : h;
          },
          height(height: number) {
            return height;
          },
          connectionOffsetY(height: number) {
            return height / 2;
          },
          connectionOffsetX(height: number) {
            return -height / 2;
          },
          pathDown(height: number) {
            const h = height / 2;
            const w = h > maxWidth ? maxWidth : h;
            return `l ${-w},${h} l ${w},${h}`;
          },
          pathUp(height: number) {
            const h = height / 2;
            const w = h > maxWidth ? maxWidth : h;
            return `l ${-w},${-h} l ${w},${-h}`;
          },
          pathRightDown(height: number) {
            const h = height / 2;
            const w = h > maxWidth ? maxWidth : h;
            return `l ${w},${h} l ${-w},${h}`;
          },
          pathRightUp(height: number) {
            const h = height / 2;
            const w = h > maxWidth ? maxWidth : h;
            return `l ${w},${-h} l ${-w},${-h}`;
          }
        };
      }

      makeTrapezoidTab() {
        const maxWidth: number = this.MAX_DYNAMIC_CONNECTION_SHAPE_WIDTH;
        return {
          type: this.SHAPES.HEXAGONAL,
          isDynamic: true,
          width(height: number) {
            const w = height * 0.4;
            return w > maxWidth ? maxWidth : w;
          },
          height(height: number) {
            return height;
          },
          connectionOffsetY(height: number) {
            return height / 2;
          },
          connectionOffsetX(height: number) {
            const w = height * 0.4;
            return -(w > maxWidth ? maxWidth : w);
          },
          pathDown(height: number) {
            const w = Math.min(height * 0.4, maxWidth);
            const bevel = height * 0.2;
            return `l ${-w},${bevel} l 0,${height - 2 * bevel} l ${w},${bevel}`;
          },
          pathUp(height: number) {
            const w = Math.min(height * 0.4, maxWidth);
            const bevel = height * 0.2;
            return `l ${-w},${-bevel} l 0,${-(height - 2 * bevel)} l ${w},${-bevel}`;
          },
          pathRightDown(height: number) {
            const w = Math.min(height * 0.4, maxWidth);
            const bevel = height * 0.2;
            return `l ${w},${bevel} l 0,${height - 2 * bevel} l ${-w},${bevel}`;
          },
          pathRightUp(height: number) {
            const w = Math.min(height * 0.4, maxWidth);
            const bevel = height * 0.2;
            return `l ${w},${-bevel} l 0,${-(height - 2 * bevel)} l ${-w},${-bevel}`;
          }
        };
      }

      makeSquareTab() {
        const maxWidth: number = this.MAX_DYNAMIC_CONNECTION_SHAPE_WIDTH;
        return {
          type: this.SHAPES.HEXAGONAL,
          isDynamic: true,
          width(height: number) {
            const w = height * 0.35;
            return w > maxWidth ? maxWidth : w;
          },
          height(height: number) {
            return height;
          },
          connectionOffsetY(height: number) {
            return height / 2;
          },
          connectionOffsetX(height: number) {
            const w = height * 0.35;
            return -(w > maxWidth ? maxWidth : w);
          },
          pathDown(height: number) {
            const w = Math.min(height * 0.35, maxWidth);
            return `l ${-w},0 l 0,${height} l ${w},0`;
          },
          pathUp(height: number) {
            const w = Math.min(height * 0.35, maxWidth);
            return `l ${-w},0 l 0,${-height} l ${w},0`;
          },
          pathRightDown(height: number) {
            const w = Math.min(height * 0.35, maxWidth);
            return `l ${w},0 l 0,${height} l ${-w},0`;
          },
          pathRightUp(height: number) {
            const w = Math.min(height * 0.35, maxWidth);
            return `l ${w},0 l 0,${-height} l ${-w},0`;
          }
        };
      }

      shapeFor(connection: any) {
        const { INPUT_VALUE, OUTPUT_VALUE } = Blockly.ConnectionType;
        if (connection.type !== INPUT_VALUE && connection.type !== OUTPUT_VALUE) {
          return super.shapeFor(connection);
        }

        const checks: string[] | null =
          connection.getCheck() ?? connection.targetConnection?.getCheck() ?? null;

        if (checks?.includes('ZONE')) return this.TRIANGULAR_TAB;
        if (checks?.includes('PLAYER')) return this.TRAPEZOID_TAB;
        if (checks?.includes('COMPONENTS')) return this.SQUARE_TAB;
        return super.shapeFor(connection);
      }
    }

    class DeckleRenderer extends Blockly.zelos.Renderer {
      makeConstants_() {
        return new DeckleConstantProvider();
      }
    }

    try {
      Blockly.blockRendering.register('deckle', DeckleRenderer);
    } catch {
      // Already registered (hot-reload); ignore
    }
  }

  // ── Workspace lifecycle ─────────────────────────────────────────────────────
  $effect(() => {
    if (!browser || !containerEl) return;

    let disposed = false;

    (async () => {
      // Dynamic import keeps Blockly out of the SSR bundle
      const Blockly = await import('blockly');
      if (disposed) return;

      _Blockly = Blockly;
      registerDeckleRenderer(Blockly);
      registerBlocks(Blockly);

      _workspace = Blockly.inject(containerEl!, {
        renderer: 'deckle',
        toolbox: buildToolbox(),
        trashcan: true,
        sounds: false,
        zoom: {
          controls: true,
          wheel: true,
          startScale: 0.9,
          maxScale: 2.5,
          minScale: 0.3,
          scaleSpeed: 1.2
        },
        grid: { spacing: 20, length: 3, colour: '#e5e7eb', snap: true }
      });

      // Restore persisted workspace — prefer server-saved state, fall back to localStorage
      try {
        const serverState = initialState ?? localStorage.getItem(storageKey);
        if (serverState) {
          Blockly.serialization.workspaces.load(JSON.parse(serverState), _workspace);
          // Sync localStorage with server state so they start in agreement
          if (initialState) {
            localStorage.setItem(storageKey, initialState);
          }
        }
      } catch {
        /* ignore corrupt data */
      }

      // Ensure exactly one game_setup block exists and is protected
      ensureGameSetupBlock(Blockly, _workspace);

      // Sync toolbox disabled state with whatever was restored from saved state
      updateSingletonToolboxItems(Blockly, _workspace);

      // Persist on every model change (skip pure UI events like scroll/click)
      _workspace.addChangeListener((e: any) => {
        if (e.isUiEvent) return;
        // Remove any duplicate game_setup blocks that may have been created/pasted in
        if (e.type === Blockly.Events.BLOCK_CREATE) {
          const setupBlocks = _workspace.getBlocksByType('game_setup', false);
          if (setupBlocks.length > 1) {
            for (let i = 1; i < setupBlocks.length; i++) {
              setupBlocks[i].setDeletable(true);
              setupBlocks[i].dispose(false);
            }
          }
        }
        // Keep singleton block toolbox items in sync after any structural change
        if (
          e.type === Blockly.Events.BLOCK_CREATE ||
          e.type === Blockly.Events.BLOCK_DELETE
        ) {
          updateSingletonToolboxItems(Blockly, _workspace);
        }
        try {
          const state = Blockly.serialization.workspaces.save(_workspace);
          localStorage.setItem(storageKey, JSON.stringify(state));
        } catch {
          /* ignore */
        }
      });
    })();

    return () => {
      disposed = true;
      _workspace?.dispose();
      _workspace = null;
      _Blockly = null;
    };
  });

  // ── Game Setup block lifecycle ───────────────────────────────────────────────
  function ensureGameSetupBlock(Blockly: any, workspace: any) {
    let block = workspace.getBlocksByType('game_setup', false)[0];
    if (!block) {
      block = workspace.newBlock('game_setup');
      block.initSvg();
      block.render();
      block.moveTo(new Blockly.utils.Coordinate(40, 40));
    }
    block.setDeletable(false);
  }

  // ── Block definitions ───────────────────────────────────────────────────────
  // Blockly.Blocks is a global registry; guard against duplicate registration
  // on hot-reload by checking before defining.
  function registerBlocks(Blockly: any) {
    class BoldFieldLabel extends Blockly.FieldLabel {
      updateSize_(margin?: number) {
        super.updateSize_(margin);
        if (this.textElement_) {
          this.textElement_.style.fontWeight = '700';
        }
      }
    }

    if (!Blockly.Blocks['game_setup']) {
      Blockly.Blocks['game_setup'] = {
        init() {
          this.appendDummyInput().appendField(new BoldFieldLabel('🎲 Game Setup'));
          this.appendStatementInput('STEPS').setCheck(null);
          this.setColour(45);
          this.setTooltip(
            'The entry point for your game setup. Add steps below to define how the game is set up.'
          );
          this.setDeletable(false);
        }
      };
    }
    // Getter called lazily each time a component dropdown opens
    const getComponents = () => componentOptions;

    // ── Zones ─────────────────────────────────────────────────────────────────
    if (!Blockly.Blocks['zone_preset']) {
      Blockly.Blocks['zone_preset'] = {
        init() {
          this.appendDummyInput().appendField(
            new Blockly.FieldDropdown(PRESET_ZONE_BLOCKLY_OPTIONS),
            'ZONE'
          );
          this.setOutput(true, 'ZONE');
          this.setColour(160);
          this.setTooltip('A shared zone available to all players');
        }
      };
    }

    if (!Blockly.Blocks['zone_player_specific']) {
      Blockly.Blocks['zone_player_specific'] = {
        init() {
          this.appendValueInput('PLAYER').setCheck('PLAYER').appendField('Player');
          this.appendDummyInput().appendField(
            new Blockly.FieldDropdown([
              ['Hand', 'hand'],
              ['Tableau', 'tableau']
            ]),
            'ZONE_TYPE'
          );
          this.setOutput(true, 'ZONE');
          this.setColour(160);
          this.setInputsInline(true);
          this.setTooltip('A zone belonging to a specific player');
        }
      };
    }

    if (!Blockly.Blocks['zoom_view_all']) {
      Blockly.Blocks['zoom_view_all'] = {
        init() {
          this.appendDummyInput().appendField('Zoom to fit all zones');
          this.setPreviousStatement(true);
          this.setNextStatement(true);
          this.setColour(160);
          this.setTooltip('Adjust the zoom level so all zones are visible');
        }
      };
    }

    if (!Blockly.Blocks['zoom_view_zone']) {
      Blockly.Blocks['zoom_view_zone'] = {
        init() {
          this.appendValueInput('ZONE').setCheck('ZONE').appendField('Zoom to fit');
          this.setPreviousStatement(true);
          this.setNextStatement(true);
          this.setColour(160);
          this.setInputsInline(true);
          this.setTooltip('Adjust the zoom level to fit the specified zone in view');
        }
      };
    }

    // ── Players ───────────────────────────────────────────────────────────────
    if (!Blockly.Blocks['game_for_each_player']) {
      Blockly.Blocks['game_for_each_player'] = {
        init() {
          this.appendDummyInput()
            .appendField('For each player (')
            .appendField(
              new Blockly.FieldVariable('player', null, ['PLAYER'], 'PLAYER'),
              'PLAYER_VAR'
            )
            .appendField('), do:');
          this.appendStatementInput('DO').setCheck(null);
          this.setPreviousStatement(true);
          this.setNextStatement(true);
          this.setColour(120);
          this.setTooltip(
            'Repeat the nested steps once for every player. Use the variable inside to reference the current player.'
          );
        }
      };
    }

    if (!Blockly.Blocks['player_var_get']) {
      Blockly.Blocks['player_var_get'] = {
        init() {
          this.appendDummyInput().appendField(
            new Blockly.FieldVariable('player', null, ['PLAYER'], 'PLAYER'),
            'VAR'
          );
          this.setOutput(true, 'PLAYER');
          this.setColour(120);
          this.setTooltip('The current player variable from a "For each player" loop');
        }
      };
    }

    if (!Blockly.Blocks['game_determine_first_player']) {
      Blockly.Blocks['game_determine_first_player'] = {
        init() {
          this.appendDummyInput()
            .appendField('Set')
            .appendField(
              new Blockly.FieldVariable('First Player', null, ['PLAYER'], 'PLAYER'),
              'VARIABLE'
            )
            .appendField('to')
            .appendField(
              new Blockly.FieldDropdown([
                ['Random', 'random'],
                ['Chosen', 'chosen']
              ]),
              'METHOD'
            )
            .appendField('player');
          this.setPreviousStatement(true);
          this.setNextStatement(true);
          this.setColour(120);
          this.setTooltip('Determine which player goes first and store the result in a variable');
        }
      };
    }

    if (!Blockly.Blocks['player_count']) {
      Blockly.Blocks['player_count'] = {
        init() {
          this.appendDummyInput().appendField('Player Count');
          this.setOutput(true, 'Number');
          this.setColour(120);
          this.setTooltip('The current number of players');
        }
      };
    }

    if (!Blockly.Blocks['set_player_count']) {
      Blockly.Blocks['set_player_count'] = {
        init() {
          this.appendDummyInput()
            .appendField('Set Player Count to')
            .appendField(new Blockly.FieldNumber(2, 1), 'COUNT');
          this.setPreviousStatement(true);
          this.setNextStatement(true);
          this.setColour(45);
          this.setTooltip('Set the number of players to an exact value');
        }
      };
    }

    if (!Blockly.Blocks['determine_player_count']) {
      Blockly.Blocks['determine_player_count'] = {
        init() {
          this.appendDummyInput()
            .appendField('Determine Player Count (min:')
            .appendField(new Blockly.FieldNumber(2, 1), 'MIN')
            .appendField(', max:')
            .appendField(new Blockly.FieldNumber(4, 1), 'MAX')
            .appendField(')');
          this.setPreviousStatement(true);
          this.setNextStatement(true);
          this.setColour(45);
          this.setTooltip(
            'Ask players to choose a player count within the given range, setting Player Count'
          );
        }
      };
    }

    if (!Blockly.Blocks['player']) {
      Blockly.Blocks['player'] = {
        init() {
          this.appendDummyInput()
            .appendField('Player')
            .appendField(new Blockly.FieldNumber(1, 1), 'NUM');
          this.setOutput(true, 'PLAYER');
          this.setColour(120);
          this.setTooltip('The player identified by the given number');
        }
      };
    }

    // ── Components ────────────────────────────────────────────────────────────
    if (!Blockly.Blocks['component_all']) {
      Blockly.Blocks['component_all'] = {
        init() {
          this.appendDummyInput().appendField(
            new Blockly.FieldDropdown(() => getComponents()),
            'COMPONENT'
          );
          this.setOutput(true, 'COMPONENTS');
          this.setColour(260);
          this.setTooltip('All instances of the selected component type in the game');
        }
      };
    }

    if (!Blockly.Blocks['component_in_zone']) {
      Blockly.Blocks['component_in_zone'] = {
        init() {
          this.appendDummyInput()
            .appendField('Components')
            .appendField(new Blockly.FieldDropdown(() => getComponents()), 'COMPONENT');
          this.appendValueInput('ZONE').setCheck('ZONE').appendField('in');
          this.setOutput(true, 'COMPONENTS');
          this.setColour(260);
          this.setInputsInline(true);
          this.setTooltip(
            'All instances of the selected component type that are currently in the specified zone'
          );
        }
      };
    }

    if (!Blockly.Blocks['component_top']) {
      Blockly.Blocks['component_top'] = {
        init() {
          this.appendDummyInput()
            .appendField('Top')
            .appendField(new Blockly.FieldNumber(1, 1), 'COUNT');
          this.appendValueInput('COMPONENTS').setCheck('COMPONENTS').appendField('of');
          this.setOutput(true, 'COMPONENTS');
          this.setColour(260);
          this.setInputsInline(true);
          this.setTooltip('The first N components from a set');
        }
      };
    }

    if (!Blockly.Blocks['component_bottom']) {
      Blockly.Blocks['component_bottom'] = {
        init() {
          this.appendDummyInput()
            .appendField('Bottom')
            .appendField(new Blockly.FieldNumber(1, 1), 'COUNT');
          this.appendValueInput('COMPONENTS').setCheck('COMPONENTS').appendField('of');
          this.setOutput(true, 'COMPONENTS');
          this.setColour(260);
          this.setInputsInline(true);
          this.setTooltip('The last N components from a set');
        }
      };
    }

    if (!Blockly.Blocks['component_move']) {
      Blockly.Blocks['component_move'] = {
        init() {
          this.appendValueInput('COMPONENTS').setCheck('COMPONENTS').appendField('Move');
          this.appendValueInput('TO_ZONE').setCheck('ZONE').appendField('to');
          this.setPreviousStatement(true);
          this.setNextStatement(true);
          this.setColour(260);
          this.setTooltip('Move a set of components to a zone');
          this.setInputsInline(true);
        }
      };
    }

    // ── Logic ─────────────────────────────────────────────────────────────────
    if (!Blockly.Blocks['game_conditional']) {
      Blockly.Blocks['game_conditional'] = {
        init() {
          this.appendDummyInput()
            .appendField('If')
            .appendField(new Blockly.FieldTextInput('Player Count'), 'VARIABLE')
            .appendField(
              new Blockly.FieldDropdown([
                ['=', 'eq'],
                ['≠', 'neq'],
                ['<', 'lt'],
                ['>', 'gt'],
                ['≤', 'lte'],
                ['≥', 'gte']
              ]),
              'OPERATOR'
            )
            .appendField(new Blockly.FieldNumber(3), 'VALUE')
            .appendField(', then:');
          this.appendStatementInput('DO').setCheck(null);
          this.setPreviousStatement(true);
          this.setNextStatement(true);
          this.setColour(0);
          this.setTooltip('Execute the nested steps only if the condition is met');
        }
      };
    }
  }

  // ── Singleton block toolbox enforcement ─────────────────────────────────────
  // 'set_player_count' and 'determine_player_count' are mutually exclusive
  // singletons: once either exists in the workspace both are disabled in the
  // toolbox so a second instance can't be added; they're re-enabled on removal.
  function updateSingletonToolboxItems(Blockly: any, workspace: any) {
    const hasSetPlayerCount = workspace.getBlocksByType('set_player_count', false).length > 0;
    const hasDeterminePlayerCount =
      workspace.getBlocksByType('determine_player_count', false).length > 0;
    const disableBoth = hasSetPlayerCount || hasDeterminePlayerCount;
    workspace.updateToolbox(
      buildToolbox({ setPlayerCountDisabled: disableBoth, determinePlayerCountDisabled: disableBoth })
    );
  }

  // ── Toolbox config ──────────────────────────────────────────────────────────
  function buildToolbox(
    opts: { setPlayerCountDisabled?: boolean; determinePlayerCountDisabled?: boolean } = {}
  ) {
    return {
      kind: 'categoryToolbox',
      contents: [
        {
          kind: 'category',
          name: 'Game Setup',
          colour: '45',
          contents: [
            { kind: 'block', type: 'set_player_count', disabled: opts.setPlayerCountDisabled },
            {
              kind: 'block',
              type: 'determine_player_count',
              disabled: opts.determinePlayerCountDisabled
            }
          ]
        },
        {
          kind: 'category',
          name: 'Zones',
          colour: '160',
          contents: [
            { kind: 'block', type: 'zone_preset' },
            { kind: 'block', type: 'zone_player_specific' },
            { kind: 'block', type: 'zoom_view_all' },
            { kind: 'block', type: 'zoom_view_zone' }
          ]
        },
        {
          kind: 'category',
          name: 'Players',
          colour: '120',
          contents: [
            { kind: 'block', type: 'player_count' },
            { kind: 'block', type: 'player' },
            { kind: 'block', type: 'game_for_each_player' },
            { kind: 'block', type: 'player_var_get' },
            { kind: 'block', type: 'game_determine_first_player' }
          ]
        },
        {
          kind: 'category',
          name: 'Components',
          colour: '260',
          contents: [
            { kind: 'block', type: 'component_move' },
            { kind: 'block', type: 'component_all' },
            { kind: 'block', type: 'component_in_zone' },
            { kind: 'block', type: 'component_top' },
            { kind: 'block', type: 'component_bottom' }
          ]
        },
        {
          kind: 'category',
          name: 'Logic',
          colour: '0',
          contents: [{ kind: 'block', type: 'game_conditional' }]
        },
        {
          kind: 'category',
          name: 'Variables',
          colour: '330',
          custom: 'VARIABLE'
        }
      ]
    };
  }
</script>

<div bind:this={containerEl} class="blockly-host"></div>

<style>
  .blockly-host {
    position: absolute;
    inset: 0;
  }
</style>

