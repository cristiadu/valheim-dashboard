<script lang="ts">
  import { tick } from 'svelte';

  import ItemIcon from '#/lib/components/ItemIcon';
  import { RECIPE_BIOMES } from '#/lib/models';
  import { PICKER_RECIPES, movedIndex } from '#/lib/picker';
  import { recipeById } from '#/lib/recipes';

  /** Id of the picked recipe, and the question shown above the picker. */
  let { value = $bindable(), label }: { value: string; label: string } = $props();

  /** Prefix that keeps this picker's element ids unique on the page. */
  const uid = $props.id();

  /** Whether the recipe list is showing. */
  let isOpen = $state(false);

  /** Position in [PICKER_RECIPES] of the highlighted recipe while the list is open. */
  let highlighted = $state(0);

  /** The whole picker, the button that opens it and the open list. */
  let root: HTMLDivElement;
  let button: HTMLButtonElement;
  let list = $state<HTMLDivElement>();

  /** Full recipe for [value]. */
  const picked = $derived(recipeById(value)!);

  /** Keeps the highlighted recipe in view as it moves. */
  $effect(() => {
    if (isOpen) {
      document.getElementById(`${uid}-${highlighted}`)?.scrollIntoView({ block: 'nearest' });
    }
  });

  /** Opens the list with the picked recipe highlighted, and moves the keyboard into it. */
  const open = async (): Promise<void> => {
    highlighted = PICKER_RECIPES.findIndex((recipe) => recipe.id === value);
    isOpen = true;
    await tick();
    list?.focus();
  };

  /** Picks the recipe at [index], closes the list and gives the keyboard back to the button. */
  const choose = (index: number): void => {
    value = PICKER_RECIPES[index]!.id;
    isOpen = false;
    button.focus();
  };

  /** Opens the list from the button with the up or down arrow, like a normal dropdown. */
  const onButtonKey = (event: KeyboardEvent): void => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      open();
    }
  };

  /** Moves the highlight, picks with Enter or Space, and closes with Escape. */
  const onListKey = (event: KeyboardEvent): void => {
    const moved = movedIndex(highlighted, event.key, PICKER_RECIPES.length);
    if (moved !== undefined) {
      event.preventDefault();
      highlighted = moved;
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(highlighted);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      isOpen = false;
      button.focus();
    }
  };

  /** Closes the list when the keyboard or a tap moves somewhere else on the page. */
  const onFocusOut = (event: FocusEvent): void => {
    if (!(event.relatedTarget instanceof Node && root.contains(event.relatedTarget))) {
      isOpen = false;
    }
  };
</script>

<div class="picker" bind:this={root} onfocusout={onFocusOut}>
  <span id="{uid}-label" class="muted">{label}</span>
  <button
    type="button"
    id="{uid}-button"
    aria-haspopup="listbox"
    aria-expanded={isOpen}
    aria-labelledby="{uid}-label {uid}-button"
    bind:this={button}
    onclick={() => (isOpen ? (isOpen = false) : open())}
    onkeydown={onButtonKey}
  >
    <ItemIcon item={picked.name} />
    <span class="name">{picked.name}</span>
    <span class="caret" aria-hidden="true">▾</span>
  </button>
  {#if isOpen}
    <div
      class="list"
      role="listbox"
      tabindex="-1"
      aria-labelledby="{uid}-label"
      aria-activedescendant="{uid}-{highlighted}"
      bind:this={list}
      onkeydown={onListKey}
    >
      {#each RECIPE_BIOMES as biome (biome)}
        <div role="group" aria-labelledby="{uid}-{biome}">
          <div id="{uid}-{biome}" class="biome" role="presentation">{biome}</div>
          {#each PICKER_RECIPES as recipe, index (recipe.id)}
            {#if recipe.biome === biome}
              <div
                id="{uid}-{index}"
                class="option"
                class:highlighted={index === highlighted}
                role="option"
                tabindex="-1"
                aria-selected={recipe.id === value}
                onclick={() => choose(index)}
                onkeydown={onListKey}
                onpointermove={() => (highlighted = index)}
              >
                <ItemIcon item={recipe.name} />
                {recipe.name}
              </div>
            {/if}
          {/each}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  /* Label above the button, and the list hangs below it */
  .picker {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  /* Button looks like the other form fields and shows the picked recipe's icon and name */
  button {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 220px;
    max-width: 100%;
    min-height: 44px;
    box-sizing: border-box;
    padding: 0 12px;
    border: 1px solid var(--line);
    background: var(--background);
    color: var(--text);
    font: inherit;
    font-size: 14px;
    text-align: left;
    cursor: pointer;
  }

  /* Recipe name takes the room between the icon and the arrow */
  .name {
    flex: 1;
  }

  /* Small arrow that says the button opens a list */
  .caret {
    color: var(--muted);
  }

  /* Open list floats over the page under the button and scrolls when long */
  .list {
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 10;
    width: max(100%, 260px);
    max-width: calc(100vw - 32px);
    max-height: 360px;
    overflow-y: auto;
    margin-top: 2px;
    border: 1px solid var(--line);
    background: var(--background);
  }

  /* Biome name above its recipes, like the groups in a normal dropdown */
  .biome {
    padding: 8px 12px 4px;
    font-family: var(--font-heading);
    font-size: 12px;
    letter-spacing: 0.08em;
    color: var(--muted);
  }

  /* One recipe: icon and name, tall enough to tap */
  .option {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 40px;
    padding: 0 12px 0 20px;
    font-size: 14px;
    cursor: pointer;
  }

  /* Highlighted recipe, from the mouse or the arrow keys */
  .option.highlighted {
    background: var(--selected);
  }

  /* Recipe that is picked now */
  .option[aria-selected='true'] {
    color: var(--ember);
  }
</style>
