import dotenv from "dotenv";
import app from "./app";

dotenv.config();

const PORT = process.env.NODE_ENV === "production" ? 3000 : 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("==========================================");
  console.log(`🚀 BACKEND READY ON http://localhost:${PORT}`);
  console.log("==========================================");
});
