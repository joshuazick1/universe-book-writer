# Contributing to Multi-Universe Book Series Writing Assistant

We're excited that you want to contribute to the VerseForge! This guide will help you get started with contributing to our open-source project.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. We are committed to providing a welcoming and inspiring community for all.

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

Examples of behavior that contributes to creating a positive environment include:

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

## How to Contribute

### Reporting Issues

#### Bug Reports
Before creating a bug report, please check the existing issues to see if the problem has already been reported. If it hasn't, create a new issue and include:

- **Clear title** describing the issue
- **Detailed description** of the problem
- **Steps to reproduce** the issue
- **Expected behavior** vs actual behavior
- **Environment information** (OS, Node.js version, browser, etc.)
- **Screenshots or logs** if applicable

#### Feature Requests
We welcome feature requests! Please:

- Check if the feature has already been requested
- Provide a clear description of the feature
- Explain why it would be useful
- Consider how it fits with the project's goals

### Development Setup

1. **Fork the repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/verseforge.git
   cd verseforge
   ```

2. **Set up development environment**
   ```bash
   # Install dependencies
   npm install
   
   # Build core packages
   npm run build
   
   # Set up environment files
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

3. **Start development servers**
   ```bash
   npm run dev
   ```

4. **Verify setup**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:5000
   - Run tests: `npm test`

### Making Changes

#### 1. Create a Branch
```bash
# Create and switch to a new branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description
```

#### 2. Development Guidelines

**Code Style**
- Follow our [Development Guide](docs/DEVELOPMENT_GUIDE.md)
- Use TypeScript strictly (no `any` types)
- Follow the existing code patterns
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

**File Organization**
- Keep files under 200 lines (backend) or 500 lines (frontend)
- Use barrel exports (`index.ts` files)
- Follow the established directory structure
- Group related functionality together

**Testing Requirements**
- Write unit tests for new functionality
- Update existing tests when modifying code
- Ensure all tests pass: `npm test`
- Maintain test coverage above 80%

#### 3. Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
git commit -m "feat(universe): add character relationship mapping"
git commit -m "fix(auth): resolve token expiration handling"
git commit -m "docs(api): update authentication endpoints"
```

#### 4. Documentation Updates

When making changes, update relevant documentation:

- **README files** for new packages or major changes
- **API documentation** for backend changes
- **Component documentation** for UI changes
- **Architecture docs** for structural changes

### Pull Request Process

#### 1. Prepare Your Pull Request

Before submitting:
- [ ] All tests pass locally
- [ ] Code follows style guidelines
- [ ] Documentation is updated
- [ ] Commit messages follow convention
- [ ] Branch is up to date with main

```bash
# Update your branch
git fetch upstream
git rebase upstream/main

# Run final checks
npm run lint
npm test
npm run build
```

#### 2. Submit Pull Request

1. Push your branch to your fork
2. Create a pull request on GitHub
3. Fill out the PR template completely
4. Request review from maintainers

#### 3. Pull Request Template

```markdown
## Description
Brief description of the changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] All tests pass

## Documentation
- [ ] Code comments updated
- [ ] README updated
- [ ] API documentation updated
- [ ] Architecture docs updated

## Screenshots (if applicable)
Add screenshots to show the changes.

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code where necessary
- [ ] My changes generate no new warnings
- [ ] New and existing unit tests pass locally
```

#### 4. Review Process

All pull requests require:
- [ ] Code review from at least one maintainer
- [ ] All CI checks passing
- [ ] Documentation review (if applicable)
- [ ] Design review (for UI changes)

Reviewers will check for:
- Code quality and adherence to guidelines
- Test coverage and quality
- Documentation completeness
- Breaking changes and backward compatibility
- Performance implications

## Development Areas

### Frontend Development
**Technologies:** React, TypeScript, Tailwind CSS, Zustand
**Focus Areas:**
- UI/UX improvements
- Performance optimization
- Accessibility features
- Mobile responsiveness
- Component library expansion

### Backend Development
**Technologies:** Node.js, Express, MongoDB, Redis
**Focus Areas:**
- API development and optimization
- Database schema design
- Authentication and security
- Performance and scalability
- Integration with external services

### AI Integration
**Technologies:** Ollama, LangChain
**Focus Areas:**
- Model integration and optimization
- AI-assisted writing features
- Prompt engineering
- Model routing and orchestration
- Performance optimization

### Plugin Development
**Technologies:** Plugin SDK, Theme system
**Focus Areas:**
- Universe-specific plugins (Star Trek, Star Wars, etc.)
- Custom AI models for different universes
- Theme development
- Plugin architecture improvements

### Documentation
**Focus Areas:**
- User guides and tutorials
- API documentation
- Architecture documentation
- Plugin development guides
- Video tutorials and examples

## Getting Help

### Development Questions
- **GitHub Discussions**: For general questions and feature discussions
- **Discord Server**: Real-time chat with the community
- **GitHub Issues**: For bug reports and feature requests

### Resources
- [Development Guide](docs/DEVELOPMENT_GUIDE.md) - Comprehensive development info
- [API Documentation](backend/docs/API_DOCUMENTATION.md) - Complete API reference
- [Plugin SDK](packages/plugin-sdk/README.md) - Plugin development guide
- [Frontend Architecture](frontend/docs/FRONTEND_DOCUMENTATION.md) - React patterns

### Mentorship
New contributors can request mentorship for:
- First-time open source contributions
- Learning TypeScript and React patterns
- Understanding the project architecture
- Plugin development

## Recognition

We value all contributions and recognize contributors through:
- **Contributor list** in README and documentation
- **GitHub contributor graph** showing contributions over time
- **Special recognition** for significant contributions
- **Maintainer status** for ongoing, high-quality contributions

### Contribution Types
We recognize various types of contributions:
- **Code**: Features, bug fixes, optimizations
- **Documentation**: Guides, tutorials, API docs
- **Design**: UI/UX improvements, graphics, themes
- **Testing**: Test improvements, QA, bug reporting
- **Community**: Helping other users, discussions, feedback

## Project Roadmap

### Current Focus (Phase 1.5)
- User experience improvements
- Plugin system enhancements
- Performance optimizations
- Documentation completion

### Near-term Goals (Phase 2)
- Basic writing features
- Universe management
- Character development tools
- Story structure features

### Long-term Vision
- Advanced AI integration
- Real-time collaboration
- Mobile applications
- Community marketplace

## Security

### Reporting Security Issues
Please do **not** report security vulnerabilities through public GitHub issues. Instead:

1. Email security@verseforge.com
2. Include detailed description of the vulnerability
3. Provide steps to reproduce if possible
4. Allow time for us to address the issue before public disclosure

### Security Guidelines
- Never commit secrets or credentials
- Use environment variables for configuration
- Follow secure coding practices
- Keep dependencies updated
- Report suspicious activities

## License

By contributing to this project, you agree that your contributions will be licensed under the same license as the project (MIT License).

Your contributions will be attributed to you, and you retain copyright of your contributions while granting the project rights to use and distribute them.

## Questions?

Don't hesitate to ask questions! You can:
- Open a GitHub Discussion for general questions
- Join our Discord community for real-time help
- Email contributors@verseforge.com for specific inquiries

We're here to help you succeed as a contributor!

---

**Thank you for contributing to the VerseForge! Together, we're building an amazing tool for writers everywhere. 🚀📚**
