<script setup lang="ts">
import type { SupportedLanguagesType } from '@vatic/locales';

import { SUPPORT_LANGUAGES } from '@vatic/constants';
import { Languages } from '@vatic/icons';
import { loadLocaleMessages } from '@vatic/locales';
import { preferences, updatePreferences } from '@vatic/preferences';

import { VaticDropdownRadioMenu, VaticIconButton } from '@vatic-core/shadcn-ui';

defineOptions({
  name: 'LanguageToggle',
});

async function handleUpdate(value: string | undefined) {
  if (!value) return;
  const locale = value as SupportedLanguagesType;
  updatePreferences({
    app: {
      locale,
    },
  });
  await loadLocaleMessages(locale);
}
</script>

<template>
  <div>
    <VaticDropdownRadioMenu
      :menus="SUPPORT_LANGUAGES"
      :model-value="preferences.app.locale"
      @update:model-value="handleUpdate"
    >
      <VaticIconButton>
        <Languages class="text-foreground size-4" />
      </VaticIconButton>
    </VaticDropdownRadioMenu>
  </div>
</template>
