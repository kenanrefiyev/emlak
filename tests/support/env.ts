// Every test process talks to the separate yuva_test database (see .env.test).
import { config } from "dotenv";
config({ path: ".env.test", override: true, quiet: true });
// Tests never call the real exchange-rate API: an unreachable endpoint makes any
// accidental refresh fail fast. Rate tests seed the table or pass a fake fetch.
process.env.EXCHANGE_RATES_URL = "http://127.0.0.1:9/exchange-rates";
