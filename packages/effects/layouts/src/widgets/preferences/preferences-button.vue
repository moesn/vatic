<script lang="ts" setup>
import { Settings } from '@vatic/icons';

import { VaticIconButton } from '@vatic-core/shadcn-ui';

import Preferences from './preferences.vue';

const emit = defineEmits<{ clearPreferencesAndLogout: [] }>();

function clearPreferencesAndLogout() {
  emit('clearPreferencesAndLogout');
}
</script>
<template>
  <Preferences @clear-preferences-and-logout="clearPreferencesAndLogout">
    <VaticIconButton>
      <Settings class="text-foreground size-4" />
    </VaticIconButton>
  </Preferences>
</template>
