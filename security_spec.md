# Security Specification: LinkedIn Job Application Tracker

This specification describes the security rules and access control list for the LinkedIn Job Application Tracker Firestore database.

## 1. Data Invariants
- A `job` posting must have a valid LinkedIn URL, role name, company, tracking status, and strict server-generated timestamps.
- Only the bootstrapped administrator (`masrul89@gmail.com` with a verified email) is permitted to write, update, or delete jobs.
- The general public (unauthenticated users) can only query and read the list of parsed job opening summaries.

## 2. Access Control Model
- **Read Operations (get, list)**: Open to everyone (public) so that people can view the shared job opening summaries.
- **Write Operations (create, update, delete)**: Restricted strictly to the owner/curator `masrul89@gmail.com` with `email_verified == true`.

## 3. The "Dirty Dozen" Malicious Payloads Blocked
1. **Unauthenticated Job Creation**: Attempting to post a job without being logged in.
2. **Standard User Job Creation**: Attempting to post a job using an account other than the admin email.
3. **Spoofed Admin Email**: Attempting to log in as `masrul89@gmail.com` with `email_verified == false` to perform edits.
4. **Invalid URL Format**: Attempting to write a job with a malformed URL or a non-string URL field.
5. **Junk Field Injection (Shadow Update / Ghost fields)**: Creating a job with malicious extra fields (e.g., `isAdmin: true` or `payload: "x" * 1000000`).
6. **Bypassing Timestamp Integrity on Create**: Setting `createdAt` to a client-provided mock timestamp instead of the server time.
7. **Bypassing Timestamp Integrity on Update**: Modifying `createdAt` during a status update, or setting `updatedAt` to a past timestamp.
8. **Invalid Status Transition**: Attempting to update `status` to an unsupported value (e.g., `status: "interviewing_at_google"` instead of `bookmarked` / `applied` / `rejected`).
9. **Poisoned Document ID (Denial of Wallet)**: Injecting a 2MB string as the job document ID.
10. **Salary Injection Vulnerability**: Injecting non-string or oversized values into the `salary` field.
11. **Immutability Breach**: Attempting to change the original `url` of an already posted job.
12. **Unauthenticated Job Deletion**: Standard users or guests trying to delete or clean the dashboard listings.
