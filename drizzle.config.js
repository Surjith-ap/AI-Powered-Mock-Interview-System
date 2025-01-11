/** @type { import("drizzle-kit").Config } */
export default {
    schema: "./utils/schema.js",
    dialect: 'postgresql',
    dbCredentials: {
        url: 'postgresql://neondb_owner:lyi4J0XPLpYC@ep-bitter-truth-a5feops1.us-east-2.aws.neon.tech/ai-interview-mocker?sslmode=require',
    }
};