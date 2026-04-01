---
paths: ["src/api/**", "src/routes/**", "src/services/**", "src/middleware/**"]
---

# Backend Rules

<!-- CUSTOMIZE: Replace with your actual backend conventions -->

## API Endpoints
- Validate all inputs at the boundary
- Return consistent error shapes
- Never expose internal IDs or stack traces to clients
- Log errors with structured logging

## Error Handling
- Catch specific exceptions, never bare catch-all
- Always log the error before re-throwing
- Use typed error classes for domain errors
- Return appropriate HTTP status codes

## Security
- Authenticate every endpoint (even internal ones)
- Authorize based on roles/permissions, not just authentication
- Sanitize all user input before database queries
- Never log sensitive data (tokens, passwords, PII)

## Database
- Use parameterized queries (never string concatenation)
- Keep transactions short
- Add indexes for frequently queried columns
- Make migrations reversible
