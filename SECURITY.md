# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Reporting a Vulnerability

The Nest GatewayQL team takes security bugs seriously. We appreciate your efforts to responsibly disclose your findings.

### Where to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report them through one of the following methods:

1. **GitHub Security Advisories** (Preferred)
   - Go to https://github.com/GatewayQL/nest-GatewayQL/security/advisories/new
   - Click "Report a vulnerability"

2. **Email**
   - Send an email to security@gatewayql.com
   - Include "SECURITY" in the subject line

### What to Include

Please include the following information in your report:

- Type of vulnerability
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the vulnerability, including how an attacker might exploit it

### What to Expect

After you submit a vulnerability report, you can expect:

1. **Acknowledgment**: We will acknowledge receipt of your vulnerability report within 48 hours
2. **Communication**: We will send a more detailed response within 7 days indicating the next steps
3. **Updates**: We will keep you informed about our progress toward fixing the vulnerability
4. **Credit**: We will credit you in the security advisory (unless you prefer to remain anonymous)

### Security Update Process

1. We will investigate and confirm the vulnerability
2. We will develop a fix and create a security advisory
3. We will release a patch and publish the advisory
4. We will credit the reporter (unless anonymity is requested)

## Security Best Practices

When using Nest GatewayQL, follow these security best practices:

### Production Configuration

- **Change default secrets**: Update `JWT_SECRET` and `CIPHER_KEY` in production
- **Use environment variables**: Never hardcode secrets in code
- **Enable SSL/TLS**: Use HTTPS for all connections
- **Disable debugging features**: Set `GRAPHQL_PLAYGROUND=false` and `GRAPHQL_INTROSPECTION=false`
- **Set `DB_SYNCHRONIZE=false`**: Never auto-sync database schema in production
- **Enable database SSL**: Set `DB_SSL=true` for production databases

### Authentication & Authorization

- **Use strong passwords**: Enforce minimum 8 characters with complexity requirements
- **Implement rate limiting**: Protect login endpoints from brute force attacks
- **Use JWT expiration**: Set reasonable token expiration times
- **Validate input**: Always validate and sanitize user input
- **Implement RBAC**: Use role-based access control for sensitive operations

### Network Security

- **Configure CORS properly**: Whitelist only trusted origins
- **Use security headers**: Helmet is enabled by default
- **Implement rate limiting**: Protect against DoS attacks
- **Use query complexity limits**: Prevent expensive GraphQL queries

### Dependency Management

- **Keep dependencies updated**: Regularly update npm packages
- **Audit dependencies**: Run `npm audit` regularly
- **Use lock files**: Commit `package-lock.json` to ensure consistent dependencies
- **Review dependency licenses**: Ensure compatibility with your project

### Monitoring & Logging

- **Enable audit logging**: Log authentication and authorization events
- **Monitor for anomalies**: Set up alerts for suspicious activity
- **Protect log files**: Ensure logs don't contain sensitive information
- **Implement log rotation**: Prevent disk space issues

### Database Security

- **Use parameterized queries**: TypeORM provides this by default
- **Encrypt sensitive data**: Use the built-in encryption for credentials
- **Implement database backups**: Regular automated backups
- **Use database user with minimal privileges**: Don't use database admin for application

## Known Security Features

Nest GatewayQL includes these security features:

- **Helmet**: Security headers (XSS, CSP, HSTS, etc.)
- **CORS**: Configurable cross-origin resource sharing
- **Rate Limiting**: Request throttling per IP
- **Input Validation**: class-validator for DTO validation
- **Query Complexity**: GraphQL query complexity limits
- **Password Hashing**: bcrypt with configurable salt rounds
- **JWT Authentication**: Secure token-based authentication
- **Data Encryption**: AES encryption for sensitive data
- **SQL Injection Protection**: TypeORM parameterized queries
- **XSS Protection**: GraphQL input sanitization

## Security Checklist

Before deploying to production, ensure:

- [ ] All default secrets have been changed
- [ ] HTTPS/TLS is enabled
- [ ] Database SSL is enabled
- [ ] GraphQL Playground is disabled
- [ ] GraphQL introspection is disabled
- [ ] Error messages don't leak sensitive information
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] Input validation is active
- [ ] Security headers are configured
- [ ] Audit logging is enabled
- [ ] Dependencies are up to date
- [ ] Regular security audits are scheduled

## Disclosure Policy

When we receive a security vulnerability report, we will:

1. Confirm the problem and determine affected versions
2. Audit code to find any similar problems
3. Prepare fixes for all supported versions
4. Release security patches as soon as possible
5. Publish a security advisory with credit to the reporter

## Bug Bounty Program

We currently do not offer a paid bug bounty program. However, we deeply appreciate the security research community's efforts and will:

- Publicly acknowledge your contribution (unless you prefer anonymity)
- Mention you in our security hall of fame
- Provide a letter of recommendation upon request

## Security Hall of Fame

We would like to thank the following researchers for responsibly disclosing security vulnerabilities:

<!-- This section will be updated as we receive and resolve security reports -->

*No security vulnerabilities have been reported yet.*

## Contact

For any security-related questions or concerns, contact:

- **Email**: security@gatewayql.com
- **Security Advisories**: https://github.com/GatewayQL/nest-GatewayQL/security/advisories

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NestJS Security Best Practices](https://docs.nestjs.com/security/helmet)
- [GraphQL Security](https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

Last updated: 2025-01-15
