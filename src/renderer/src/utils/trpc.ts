// This file is no longer used - tRPC has been replaced with localApi
// Keeping as stub to avoid import errors in case of missed references

export const trpc = {
  useContext: () => {
    console.warn('tRPC is no longer available - use localApi instead')
    return {}
  },
  useUtils: () => {
    console.warn('tRPC is no longer available - use localApi instead')
    return {}
  }
}
