// Every test process talks to the separate yuva_test database (see .env.test).
import { config } from "dotenv";
config({ path: ".env.test", override: true, quiet: true });
