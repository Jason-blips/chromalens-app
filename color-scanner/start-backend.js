/**
 * 后端启动脚本
 * 检查 Python 环境并启动 Flask 后端服务
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const backendDir = path.join(__dirname, '..', 'backend');
const appPy = path.join(backendDir, 'app.py');

// 检查后端文件是否存在
if (!fs.existsSync(appPy)) {
  console.error('❌ 错误: 找不到 backend/app.py 文件');
  process.exit(1);
}

// 检查 Python 是否安装
const pythonCommands = ['python3', 'python'];
let pythonCmd = null;

for (const cmd of pythonCommands) {
  try {
    const { execSync } = require('child_process');
    execSync(`${cmd} --version`, { stdio: 'ignore' });
    pythonCmd = cmd;
    break;
  } catch (e) {
    // 继续尝试下一个命令
  }
}

if (!pythonCmd) {
  console.error('❌ 错误: 未找到 Python。请确保已安装 Python 3.8+');
  console.error('   安装方法: https://www.python.org/downloads/');
  process.exit(1);
}

console.log(`✅ 使用 Python: ${pythonCmd}`);
console.log(`🚀 启动后端服务 (端口 5000)...`);

// 启动 Flask 后端
const backend = spawn(pythonCmd, [appPy], {
  cwd: backendDir,
  stdio: 'inherit',
  shell: true
});

backend.on('error', (err) => {
  console.error('❌ 后端启动失败:', err.message);
  process.exit(1);
});

backend.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`❌ 后端服务异常退出，代码: ${code}`);
    process.exit(1);
  }
});

// 处理进程退出
process.on('SIGINT', () => {
  console.log('\n🛑 正在关闭后端服务...');
  backend.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  backend.kill();
  process.exit(0);
});
