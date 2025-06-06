// Basic AI server setup
const port = process.env.PORT || 5100;

async function startServer() {
  console.log(`AI Server running on port ${port}`);
}

startServer().catch(console.error);
