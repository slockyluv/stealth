import 'dotenv/config';
const REQUIRED_ENVS = ['BOT_TOKEN', 'CLIENT_ID', 'GUILD_ID', 'DATABASE_URL'];
export function loadEnv() {
    const missing = REQUIRED_ENVS.filter((key) => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing environment variables: ${missing.join(', ')}`);
    }
}
//# sourceMappingURL=env.js.map