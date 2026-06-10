const fs = require("fs");
const path = require("path");
process.env.CONTINUE_DEVELOPMENT = true;

process.env.CONTINUE_GLOBAL_DIR = path.join(
  process.env.PROJECT_DIR,
  "extensions",
  ".continue-debug",
);

const indexPath = path.join(__dirname, "out", "index.js");
if (!fs.existsSync(indexPath)) {
  console.error(
    "Error: binary/out/index.js not found. Run `npm run rebuild` from the binary directory first.",
  );
  process.exit(1);
}

require("./out/index.js");
