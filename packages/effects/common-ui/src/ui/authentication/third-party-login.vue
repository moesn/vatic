<script setup lang="ts">
import { MdiGithub, MdiGoogle, MdiQqchat, MdiWechat } from '@vatic/icons';
import { $t } from '@vatic/locales';

import { VaticIconButton } from '@vatic-core/shadcn-ui';

defineOptions({
  name: 'ThirdPartyLogin',
});
</script>

<template>
  <div class="w-full sm:mx-auto md:max-w-md">
    <div class="mt-4 flex items-center justify-between">
      <span class="border-input w-[35%] border-b dark:border-gray-600"></span>
      <span class="text-muted-foreground text-center text-xs uppercase">
        {{ $t('authentication.thirdPartyLogin') }}
      </span>
      <span class="border-input w-[35%] border-b dark:border-gray-600"></span>
    </div>

    <div class="mt-4 flex flex-wrap justify-center">
      <VaticIconButton class="mb-3">
        <MdiWechat />
      </VaticIconButton>
      <VaticIconButton class="mb-3">
        <MdiQqchat />
      </VaticIconButton>
      <VaticIconButton class="mb-3">
        <MdiGithub />
      </VaticIconButton>
      <VaticIconButton class="mb-3">
        <MdiGoogle />
      </VaticIconButton>
    </div>
  </div>
</template>
