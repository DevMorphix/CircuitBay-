// Only the parts of the Sentry SDK the site uses, so the lazily loaded
// chunk stays small (importing the whole package defeats tree-shaking).
export {
  init,
  captureException,
  globalHandlersIntegration,
  linkedErrorsIntegration,
  dedupeIntegration,
  httpContextIntegration,
  browserApiErrorsIntegration,
} from '@sentry/browser'
