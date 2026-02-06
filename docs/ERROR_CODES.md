# Error Codes Reference

This document lists error codes used in the BuildBase SDK and their meanings. These codes can be used with `createSDKError()` and may be set on `SDKError.code` when the SDK throws. Not every code is used in every release; this doc serves as the canonical reference.

## SDK Error Codes

### Authentication Errors

| Code              | Description             | When It Occurs                                                          |
| ----------------- | ----------------------- | ----------------------------------------------------------------------- |
| `AUTH_FAILED`     | Authentication failed   | When OAuth flow fails or user cannot be authenticated                   |
| `AUTH_REQUIRED`   | Authentication required | When an operation requires authentication but user is not authenticated |
| `SESSION_EXPIRED` | Session expired         | When user session has expired and needs to be refreshed                 |
| `INVALID_SESSION` | Invalid session         | When session data is corrupted or invalid                               |

### Network Errors

| Code              | Description               | When It Occurs                                              |
| ----------------- | ------------------------- | ----------------------------------------------------------- |
| `NETWORK_ERROR`   | Network connection failed | When fetch fails due to network issues (offline, DNS, CORS) |
| `REQUEST_TIMEOUT` | Request timeout           | When request exceeds timeout duration                       |
| `ABORT_ERROR`     | Request aborted           | When request is cancelled via AbortController               |

### API Errors

| Code           | Description         | When It Occurs                             |
| -------------- | ------------------- | ------------------------------------------ |
| `API_ERROR`    | Generic API error   | When API returns an error response         |
| `BAD_REQUEST`  | Bad request (400)   | When request is malformed or invalid       |
| `UNAUTHORIZED` | Unauthorized (401)  | When authentication is required or invalid |
| `FORBIDDEN`    | Forbidden (403)     | When user doesn't have permission          |
| `NOT_FOUND`    | Not found (404)     | When resource doesn't exist                |
| `SERVER_ERROR` | Server error (500+) | When server encounters an error            |

### Workspace Errors

| Code                       | Description              | When It Occurs                                           |
| -------------------------- | ------------------------ | -------------------------------------------------------- |
| `WORKSPACE_NOT_FOUND`      | Workspace not found      | When workspace doesn't exist or user doesn't have access |
| `WORKSPACE_ACCESS_DENIED`  | Workspace access denied  | When user doesn't have permission to access workspace    |
| `WORKSPACE_OWNER_REQUIRED` | Workspace owner required | When operation requires workspace owner (e.g., delete)   |
| `INVALID_WORKSPACE_ID`     | Invalid workspace ID     | When workspace ID format is invalid                      |

### User Management Errors

| Code                       | Description              | When It Occurs                               |
| -------------------------- | ------------------------ | -------------------------------------------- |
| `USER_NOT_FOUND`           | User not found           | When user doesn't exist                      |
| `USER_ALREADY_EXISTS`      | User already exists      | When trying to add user that already exists  |
| `CANNOT_REMOVE_OWNER`      | Cannot remove owner      | When trying to remove workspace owner        |
| `CANNOT_CHANGE_OWNER_ROLE` | Cannot change owner role | When trying to change workspace owner's role |

### Subscription Errors

| Code                     | Description            | When It Occurs                       |
| ------------------------ | ---------------------- | ------------------------------------ |
| `SUBSCRIPTION_NOT_FOUND` | Subscription not found | When workspace has no subscription   |
| `SUBSCRIPTION_ERROR`     | Subscription error     | When subscription operation fails    |
| `CHECKOUT_ERROR`         | Checkout error         | When checkout session creation fails |
| `PLAN_NOT_FOUND`         | Plan not found         | When plan doesn't exist              |

### Configuration Errors

| Code                 | Description             | When It Occurs                             |
| -------------------- | ----------------------- | ------------------------------------------ |
| `INVALID_CONFIG`     | Invalid configuration   | When SDK configuration is invalid          |
| `INVALID_SERVER_URL` | Invalid server URL      | When serverUrl is not a valid URL          |
| `INVALID_ORG_ID`     | Invalid organization ID | When orgId is not a valid MongoDB ObjectId |
| `INVALID_VERSION`    | Invalid API version     | When API version is not supported          |

### Generic Errors

| Code               | Description      | When It Occurs                       |
| ------------------ | ---------------- | ------------------------------------ |
| `UNKNOWN_ERROR`    | Unknown error    | When error type cannot be determined |
| `VALIDATION_ERROR` | Validation error | When input validation fails          |

## HTTP Status Code Mappings

The SDK automatically maps HTTP status codes to error messages:

| Status Code | Error Message                            |
| ----------- | ---------------------------------------- |
| 400         | Bad Request                              |
| 401         | Unauthorized - Please check your session |
| 403         | Forbidden - You do not have permission   |
| 404         | Resource not found                       |
| 500         | Internal server error                    |
| 502         | Bad Gateway                              |
| 503         | Service unavailable                      |

## Error Handling

- **Hook errors**: Use the `error` property from hooks (e.g. `useSaaSWorkspaces()`, `useUserAttributes()`) and show user feedback (toast, inline message).
- **Async operations**: In `catch` blocks, check `error.message`; for aborted requests, ignore or treat as cancelled.
- **React errors**: Wrap your app with an error boundary to catch render-time errors.
