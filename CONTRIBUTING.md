# Contributing to Berkeley Memory Map

Thank you for your interest in contributing to the Berkeley Memory Map project! This document provides guidelines and information for contributors.

## 🚀 Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/berkeley-memory-map.git
   cd berkeley-memory-map
   ```
3. **Set up the development environment** following the [COLLABORATOR_SETUP.md](./COLLABORATOR_SETUP.md) guide
4. **Create a new branch** for your feature:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 📝 Development Guidelines

### Code Style
- Use **TypeScript** for all new files
- Follow **React best practices** and hooks patterns
- Use **Tailwind CSS** for styling
- Write **descriptive commit messages**
- Add **comments** for complex logic

### File Organization
- Components go in `src/components/`
- Hooks go in `src/hooks/`
- Services go in `src/services/`
- Types go in `src/types/`
- Utilities go in `src/utils/`

### Testing
- Test your changes locally with `npm run dev`
- Ensure the Supabase integration test shows "Connected"
- Test on both desktop and mobile browsers
- Verify the map loads and memories display correctly

## 🔄 Pull Request Process

1. **Make your changes** on your feature branch
2. **Test thoroughly** to ensure everything works
3. **Run linting**: `npm run lint`
4. **Run type checking**: `npm run type-check`
5. **Commit your changes**:
   ```bash
   git add .
   git commit -m "Add: brief description of your changes"
   ```
6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Create a Pull Request** on GitHub with:
   - Clear title and description
   - Screenshots if UI changes
   - Testing instructions

## 🎯 Areas for Contribution

### Frontend Features
- **UI/UX improvements** for the map interface
- **Memory creation enhancements** (voice recording, image uploads)
- **Audio playback controls** (volume, skip, pause)
- **Mobile responsiveness** improvements
- **Accessibility** features

### Backend Features
- **Supabase Edge Functions** for AI processing
- **Database optimizations** and new queries
- **Authentication** and user management
- **API integrations** (additional AI services)

### Map Features
- **Map styling** and customization
- **Geolocation** improvements
- **Geofencing** enhancements
- **Memory clustering** for better performance

### Infrastructure
- **CI/CD pipeline** improvements
- **Testing** framework setup
- **Documentation** updates
- **Performance** optimizations

## 🐛 Bug Reports

When reporting bugs, please include:
- **Steps to reproduce** the issue
- **Expected behavior** vs actual behavior
- **Screenshots** if applicable
- **Browser/device** information
- **Console errors** if any

## 💡 Feature Requests

For new features, please:
- **Check existing issues** first
- **Describe the use case** clearly
- **Provide mockups** if possible
- **Consider implementation** complexity

## 📋 Code Review Process

All pull requests will be reviewed for:
- **Code quality** and style
- **Functionality** and testing
- **Performance** implications
- **Security** considerations
- **Documentation** updates

## 🏷️ Issue Labels

- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Improvements to documentation
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention is needed
- `question` - Further information is requested

## 📞 Getting Help

- **GitHub Discussions** for questions and ideas
- **GitHub Issues** for bugs and feature requests
- **Pull Request comments** for code-specific questions

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🙏 Recognition

Contributors will be recognized in:
- **README.md** contributors section
- **Release notes** for significant contributions
- **GitHub contributors** page

Thank you for contributing to Berkeley Memory Map! 🚀
