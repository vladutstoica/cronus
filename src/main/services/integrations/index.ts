/**
 * Integration Services
 *
 * Central export point for task tracking integrations (Jira, Linear, etc.)
 */

// Credential management
export {
  isSafeStorageAvailable,
  encryptCredentials,
  decryptCredentials,
  saveCredentials,
  getCredentials,
  getDecryptedCredentials,
  getAllCredentials,
  deleteCredentials,
  disableCredentials,
  enableCredentials,
  updateLastVerified,
  hasCredentials,
  getIntegrationStatuses,
  type ApiTokenCredentials,
  type OAuthCredentials,
  type CredentialData,
  type SaveCredentialsInput,
  type VerificationResult,
} from "./integrationCredentials";

// Linear integration
export {
  LinearIntegration,
  createLinearIntegration,
  type IntegrationTask,
  type IntegrationTeam,
  type WorklogSyncResult,
  type AddWorklogInput,
} from "./linearIntegration";

// Jira integration
export {
  JiraIntegration,
  createJiraIntegration,
  type JiraProject,
} from "./jiraIntegration";
