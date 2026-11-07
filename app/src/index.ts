import { createApp } from "./api/app.js";

const port = Number(process.env.PORT ?? 3000);
const app = createApp();

app.listen(port, () => {
  console.log(`Rezervace v ordinaci beží na http://localhost:${port}`);
});
