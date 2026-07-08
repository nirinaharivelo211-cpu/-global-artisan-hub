# Contributing to TISSAGE

Thank you for considering contributing! This guide will help you get started.

## Code of Conduct

- Be respectful to all contributors
- Focus on constructive feedback
- Help create a welcoming environment

## Getting Started

1. **Fork** the repository
2. **Clone** your fork: `git clone <your-fork>`
3. **Create a branch**: `git checkout -b feature/your-feature-name`
4. **Make changes** and commit with clear messages
5. **Push** to your fork: `git push origin feature/your-feature-name`
6. **Open a Pull Request** with a description

## Development Setup

See [README.md](README.md) for quick start. For detailed troubleshooting, see [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Code Style

### Python (Backend)

- Follow [PEP 8](https://www.python.org/dev/peps/pep-0008/)
- Use type hints where possible
- Max line length: 100 characters
- Use `black` for formatting (when added to project)

Example:

```python
from typing import Optional

def create_product(name: str, price: float) -> Optional[dict]:
    """Create a new product."""
    return {"name": name, "price": price}
```

### TypeScript/React (Frontend)

- Use standard ESLint config (already in project)
- Format with Prettier (when run: `npm run format`)
- Use functional components and hooks
- Props should have TypeScript types

Example:

```typescript
interface ProductProps {
  id: string;
  name: string;
  price: number;
}

export function Product({ id, name, price }: ProductProps) {
  return (
    <div>
      <h3>{name}</h3>
      <p>${price}</p>
    </div>
  );
}
```

## Commit Messages

Use clear, descriptive commit messages:

- **Good**: `fix: handle missing product images on detail page`
- **Good**: `feat: add bulk stock editor for artisans`
- **Good**: `docs: update deployment guide for AWS`
- **Avoid**: `fix stuff`, `update`, `changes`

Format:
```
<type>: <short summary>

Optional longer description if needed.
- Bullet points okay here
- Reference issues: #123
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

## Pull Request Process

1. **Keep it focused**: one feature or fix per PR
2. **Add tests**: if applicable (currently minimal, but welcomed!)
3. **Update docs**: if you change user-facing behavior
4. **Link issues**: if your PR closes/addresses an issue, mention it: `Closes #123`
5. **Add description**: explain what, why, and how

Example PR description:

```markdown
## Description
Fixes #45: Add QR code download for shipments from artisan dashboard.

## Changes
- New `useQrCode()` hook to generate/download QR
- Updated Artisan shipments page with download button
- Added QR generation test (mock)

## Testing
- Tested locally: QR downloads correctly
- Verified on Safari/Chrome/Firefox
- No regressions in other shipment flows

## Screenshots
[If applicable: paste or link screenshots]
```

## Testing

We welcome test contributions! Current coverage is minimal:

```bash
# Backend (when pytest added)
cd backend
pytest tests/

# Frontend (when vitest/jest added)
npm run test
```

For now, manual testing:
1. Start dev environment: `npm run docker:up`
2. Test the feature in browser
3. Check backend logs for errors: `npm run docker:logs`

## Documentation

If you:
- Add a feature → update relevant doc in `docs/`
- Change API endpoints → update `backend/README.md`
- Modify build/deploy → update `docs/DEVELOPMENT.md`
- Add env variables → update `.env.example`

## Issues & Discussions

- **Found a bug?** Open an issue with: what happened, expected behavior, steps to reproduce
- **Feature request?** Describe the use case and why it matters
- **Have questions?** Start a discussion or comment on related issues

## Local Commands Cheat Sheet

```bash
# Development
npm run dev                    # Dev: frontend + use Docker for backend
npm run docker:up             # Dev: all services in Docker
npm run docker:down           # Stop Docker services

# Building
npm run build                 # Build frontend for production
npm run lint                  # Check eslint (frontend)

# Database
cd backend && python manage.py db upgrade    # Run migrations

# Docker
npm run docker:build          # Rebuild images
npm run docker:logs           # View logs
```

## Need Help?

- Check `docs/DEVELOPMENT.md` for setup issues
- Review existing Pull Requests for examples
- Open an issue or discussion
- Reach out to maintainers

Thank you for contributing! 🎨
