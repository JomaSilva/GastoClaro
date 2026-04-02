import { register } from 'tsx/esm/api';

register();

import('./server.ts').catch((error) => {
	console.error(error);
	process.exit(1);
});