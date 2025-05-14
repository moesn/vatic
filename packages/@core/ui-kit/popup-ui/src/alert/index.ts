export type {
  AlertProps,
  BeforeCloseScope,
  IconType,
  PromptProps,
} from './alert';
export { useAlertContext } from './alert';
export { default as Alert } from './alert.vue';
export {
  vaticAlert as alert,
  clearAllAlerts,
  vaticConfirm as confirm,
  vaticPrompt as prompt,
} from './AlertBuilder';
