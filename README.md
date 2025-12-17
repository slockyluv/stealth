# stealth

Production-ready starter Discord bot.

## Stack
- Node.js 20
- TypeScript
- discord.js v14
- Prisma + PostgreSQL
- PM2 (external)

## Setup
1. Copy `.env.example` → `.env`
2. Fill env variables
3. Install deps: `npm install`
4. Generate Prisma client: `npx prisma generate`
5. Register commands: `npm run register:commands`
6. Build: `npm run build`
7. Start: `npm start`
