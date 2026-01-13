const fs = require('fs');
const { execSync } = require('child_process');

const logFile = 'git_debug_node.txt';
const commands = [
    'git status',
    'git remote -v',
    'git log -2',
    'git push origin main'
];

let log = '';

commands.forEach(cmd => {
    log += `\nCMD: ${cmd}\n`;
    try {
        const output = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
        log += `OUTPUT:\n${output}\n`;
    } catch (e) {
        log += `ERROR:\n${e.message}\n${e.stdout}\n${e.stderr}\n`;
    }
    log += '-'.repeat(20) + '\n';
});

fs.writeFileSync(logFile, log);
console.log('Done writing log');
