import Redis from "ioredis";
import dotenv from "dotenv";
dotenv.config(
    {
        path: ".env",
    }
);

console.log("Redis host:", process.env.REDIS_URL);


const connection = new Redis(process.env.REDIS_URL as string);

connection.on("error", (err) => {
    console.error("Redis connection error:", err);
});

const script = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
    redis.call("EXPIRE", KEYS[1], ARGV[2])
end
if current > tonumber(ARGV[1]) then
    return 0
else
    return 1
end
`;

async function rateLimiter(ip: string, key: string, limit: number, window: number) {
    try {
        const isAllowed = await connection.eval(script, 1, `${ip}:${key}`, limit, window);
        console.log(`Rate limiter check for ${ip}:${key} - Allowed: ${isAllowed === 1}`);
        console.log(isAllowed === 1 ? "Request allowed" : "Rate limit exceeded");
        return isAllowed === 1;
    } catch (error) {
        console.error("Error in rate limiter:", error);
        return false; // fail-closed; consider fail-open depending on your risk tolerance
    }
}


export { rateLimiter };