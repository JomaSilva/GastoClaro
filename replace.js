import fs from 'fs';

['src/pages/Login.tsx', 'src/pages/Register.tsx'].forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    content = content.replace(/rounded-3xl border border-zinc-200 bg-white p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-900/g, 'rounded-[2.5rem] border border-white/20 bg-white/50 p-10 shadow-2xl backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-900/50');
    content = content.replace(/text-3xl font-bold tracking-tight/g, 'text-4xl font-light font-serif tracking-tight');
    content = content.replace(/bg-blue-600/g, 'gold-gradient-bg');
    content = content.replace(/hover:bg-blue-700/g, 'hover:opacity-90');
    content = content.replace(/text-blue-600/g, 'text-brand-600');
    content = content.replace(/text-blue-500/g, 'text-brand-500');
    content = content.replace(/text-blue-400/g, 'text-brand-400');
    content = content.replace(/text-blue-300/g, 'text-brand-300');
    content = content.replace(/focus:ring-blue-500/g, 'focus:ring-brand-500/50');
    content = content.replace(/bg-zinc-50/g, 'bg-white/80');
    content = content.replace(/bg-zinc-950/g, 'bg-zinc-950/80');
    content = content.replace(/border-zinc-200/g, 'border-white/20');
    content = content.replace(/border-zinc-800/g, 'border-zinc-800/50');
    
    fs.writeFileSync(file, content);
  }
});
console.log('Done');
