import fs from 'fs';
import path from 'path';

const cssPath = path.join(process.cwd(), 'dist', 'saas-os.css');

if (fs.existsSync(cssPath)) {
  let css = fs.readFileSync(cssPath, 'utf8');
  
  // Wrap all CSS rules in .saas-os
  css = `.saas-os {\n${css}\n}`;
  
  fs.writeFileSync(cssPath, css, 'utf8');
  console.log('✅ CSS wrapped in .saas-os');
} else {
  console.log('❌ CSS file not found');
} 