<script lang="ts" setup>
import { AuthenticationQrCodeLogin } from '@vatic/common-ui';
import { LOGIN_PATH } from '@vatic/constants';

defineOptions({ name: 'QrCodeLogin' });
</script>

<template>
  <AuthenticationQrCodeLogin :login-path="LOGIN_PATH" />
</template>
