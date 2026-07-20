import type { Component } from 'svelte';
import type { PropertyGroup } from '../../capabilities';
import type { GroupControlProps } from './groupProps';
import IdentityGroup from './IdentityGroup.svelte';
import PositionGroup from './PositionGroup.svelte';
import SizeGroup from './SizeGroup.svelte';
import LayoutGroup from './LayoutGroup.svelte';
import TypographyGroup from './TypographyGroup.svelte';
import BackgroundGroup from './BackgroundGroup.svelte';
import BorderGroup from './BorderGroup.svelte';
import EffectsGroup from './EffectsGroup.svelte';

/**
 * Maps each capability group to its shared control component. Both panel
 * variants render groups generically by looking the type up here, so adding a
 * group means adding one row (ADR-0001 D1 / story 44).
 */
export const GROUP_COMPONENTS: Record<PropertyGroup, Component<GroupControlProps>> = {
  identity: IdentityGroup as Component<GroupControlProps>,
  position: PositionGroup as Component<GroupControlProps>,
  size: SizeGroup as Component<GroupControlProps>,
  layout: LayoutGroup as Component<GroupControlProps>,
  typography: TypographyGroup as Component<GroupControlProps>,
  background: BackgroundGroup as Component<GroupControlProps>,
  border: BorderGroup as Component<GroupControlProps>,
  effects: EffectsGroup as Component<GroupControlProps>
};
