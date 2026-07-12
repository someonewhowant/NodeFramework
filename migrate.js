const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'views');
fs.mkdirSync(srcDir, { recursive: true });

const oldDir = path.join(__dirname, 'app', 'templates');
if (fs.existsSync(oldDir)) {
    const files = fs.readdirSync(oldDir);
    for (const file of files) {
        fs.renameSync(path.join(oldDir, file), path.join(srcDir, file));
    }
    fs.rmSync(path.join(__dirname, 'app'), { recursive: true, force: true });
    console.log('Migration complete. Old app directory removed.');
} else {
    console.log('No old templates found.');
}
