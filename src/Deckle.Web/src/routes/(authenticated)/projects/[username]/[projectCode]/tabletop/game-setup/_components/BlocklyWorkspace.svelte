<script lang="ts">
  import { browser } from '$app/environment';
  import type { GameComponent } from '$lib/types';

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
    } catch { /* ignore */ }
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

  // ── Workspace lifecycle ─────────────────────────────────────────────────────
  $effect(() => {
    if (!browser || !containerEl) return;

    let disposed = false;

    (async () => {
      // Dynamic import keeps Blockly out of the SSR bundle
      const Blockly = await import('blockly');
      if (disposed) return;

      _Blockly = Blockly;
      registerBlocks(Blockly);

      _workspace = Blockly.inject(containerEl!, {
        toolbox: buildToolbox(),
        trashcan: true,
        sounds: false,
        zoom: {
          controls: true,
          wheel: true,
          startScale: 0.9,
          maxScale: 2.5,
          minScale: 0.3,
          scaleSpeed: 1.2,
        },
        grid: { spacing: 20, length: 3, colour: '#e5e7eb', snap: true },
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
      } catch { /* ignore corrupt data */ }

      // Ensure exactly one game_setup block exists and is protected
      ensureGameSetupBlock(Blockly, _workspace);

      // Persist on every model change (skip pure UI events like scroll/click)
      _workspace.addChangeListener((e: any) => {
        if (e.isUiEvent) return;
        // Remove any duplicate game_setup blocks that may have been pasted in
        const setupBlocks = _workspace.getBlocksByType('game_setup', false);
        if (setupBlocks.length > 1) {
          for (let i = 1; i < setupBlocks.length; i++) {
            setupBlocks[i].setDeletable(true);
            setupBlocks[i].dispose(false);
          }
        }
        try {
          const state = Blockly.serialization.workspaces.save(_workspace);
          localStorage.setItem(storageKey, JSON.stringify(state));
        } catch { /* ignore */ }
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
    if (!Blockly.Blocks['game_setup']) {
      Blockly.Blocks['game_setup'] = {
        init() {
          this.appendDummyInput()
            .appendField('🎲 Game Setup');
          this.appendStatementInput('STEPS').setCheck(null);
          this.setColour(45);
          this.setTooltip('The entry point for your game setup. Add steps below to define how the game is set up.');
          this.setDeletable(false);
        },
      };
    }
    // Getter called lazily each time a component dropdown opens
    const getComponents = () => componentOptions;

    // ── Zones ─────────────────────────────────────────────────────────────────
    if (!Blockly.Blocks['zone_preset']) {
      Blockly.Blocks['zone_preset'] = {
        init() {
          this.appendDummyInput()
            .appendField(
              new Blockly.FieldDropdown([
                ['Play Area', 'play_area'],
                ['Sideboard', 'sideboard'],
                ['Game Box', 'game_box'],
              ]),
              'ZONE'
            );
          this.setOutput(true, 'ZONE');
          this.setColour(160);
          this.setTooltip('A shared zone available to all players');
        },
      };
    }

    if (!Blockly.Blocks['zone_player_specific']) {
      Blockly.Blocks['zone_player_specific'] = {
        init() {
          this.appendDummyInput()
            .appendField('Player')
            .appendField(
              new Blockly.FieldDropdown([
                ['Hand', 'hand'],
                ['Tableau', 'tableau'],
              ]),
              'ZONE_TYPE'
            )
            .appendField('(')
            .appendField(new Blockly.FieldNumber(1, 1), 'PLAYER_NUM')
            .appendField(')');
          this.setOutput(true, 'ZONE');
          this.setColour(160);
          this.setTooltip('A zone belonging to a specific player, e.g. PlayerHand(1)');
        },
      };
    }

    // ── Players ───────────────────────────────────────────────────────────────
    if (!Blockly.Blocks['game_for_each_player']) {
      Blockly.Blocks['game_for_each_player'] = {
        init() {
          this.appendDummyInput()
            .appendField('For each player (')
            .appendField(new Blockly.FieldTextInput('Player'), 'PLAYER_VAR')
            .appendField('), do:');
          this.appendStatementInput('DO').setCheck(null);
          this.setPreviousStatement(true);
          this.setNextStatement(true);
          this.setColour(120);
          this.setTooltip('Repeat the nested steps once for every player');
        },
      };
    }

    if (!Blockly.Blocks['game_determine_first_player']) {
      Blockly.Blocks['game_determine_first_player'] = {
        init() {
          this.appendDummyInput()
            .appendField('Set')
            .appendField(new Blockly.FieldTextInput('First Player'), 'VARIABLE')
            .appendField('to')
            .appendField(
              new Blockly.FieldDropdown([
                ['Random', 'random'],
                ['Chosen', 'chosen'],
              ]),
              'METHOD'
            )
            .appendField('player');
          this.setPreviousStatement(true);
          this.setNextStatement(true);
          this.setColour(120);
          this.setTooltip('Determine which player goes first');
        },
      };
    }

    if (!Blockly.Blocks['player_count']) {
      Blockly.Blocks['player_count'] = {
        init() {
          this.appendDummyInput()
            .appendField('Player Count');
          this.setOutput(true, 'Number');
          this.setColour(120);
          this.setTooltip('The current number of players');
        },
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
          this.setColour(120);
          this.setTooltip('Set the number of players to an exact value');
        },
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
          this.setColour(120);
          this.setTooltip('Ask players to choose a player count within the given range, setting Player Count');
        },
      };
    }

    if (!Blockly.Blocks['player']) {
      Blockly.Blocks['player'] = {
        init() {
          this.appendDummyInput()
            .appendField('Player (')
            .appendField(new Blockly.FieldNumber(1, 1), 'NUM')
            .appendField(')');
          this.setOutput(true, 'PLAYER');
          this.setColour(120);
          this.setTooltip('The player identified by the given number');
        },
      };
    }

    // ── Components ────────────────────────────────────────────────────────────
    if (!Blockly.Blocks['component_move']) {
      Blockly.Blocks['component_move'] = {
        init() {
          this.appendDummyInput()
            .appendField('Move')
            .appendField(new Blockly.FieldDropdown(() => getComponents()), 'COMPONENT');
          this.appendValueInput('FROM_ZONE')
            .setCheck('ZONE')
            .appendField('from');
          this.appendValueInput('TO_ZONE')
            .setCheck('ZONE')
            .appendField('to');
          this.setPreviousStatement(true);
          this.setNextStatement(true);
          this.setColour(210);
          this.setTooltip('Move a component from one zone to another');
          this.setInputsInline(true);
        },
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
                ['≥', 'gte'],
              ]),
              'OPERATOR'
            )
            .appendField(new Blockly.FieldTextInput('3'), 'VALUE')
            .appendField(', then:');
          this.appendStatementInput('DO').setCheck(null);
          this.setPreviousStatement(true);
          this.setNextStatement(true);
          this.setColour(0);
          this.setTooltip('Execute the nested steps only if the condition is met');
        },
      };
    }
  }

  // ── Toolbox config ──────────────────────────────────────────────────────────
  function buildToolbox() {
    return {
      kind: 'categoryToolbox',
      contents: [
        {
          kind: 'category',
          name: 'Zones',
          colour: '160',
          contents: [
            { kind: 'block', type: 'zone_preset' },
            { kind: 'block', type: 'zone_player_specific' },
          ],
        },
        {
          kind: 'category',
          name: 'Players',
          colour: '120',
          contents: [
            { kind: 'block', type: 'player_count' },
            { kind: 'block', type: 'set_player_count' },
            { kind: 'block', type: 'determine_player_count' },
            { kind: 'block', type: 'player' },
            { kind: 'block', type: 'game_for_each_player' },
            { kind: 'block', type: 'game_determine_first_player' },
          ],
        },
        {
          kind: 'category',
          name: 'Components',
          colour: '210',
          contents: [{ kind: 'block', type: 'component_move' }],
        },
        {
          kind: 'category',
          name: 'Logic',
          colour: '0',
          contents: [{ kind: 'block', type: 'game_conditional' }],
        },
      ],
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
