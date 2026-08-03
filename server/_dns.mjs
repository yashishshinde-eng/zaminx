import dns from "node:dns";
dns.setServers(["8.8.8.8","1.1.1.1"]);
dns.resolveSrv("_mongodb._tcp.minehealer.mif1alv.mongodb.net", (err, addrs) => {
  if (err) { console.log("SRV FAILED:", err.code || err.message); process.exit(1); }
  console.log("SRV OK. hosts:", addrs.map(a=>`${a.name}:${a.port}`).join(", "));
  process.exit(0);
});
