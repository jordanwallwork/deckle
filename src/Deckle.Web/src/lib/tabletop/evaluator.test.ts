import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runGameSetup } from './evaluator';
import type { TabletopController, ZoneDef } from './types';

// ── Mock controller factory ─────────────────────────────────────────────────

interface MockController extends TabletopController {
  readonly zones: ZoneDef[];
  readonly playerCount: number;
  readonly movedComponents: Array<{ ids: string[]; toZone: string }>;
  zoomedToAll: boolean;
  zoomedToZone: string | undefined;
}

function makeController(overrides: Partial<TabletopController> = {}): MockController {
  const state = {
    zones: [] as ZoneDef[],
    playerCount: 0,
    movedComponents: [] as Array<{ ids: string[]; toZone: string }>,
    zoomedToAll: false,
    zoomedToZone: undefined as string | undefined,
  };

  const ctrl: MockController = {
    get zones() { return state.zones; },
    get playerCount() { return state.playerCount; },
    get movedComponents() { return state.movedComponents; },
    get zoomedToAll() { return state.zoomedToAll; },
    set zoomedToAll(v: boolean) { state.zoomedToAll = v; },
    get zoomedToZone() { return state.zoomedToZone; },
    set zoomedToZone(v: string | undefined) { state.zoomedToZone = v; },
    addZone(zone: ZoneDef) {
      state.zones.push(zone);
    },
    getZones() {
      return state.zones;
    },
    setPlayerCount(count: number) {
      state.playerCount = count;
    },
    getPlayerCount() {
      return state.playerCount;
    },
    getComponentName(id: string): string {
      return id;
    },
    getComponentsInZone(_componentId: string, _zoneId: string): string[] {
      return [];
    },
    async moveComponents(componentIds: string[], toZoneId: string): Promise<void> {
      state.movedComponents.push({ ids: componentIds, toZone: toZoneId });
    },
    async promptPlayerCount(_min: number, _max: number): Promise<number> {
      return 2;
    },
    async promptChoosePlayer(_playerCount: number): Promise<number> {
      return 1;
    },
    zoomToFitAll() {
      state.zoomedToAll = true;
    },
    zoomToFitZone(zoneId: string) {
      state.zoomedToZone = zoneId;
    },
  };

  // Apply overrides
  for (const [key, value] of Object.entries(overrides)) {
    (ctrl as Record<string, unknown>)[key] = value;
  }

  return ctrl;
}

// ── Workspace JSON helpers ──────────────────────────────────────────────────

function makeWorkspace(steps: object | undefined): string {
  const blocks: object[] = [
    {
      type: 'game_setup',
      ...(steps ? { inputs: { STEPS: { block: steps } } } : {}),
    },
  ];
  return JSON.stringify({ blocks: { blocks } });
}

function chain(...blocks: object[]): object {
  // Links blocks in a next-chain
  return blocks.reduceRight((acc: object | undefined, block: object) => {
    if (acc === undefined) return block;
    return { ...block, next: { block: acc } };
  }, undefined) as object;
}

// ── runGameSetup: top-level parsing ────────────────────────────────────────

describe('runGameSetup', () => {
  it('does nothing on invalid JSON', async () => {
    const ctrl = makeController();
    await runGameSetup('not-json', ctrl);
    expect(ctrl.playerCount).toBe(0);
    expect(ctrl.zones).toHaveLength(0);
  });

  it('does nothing when there is no game_setup block', async () => {
    const ctrl = makeController();
    const json = JSON.stringify({ blocks: { blocks: [{ type: 'other_block' }] } });
    await runGameSetup(json, ctrl);
    expect(ctrl.playerCount).toBe(0);
  });

  it('does nothing when game_setup block has no steps', async () => {
    const ctrl = makeController();
    await runGameSetup(makeWorkspace(undefined), ctrl);
    expect(ctrl.playerCount).toBe(0);
  });

  it('executes statements connected to game_setup', async () => {
    const ctrl = makeController();
    const json = makeWorkspace({ type: 'set_player_count', fields: { COUNT: 3 } });
    await runGameSetup(json, ctrl);
    expect(ctrl.playerCount).toBe(3);
  });
});

// ── set_player_count ────────────────────────────────────────────────────────

describe('set_player_count block', () => {
  it('sets the player count on the controller', async () => {
    const ctrl = makeController();
    await runGameSetup(makeWorkspace({ type: 'set_player_count', fields: { COUNT: 4 } }), ctrl);
    expect(ctrl.playerCount).toBe(4);
  });

  it('defaults to 2 when COUNT field is absent', async () => {
    const ctrl = makeController();
    await runGameSetup(makeWorkspace({ type: 'set_player_count', fields: {} }), ctrl);
    expect(ctrl.playerCount).toBe(2);
  });

  it('adds hand and tableau zones for each player', async () => {
    const ctrl = makeController();
    await runGameSetup(makeWorkspace({ type: 'set_player_count', fields: { COUNT: 2 } }), ctrl);

    const zoneIds = ctrl.zones.map((z) => z.id);
    expect(zoneIds).toContain('player-1-hand');
    expect(zoneIds).toContain('player-1-tableau');
    expect(zoneIds).toContain('player-2-hand');
    expect(zoneIds).toContain('player-2-tableau');
  });

  it('adds exactly 2 zones per player', async () => {
    const ctrl = makeController();
    await runGameSetup(makeWorkspace({ type: 'set_player_count', fields: { COUNT: 3 } }), ctrl);
    expect(ctrl.zones).toHaveLength(6);
  });

  it('positions player columns without overlap', async () => {
    const ctrl = makeController();
    await runGameSetup(makeWorkspace({ type: 'set_player_count', fields: { COUNT: 2 } }), ctrl);

    const p1Hand = ctrl.zones.find((z) => z.id === 'player-1-hand')!;
    const p2Hand = ctrl.zones.find((z) => z.id === 'player-2-hand')!;
    expect(p2Hand.x).toBeGreaterThan(p1Hand.x + p1Hand.minWidth);
  });

  it('places hand before tableau within the same column', async () => {
    const ctrl = makeController();
    await runGameSetup(makeWorkspace({ type: 'set_player_count', fields: { COUNT: 1 } }), ctrl);

    const hand = ctrl.zones.find((z) => z.id === 'player-1-hand')!;
    const tableau = ctrl.zones.find((z) => z.id === 'player-1-tableau')!;
    expect(tableau.x).toBeGreaterThan(hand.x);
    expect(tableau.y).toBe(hand.y);
  });
});

// ── determine_player_count ─────────────────────────────────────────────────

describe('determine_player_count block', () => {
  it('calls promptPlayerCount with the configured min/max', async () => {
    const prompt = vi.fn().mockResolvedValue(3);
    const ctrl = makeController({ promptPlayerCount: prompt });

    const json = makeWorkspace({
      type: 'determine_player_count',
      fields: { MIN: 2, MAX: 5 },
    });
    await runGameSetup(json, ctrl);

    expect(prompt).toHaveBeenCalledWith(2, 5);
  });

  it('applies the returned count to the controller', async () => {
    const ctrl = makeController({ promptPlayerCount: vi.fn().mockResolvedValue(4) });
    await runGameSetup(
      makeWorkspace({ type: 'determine_player_count', fields: { MIN: 2, MAX: 6 } }),
      ctrl
    );
    expect(ctrl.playerCount).toBe(4);
  });

  it('defaults MIN/MAX when fields are absent', async () => {
    const prompt = vi.fn().mockResolvedValue(2);
    const ctrl = makeController({ promptPlayerCount: prompt });
    await runGameSetup(makeWorkspace({ type: 'determine_player_count', fields: {} }), ctrl);
    expect(prompt).toHaveBeenCalledWith(2, 4);
  });
});

// ── component_move ──────────────────────────────────────────────────────────

describe('component_move block', () => {
  it('moves a component to a preset zone', async () => {
    const ctrl = makeController();
    const json = makeWorkspace({
      type: 'component_move',
      inputs: {
        COMPONENTS: { block: { type: 'component_all', fields: { COMPONENT: 'card-123' } } },
        TO_ZONE: { block: { type: 'zone_preset', fields: { ZONE: 'play_area' } } },
      },
    });
    await runGameSetup(json, ctrl);

    expect(ctrl.movedComponents).toHaveLength(1);
    expect(ctrl.movedComponents[0]).toEqual({ ids: ['card-123'], toZone: 'play_area' });
  });

  it('does nothing when COMPONENTS block is absent', async () => {
    const ctrl = makeController();
    const json = makeWorkspace({
      type: 'component_move',
      inputs: {
        TO_ZONE: { block: { type: 'zone_preset', fields: { ZONE: 'play_area' } } },
      },
    });
    await runGameSetup(json, ctrl);
    expect(ctrl.movedComponents).toHaveLength(0);
  });

  it('does nothing when TO_ZONE block is absent', async () => {
    const ctrl = makeController();
    const json = makeWorkspace({
      type: 'component_move',
      inputs: {
        COMPONENTS: { block: { type: 'component_all', fields: { COMPONENT: 'card-123' } } },
      },
    });
    await runGameSetup(json, ctrl);
    expect(ctrl.movedComponents).toHaveLength(0);
  });

  it('does nothing when component ID is __none__', async () => {
    const ctrl = makeController();
    const json = makeWorkspace({
      type: 'component_move',
      inputs: {
        COMPONENTS: { block: { type: 'component_all', fields: { COMPONENT: '__none__' } } },
        TO_ZONE: { block: { type: 'zone_preset', fields: { ZONE: 'play_area' } } },
      },
    });
    await runGameSetup(json, ctrl);
    expect(ctrl.movedComponents).toHaveLength(0);
  });
});

// ── component blocks ────────────────────────────────────────────────────────

describe('component_in_zone block', () => {
  it('calls getComponentsInZone and passes the result to moveComponents', async () => {
    const getComponentsInZone = vi.fn().mockReturnValue(['inst-1', 'inst-2']);
    const ctrl = makeController({ getComponentsInZone });

    const json = makeWorkspace({
      type: 'component_move',
      inputs: {
        COMPONENTS: {
          block: {
            type: 'component_in_zone',
            fields: { COMPONENT: 'card-123' },
            inputs: {
              ZONE: { block: { type: 'zone_preset', fields: { ZONE: 'sideboard' } } },
            },
          },
        },
        TO_ZONE: { block: { type: 'zone_preset', fields: { ZONE: 'play_area' } } },
      },
    });
    await runGameSetup(json, ctrl);

    expect(getComponentsInZone).toHaveBeenCalledWith('card-123', 'sideboard');
    expect(ctrl.movedComponents[0].ids).toEqual(['inst-1', 'inst-2']);
  });
});

describe('component_top block', () => {
  it('returns only the first N components', async () => {
    const getComponentsInZone = vi.fn().mockReturnValue(['a', 'b', 'c', 'd']);
    const ctrl = makeController({ getComponentsInZone });

    const json = makeWorkspace({
      type: 'component_move',
      inputs: {
        COMPONENTS: {
          block: {
            type: 'component_top',
            fields: { COUNT: 2 },
            inputs: {
              COMPONENTS: {
                block: {
                  type: 'component_in_zone',
                  fields: { COMPONENT: 'card-123' },
                  inputs: {
                    ZONE: { block: { type: 'zone_preset', fields: { ZONE: 'sideboard' } } },
                  },
                },
              },
            },
          },
        },
        TO_ZONE: { block: { type: 'zone_preset', fields: { ZONE: 'play_area' } } },
      },
    });
    await runGameSetup(json, ctrl);

    expect(ctrl.movedComponents[0].ids).toEqual(['a', 'b']);
  });
});

describe('component_bottom block', () => {
  it('returns only the last N components', async () => {
    const getComponentsInZone = vi.fn().mockReturnValue(['a', 'b', 'c', 'd']);
    const ctrl = makeController({ getComponentsInZone });

    const json = makeWorkspace({
      type: 'component_move',
      inputs: {
        COMPONENTS: {
          block: {
            type: 'component_bottom',
            fields: { COUNT: 2 },
            inputs: {
              COMPONENTS: {
                block: {
                  type: 'component_in_zone',
                  fields: { COMPONENT: 'card-123' },
                  inputs: {
                    ZONE: { block: { type: 'zone_preset', fields: { ZONE: 'sideboard' } } },
                  },
                },
              },
            },
          },
        },
        TO_ZONE: { block: { type: 'zone_preset', fields: { ZONE: 'play_area' } } },
      },
    });
    await runGameSetup(json, ctrl);

    expect(ctrl.movedComponents[0].ids).toEqual(['c', 'd']);
  });
});

// ── zone blocks ─────────────────────────────────────────────────────────────

describe('zone_preset block', () => {
  it('resolves to the zone id in the ZONE field', async () => {
    const ctrl = makeController();
    const json = makeWorkspace({
      type: 'component_move',
      inputs: {
        COMPONENTS: { block: { type: 'component_all', fields: { COMPONENT: 'card-1' } } },
        TO_ZONE: { block: { type: 'zone_preset', fields: { ZONE: 'sideboard' } } },
      },
    });
    await runGameSetup(json, ctrl);
    expect(ctrl.movedComponents[0].toZone).toBe('sideboard');
  });
});

describe('zone_player_specific block', () => {
  it('resolves to player-N-hand for hand zone type', async () => {
    const ctrl = makeController();
    // First set 2 players so zone IDs are meaningful
    const setup = chain(
      { type: 'set_player_count', fields: { COUNT: 2 } },
      {
        type: 'component_move',
        inputs: {
          COMPONENTS: { block: { type: 'component_all', fields: { COMPONENT: 'card-1' } } },
          TO_ZONE: {
            block: {
              type: 'zone_player_specific',
              fields: { ZONE_TYPE: 'hand' },
              inputs: {
                PLAYER: { block: { type: 'player', fields: { NUM: 1 } } },
              },
            },
          },
        },
      }
    );
    await runGameSetup(makeWorkspace(setup), ctrl);
    expect(ctrl.movedComponents[0].toZone).toBe('player-1-hand');
  });

  it('resolves to player-N-tableau for tableau zone type', async () => {
    const ctrl = makeController();
    const setup = chain(
      { type: 'set_player_count', fields: { COUNT: 2 } },
      {
        type: 'component_move',
        inputs: {
          COMPONENTS: { block: { type: 'component_all', fields: { COMPONENT: 'card-1' } } },
          TO_ZONE: {
            block: {
              type: 'zone_player_specific',
              fields: { ZONE_TYPE: 'tableau' },
              inputs: {
                PLAYER: { block: { type: 'player', fields: { NUM: 2 } } },
              },
            },
          },
        },
      }
    );
    await runGameSetup(makeWorkspace(setup), ctrl);
    expect(ctrl.movedComponents[0].toZone).toBe('player-2-tableau');
  });

  it('returns null and skips move when PLAYER block is absent', async () => {
    const ctrl = makeController();
    const json = makeWorkspace({
      type: 'component_move',
      inputs: {
        COMPONENTS: { block: { type: 'component_all', fields: { COMPONENT: 'card-1' } } },
        TO_ZONE: {
          block: {
            type: 'zone_player_specific',
            fields: { ZONE_TYPE: 'hand' },
            inputs: {},
          },
        },
      },
    });
    await runGameSetup(json, ctrl);
    expect(ctrl.movedComponents).toHaveLength(0);
  });
});

// ── game_for_each_player ────────────────────────────────────────────────────

describe('game_for_each_player block', () => {
  it('executes the body once per player', async () => {
    const moveComponents = vi.fn().mockResolvedValue(undefined);
    const ctrl = makeController({ moveComponents });

    const setup = chain(
      { type: 'set_player_count', fields: { COUNT: 3 } },
      {
        type: 'game_for_each_player',
        fields: { PLAYER_VAR: { id: 'var1', name: 'player', type: 'Number' } },
        inputs: {
          DO: {
            block: {
              type: 'component_move',
              inputs: {
                COMPONENTS: { block: { type: 'component_all', fields: { COMPONENT: 'card-1' } } },
                TO_ZONE: {
                  block: {
                    type: 'zone_player_specific',
                    fields: { ZONE_TYPE: 'hand' },
                    inputs: {
                      PLAYER: {
                        block: {
                          type: 'player_var_get',
                          fields: { VAR: { id: 'var1' } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }
    );
    await runGameSetup(makeWorkspace(setup), ctrl);

    expect(moveComponents).toHaveBeenCalledTimes(3);
    expect(moveComponents).toHaveBeenCalledWith(['card-1'], 'player-1-hand');
    expect(moveComponents).toHaveBeenCalledWith(['card-1'], 'player-2-hand');
    expect(moveComponents).toHaveBeenCalledWith(['card-1'], 'player-3-hand');
  });

  it('does nothing for 0 players', async () => {
    const ctrl = makeController();
    // player count starts at 0 (not set)
    const setup = {
      type: 'game_for_each_player',
      fields: { PLAYER_VAR: { id: 'v1' } },
      inputs: {
        DO: {
          block: { type: 'component_move', inputs: {} },
        },
      },
    };
    await runGameSetup(makeWorkspace(setup), ctrl);
    expect(ctrl.movedComponents).toHaveLength(0);
  });
});

// ── game_conditional ────────────────────────────────────────────────────────

describe('game_conditional block', () => {
  async function runConditional(
    operator: string,
    value: number,
    playerCount: number
  ): Promise<ReturnType<typeof makeController>> {
    const ctrl = makeController();
    const setup = chain(
      { type: 'set_player_count', fields: { COUNT: playerCount } },
      {
        type: 'game_conditional',
        fields: { VARIABLE: 'Player Count', OPERATOR: operator, VALUE: value },
        inputs: {
          DO: {
            block: {
              type: 'component_move',
              inputs: {
                COMPONENTS: {
                  block: { type: 'component_all', fields: { COMPONENT: 'card-1' } },
                },
                TO_ZONE: { block: { type: 'zone_preset', fields: { ZONE: 'play_area' } } },
              },
            },
          },
        },
      }
    );
    await runGameSetup(makeWorkspace(setup), ctrl);
    return ctrl;
  }

  it('fires when eq condition is true', async () => {
    const ctrl = await runConditional('eq', 3, 3);
    expect(ctrl.movedComponents).toHaveLength(1);
  });

  it('does not fire when eq condition is false', async () => {
    const ctrl = await runConditional('eq', 3, 2);
    expect(ctrl.movedComponents).toHaveLength(0);
  });

  it('fires when gt condition is true', async () => {
    const ctrl = await runConditional('gt', 2, 4);
    expect(ctrl.movedComponents).toHaveLength(1);
  });

  it('does not fire when gt condition is false', async () => {
    const ctrl = await runConditional('gt', 4, 3);
    expect(ctrl.movedComponents).toHaveLength(0);
  });

  it('fires when lte condition is true', async () => {
    const ctrl = await runConditional('lte', 3, 3);
    expect(ctrl.movedComponents).toHaveLength(1);
  });

  it('fires when neq condition is true', async () => {
    const ctrl = await runConditional('neq', 2, 4);
    expect(ctrl.movedComponents).toHaveLength(1);
  });

  it('fires when lt condition is true', async () => {
    const ctrl = await runConditional('lt', 5, 3);
    expect(ctrl.movedComponents).toHaveLength(1);
  });

  it('fires when gte condition is true', async () => {
    const ctrl = await runConditional('gte', 2, 4);
    expect(ctrl.movedComponents).toHaveLength(1);
  });

  it('does not fire for unknown variable name', async () => {
    const ctrl = makeController();
    const setup = chain(
      { type: 'set_player_count', fields: { COUNT: 3 } },
      {
        type: 'game_conditional',
        fields: { VARIABLE: 'Unknown Var', OPERATOR: 'eq', VALUE: 3 },
        inputs: {
          DO: {
            block: {
              type: 'component_move',
              inputs: {
                COMPONENTS: {
                  block: { type: 'component_all', fields: { COMPONENT: 'card-1' } },
                },
                TO_ZONE: { block: { type: 'zone_preset', fields: { ZONE: 'play_area' } } },
              },
            },
          },
        },
      }
    );
    await runGameSetup(makeWorkspace(setup), ctrl);
    expect(ctrl.movedComponents).toHaveLength(0);
  });
});

// ── game_determine_first_player ─────────────────────────────────────────────

describe('game_determine_first_player block', () => {
  it('stores a random player number in context (random method)', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // always picks player 1
    const ctrl = makeController();

    // Set 4 players, determine first player randomly, then move to their hand
    const setup = chain(
      { type: 'set_player_count', fields: { COUNT: 4 } },
      {
        type: 'game_determine_first_player',
        fields: {
          VARIABLE: { id: 'fp-var' },
          METHOD: 'random',
        },
      },
      {
        type: 'component_move',
        inputs: {
          COMPONENTS: { block: { type: 'component_all', fields: { COMPONENT: 'card-1' } } },
          TO_ZONE: {
            block: {
              type: 'zone_player_specific',
              fields: { ZONE_TYPE: 'hand' },
              inputs: {
                PLAYER: { block: { type: 'variables_get', fields: { VAR: { id: 'fp-var' } } } },
              },
            },
          },
        },
      }
    );
    await runGameSetup(makeWorkspace(setup), ctrl);

    // Math.random() = 0 → floor(0 * 4) + 1 = 1
    expect(ctrl.movedComponents[0].toZone).toBe('player-1-hand');
    vi.restoreAllMocks();
  });

  it('calls promptChoosePlayer when method is choose', async () => {
    const promptChoosePlayer = vi.fn().mockResolvedValue(2);
    const ctrl = makeController({ promptChoosePlayer });

    const setup = chain(
      { type: 'set_player_count', fields: { COUNT: 3 } },
      {
        type: 'game_determine_first_player',
        fields: { VARIABLE: { id: 'fp-var' }, METHOD: 'choose' },
      }
    );
    await runGameSetup(makeWorkspace(setup), ctrl);

    expect(promptChoosePlayer).toHaveBeenCalledWith(3);
  });
});

// ── zoom blocks ──────────────────────────────────────────────────────────────

describe('zoom_view_all block', () => {
  it('calls zoomToFitAll on the controller', async () => {
    const zoomToFitAll = vi.fn();
    const ctrl = makeController({ zoomToFitAll });
    await runGameSetup(makeWorkspace({ type: 'zoom_view_all' }), ctrl);
    expect(zoomToFitAll).toHaveBeenCalledOnce();
  });
});

describe('zoom_view_zone block', () => {
  it('calls zoomToFitZone with the resolved zone id', async () => {
    const zoomToFitZone = vi.fn();
    const ctrl = makeController({ zoomToFitZone });
    const json = makeWorkspace({
      type: 'zoom_view_zone',
      inputs: { ZONE: { block: { type: 'zone_preset', fields: { ZONE: 'sideboard' } } } },
    });
    await runGameSetup(json, ctrl);
    expect(zoomToFitZone).toHaveBeenCalledWith('sideboard');
  });

  it('does nothing when zone block is absent', async () => {
    const zoomToFitZone = vi.fn();
    const ctrl = makeController({ zoomToFitZone });
    await runGameSetup(makeWorkspace({ type: 'zoom_view_zone', inputs: {} }), ctrl);
    expect(zoomToFitZone).not.toHaveBeenCalled();
  });
});

// ── statement chaining ───────────────────────────────────────────────────────

describe('statement chaining', () => {
  it('executes multiple chained statements in order', async () => {
    const order: string[] = [];
    const zoomToFitAll = vi.fn(() => order.push('zoom'));
    const moveComponents = vi.fn(async (_ids: string[], zone: string) => {
      order.push(`move:${zone}`);
    });
    const ctrl = makeController({ zoomToFitAll, moveComponents });

    const setup = chain(
      {
        type: 'component_move',
        inputs: {
          COMPONENTS: { block: { type: 'component_all', fields: { COMPONENT: 'card-1' } } },
          TO_ZONE: { block: { type: 'zone_preset', fields: { ZONE: 'play_area' } } },
        },
      },
      { type: 'zoom_view_all' }
    );
    await runGameSetup(makeWorkspace(setup), ctrl);

    expect(order).toEqual(['move:play_area', 'zoom']);
  });
});

// ── unknown block type ───────────────────────────────────────────────────────

describe('unknown block types', () => {
  it('silently ignores unrecognised block types', async () => {
    const ctrl = makeController();
    await runGameSetup(makeWorkspace({ type: 'totally_unknown_block' }), ctrl);
    expect(ctrl.playerCount).toBe(0);
    expect(ctrl.zones).toHaveLength(0);
  });
});
