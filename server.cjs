(async () => {
  const { register } = await import('tsx/esm/api');

  register();
  await import('./server.ts');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});