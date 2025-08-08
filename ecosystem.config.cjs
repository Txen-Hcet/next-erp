module.exports = {
  apps: [
    {
      name: "navel-erp",
      script: "./node_modules/.bin/serve",
      args: ["-s", "dist", "-l", "3113"],
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
