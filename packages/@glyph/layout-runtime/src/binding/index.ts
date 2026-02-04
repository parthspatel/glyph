/**
 * Binding Module
 *
 * Provides data binding for layout templates.
 */

export {
  BindingProvider,
  useBinding,
  useBoundValue,
  useOutputSetter,
  type BindingContextValue,
  type BindingProviderProps,
  type UserInfo,
} from './context';

export {
  createChangeHandler,
  createHandlers,
  extractOutputField,
  isOutputBinding,
  parseBindings,
} from './handlers';
