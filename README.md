# 🕌 Smart Hadith Bot - Comprehensive Development

A sophisticated, modern Telegram bot for Hadith (Islamic traditions) with advanced UI/UX design, leveraging the Dorar.net API for comprehensive Islamic content delivery.

![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![Telegraf](https://img.shields.io/badge/Telegraf-4.15%2B-blue)
![Prisma](https://img.shields.io/badge/Prisma-5.7%2B-2D3748)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57)

## 🌟 Features

### 🔍 **Intelligent Hadith Search**
- Advanced search engine with caching and suggestions
- Support for Arabic text with proper normalization
- Search by narrator, book, topic, or hadith grade
- Auto-completion and search suggestions
- Smart filtering with verified sources

### 📚 **Personal Library System**
- Save favorite hadiths with custom tags and notes
- Organize favorites by topic, book, or custom collections
- Export/import functionality for backup
- Advanced search within personal library
- Reading progress tracking

### 🔔 **Smart Reminder System**
- Customizable daily, weekly, or monthly reminders
- Timezone-aware delivery
- Content personalization based on user preferences
- Adaptive scheduling with engagement tracking
- Multiple reminder types and topics

### 📊 **Advanced Analytics**
- Comprehensive user activity tracking
- Achievement system with badges
- Personal statistics and progress visualization
- Reading patterns analysis
- Admin dashboard with detailed insights

### 🎨 **Beautiful UI/UX**
- Modern, emoji-rich interface design
- Responsive inline keyboards
- Arabic RTL text support
- Contextual action menus
- Smooth navigation with breadcrumbs

### 👥 **Group Features** (Optional)
- Group-specific settings and configurations
- Admin controls for group management
- Spam protection and rate limiting
- Group statistics and leaderboards
- Custom group reminders

### 🔐 **Security & Performance**
- Rate limiting to prevent abuse
- Input validation and sanitization
- Comprehensive error handling
- Database connection pooling
- Multi-layer caching strategy

## 🏗️ Technical Architecture

### Core Technologies
- **Runtime**: Node.js 18+ with ES Modules
- **Bot Framework**: Telegraf.js 4.15+
- **Database**: SQLite3 with Prisma ORM
- **Scheduling**: node-cron
- **HTTP Client**: axios
- **Logging**: winston
- **Validation**: joi
- **DateTime**: moment.js with timezone support

### Project Structure
```
smart-hadith-bot/
├── 📁 src/
│   ├── 🎮 handlers/           # Command & callback handlers
│   ├── 🎨 ui/                # Advanced UI/UX components
│   ├── 🗃️ database/          # Data management with Prisma
│   ├── 🌐 api/               # External API integrations
│   ├── 🔧 utils/             # Helper utilities
│   ├── ⚡ middlewares/       # Request processing
│   ├── ⚙️ config/            # Configuration management
│   └── 🧪 services/          # Business logic services
├── 📊 data/                  # Static data & backups
├── 🧪 tests/                 # Comprehensive testing
├── 📖 docs/                  # Documentation
└── 🚀 deployment/            # Deployment configs
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- Telegram Bot Token (from @BotFather)

### Installation

1. **Clone the repository:**
```bash
git clone <repository-url>
cd smart-hadith-bot
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Required
BOT_TOKEN=your_telegram_bot_token_here
BOT_USERNAME=your_bot_username
ADMIN_ID=your_telegram_user_id

# Optional
DATABASE_URL="file:./data/hadith_bot.db"
LOG_LEVEL=info
NODE_ENV=development
```

4. **Set up the database:**
```bash
npm run db:generate
npm run db:migrate
```

5. **Start the bot:**
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

## 📋 Available Scripts

```bash
# Development
npm run dev              # Start with auto-reload
npm run logs            # View logs

# Database
npm run db:generate     # Generate Prisma client
npm run db:migrate      # Run migrations
npm run db:seed         # Seed initial data
npm run db:studio       # Open Prisma Studio

# Testing
npm test                # Run tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage

# Code Quality
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint issues

# Docker
npm run docker:build    # Build Docker image
npm run docker:run      # Run Docker container
```

## 🔧 Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BOT_TOKEN` | ✅ | - | Telegram Bot Token |
| `BOT_USERNAME` | ✅ | - | Bot Username |
| `ADMIN_ID` | ✅ | - | Admin Telegram ID |
| `DATABASE_URL` | ❌ | `file:./data/hadith_bot.db` | Database connection string |
| `LOG_LEVEL` | ❌ | `info` | Logging level |
| `NODE_ENV` | ❌ | `development` | Environment |
| `PORT` | ❌ | `3000` | Web server port |

### Feature Toggles

```env
ENABLE_ANALYTICS=true
ENABLE_REMINDERS=true
ENABLE_GROUPS=true
ENABLE_ADMIN_PANEL=true
```

### Rate Limiting

The bot includes built-in rate limiting:
- **Search**: 30 requests per minute
- **Random Hadith**: 10 requests per minute
- **Favorites**: 50 requests per minute
- **Admin**: 100 requests per minute

## 🗄️ Database Schema

The bot uses a comprehensive database schema with the following main entities:

- **Users**: User profiles and preferences
- **Hadiths**: Hadith content with metadata
- **Favorites**: User's saved hadiths
- **Reminders**: Scheduled reminder settings
- **Analytics**: User activity tracking
- **Achievements**: Gamification system
- **Groups**: Group management (optional)
- **Cache**: Performance optimization

## 🌐 API Integration

### Dorar.net API
- **Endpoint**: `https://dorar.net/dorar_api.json`
- **Method**: GET with `skey` parameter
- **Features**: Search, caching, data normalization
- **Rate Limiting**: Respectful API usage

### Caching Strategy
- **Memory Cache**: 5-minute TTL for frequent requests
- **Database Cache**: 1-hour TTL for API responses
- **Background Cleanup**: Automatic cache maintenance

## 🎨 UI/UX Features

### Design Principles
- **Modern & Intuitive**: Clean, contemporary interface
- **Emoji-Rich**: Strategic visual elements
- **Accessibility**: Arabic RTL support
- **Interactive**: Rich inline keyboards
- **Responsive**: Adaptive layouts

### Keyboard Layouts
- **Main Menu**: 4x2 grid with primary actions
- **Search Options**: Advanced search capabilities
- **Hadith Display**: Context-aware action buttons
- **Settings Panel**: Hierarchical navigation
- **Admin Panel**: Management interface

## 📊 Analytics & Monitoring

### User Analytics
- Activity tracking with privacy compliance
- Engagement metrics and patterns
- Achievement system with progress tracking
- Personalized insights and recommendations

### System Monitoring
- Comprehensive logging with Winston
- Performance metrics tracking
- Error monitoring and alerting
- Health check endpoints

### Admin Dashboard
- Real-time user statistics
- System performance metrics
- Error logs and debugging tools
- User management capabilities

## 🚀 Deployment

### Free Hosting Options

1. **Railway** (Recommended)
   - 500 hours/month free tier
   - Automatic deployments from Git
   - Built-in PostgreSQL option

2. **Render**
   - Static sites + services
   - GitHub integration
   - Automatic SSL

3. **Fly.io**
   - Container hosting
   - Global edge deployment
   - Generous free tier

### Docker Deployment

```dockerfile
# Dockerfile included in project
docker build -t smart-hadith-bot .
docker run -p 3000:3000 smart-hadith-bot
```

### Manual Deployment

1. **Clone on server:**
```bash
git clone <repository-url>
cd smart-hadith-bot
```

2. **Install dependencies:**
```bash
npm ci --only=production
```

3. **Set up environment:**
```bash
# Create .env with production values
NODE_ENV=production
BOT_TOKEN=your_production_token
# ... other variables
```

4. **Set up database:**
```bash
npm run db:generate
npm run db:migrate
```

5. **Start with PM2:**
```bash
npm install -g pm2
pm2 start ecosystem.config.js
```

## 🧪 Testing

### Test Coverage
- **Unit Tests**: 90%+ coverage for core business logic
- **Integration Tests**: API interactions and database operations
- **E2E Tests**: Complete user interaction flows
- **Performance Tests**: Load testing for concurrent users

### Running Tests
```bash
npm test                # Run all tests
npm run test:unit       # Unit tests only
npm run test:integration # Integration tests only
npm run test:e2e        # End-to-end tests
npm run test:coverage   # Coverage report
```

## 📚 Documentation

### Code Documentation
- JSDoc comments for all public methods
- Type definitions using TypeScript-style comments
- API documentation with request/response examples
- Deployment guide with step-by-step instructions

### User Documentation
- Comprehensive feature explanations
- Screenshot-based user guides
- Admin management documentation
- API reference for developers

## 🔐 Security

### Security Measures
- Input validation and sanitization with Joi
- Rate limiting to prevent abuse
- SQL injection prevention with Prisma
- XSS protection with proper encoding
- Admin-only functions with access control

### Privacy
- GDPR-compliant data handling
- User data anonymization options
- Configurable analytics collection
- Data export and deletion capabilities

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Install dependencies: `npm install`
4. Make your changes
5. Run tests: `npm test`
6. Submit a pull request

### Code Style
- ESLint configuration included
- Prettier for code formatting
- Conventional commits for Git messages
- JSDoc for documentation

### Guidelines
- Write tests for new features
- Update documentation as needed
- Follow the existing code style
- Keep commits atomic and descriptive

## 📈 Performance

### Optimizations
- **Database**: Connection pooling, query optimization
- **Caching**: Multi-layer caching strategy
- **API**: Request batching and throttling
- **Memory**: Efficient data structures
- **Logging**: Asynchronous logging with rotation

### Monitoring
- Response time tracking
- Memory usage monitoring
- Database query performance
- Cache hit rates
- Error rate tracking

## 🌍 Internationalization

### Supported Languages
- **Arabic**: Primary language with RTL support
- **English**: Secondary language for interface

### Adding Languages
1. Create language file in `src/locales/`
2. Update configuration
3. Add language selection in settings
4. Test with different locales

## 🎯 Roadmap

### Phase 1 (Current)
- ✅ Core bot functionality
- ✅ Basic search and favorites
- ✅ User management
- ✅ Database integration

### Phase 2 (Next)
- 🔄 Advanced search features
- 🔄 Reminder system
- 🔄 Analytics dashboard
- 🔄 Group functionality

### Phase 3 (Future)
- 📋 Voice message support
- 📋 Image sharing for hadiths
- 📋 Multi-language support
- 📋 Advanced AI features

## 🆘 Support

### Getting Help
- **Issues**: Report bugs on GitHub Issues
- **Documentation**: Check the docs/ directory
- **Community**: Join our Telegram support group
- **Email**: Contact the development team

### Common Issues
- **Bot not responding**: Check token and permissions
- **Database errors**: Verify database setup
- **Memory issues**: Check Node.js version and memory limits
- **API errors**: Verify Dorar.net API accessibility

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Dorar.net** for providing the Hadith API
- **Telegraf.js** for the excellent bot framework
- **Prisma** for the modern database toolkit
- **The Islamic community** for continuous support and feedback

## 📞 Contact

- **Developer**: Smart Hadith Bot Team
- **Email**: contact@smarthadithbot.com
- **Telegram**: @SmartHadithBotSupport
- **Website**: https://smarthadithbot.com

---

**Remember**: This is not just a bot—it's a digital companion for Islamic learning that should inspire, educate, and bring users closer to the beautiful teachings of Prophet Muhammad ﷺ.

*"اللهم بارك لنا فيما علمتنا وعلمنا ما ينفعنا"*

🕌 **May Allah bless our efforts in spreading beneficial knowledge** 🕌
