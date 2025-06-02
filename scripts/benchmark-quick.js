const { spawn, exec } = require('child_process');
const os = require('os');

// === CONFIGURATION ===
const config = {
  iterations: 3,
  timeout: 15000, // 15s max
  port: 3000
};

// === UTILITIES ===
function formatTime(ms) {
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatMemory(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function getProcessMemory(pid) {
  return new Promise((resolve) => {
    if (os.platform() === 'win32') {
      exec(`wmic process where processid=${pid} get PageFileUsage /value`, (error, stdout) => {
        if (error) {
          resolve(0);
          return;
        }
        
        const match = stdout.match(/PageFileUsage=(\d+)/);
        if (match) {
          resolve(parseInt(match[1]) * 1024); // Convert KB to bytes
        } else {
          resolve(0);
        }
      });
    } else {
      // Linux/Mac
      exec(`ps -o rss= -p ${pid}`, (error, stdout) => {
        if (error) {
          resolve(0);
          return;
        }
        const rssKB = parseInt(stdout.trim());
        resolve(rssKB * 1024); // Convert KB to bytes
      });
    }
  });
}

// === QUICK BENCHMARK ===
async function runQuickBenchmark() {
  console.log('\n🚀 Quick benchmark (pre-built app)...');
  
  const results = {
    appStartTime: 0,
    serverStartTime: 0,
    memoryUsage: 0,
    success: false
  };

  return new Promise((resolve) => {
    const startTime = Date.now();
    
    // Launch Electron directly (without rebuild)
    const electronProcess = spawn('npx', ['electron', '.'], {
      stdio: 'pipe',
      shell: true
    });

    let appReady = false;
    let serverReady = false;
    
    electronProcess.stdout.on('data', (data) => {
      const output = data.toString();
      
      // Detect when Electron app is ready
      if (output.includes('🚀 Electron Mode:') && !appReady) {
        results.appStartTime = Date.now() - startTime;
        appReady = true;
        console.log(`✅ Electron App: ${formatTime(results.appStartTime)}`);
      }
      
      // Detect when Next.js server is ready
      if (output.includes('Ready in') && !serverReady) {
        results.serverStartTime = Date.now() - startTime;
        serverReady = true;
        console.log(`✅ Next.js Server: ${formatTime(results.serverStartTime)}`);
        
        // Measure memory after 2s
        setTimeout(async () => {
          if (electronProcess.pid) {
            results.memoryUsage = await getProcessMemory(electronProcess.pid);
            console.log(`📊 Memory: ${formatMemory(results.memoryUsage)}`);
          }
          
          results.success = true;
          electronProcess.kill();
          resolve(results);
        }, 2000);
      }
    });

    electronProcess.stderr.on('data', (data) => {
      const output = data.toString();
      // Ignore DevTools warnings
      if (!output.includes('DevTools') && !output.includes('Autofill')) {
        console.error(`❌ ${output.trim()}`);
      }
    });

    electronProcess.on('close', (code) => {
      if (!results.success) {
        resolve(results);
      }
    });

    // Safety timeout
    setTimeout(() => {
      if (!results.success) {
        console.log('⏰ Timeout reached');
        electronProcess.kill();
        resolve(results);
      }
    }, config.timeout);
  });
}

// === COMPLETE BENCHMARK ===
async function runFullQuickBenchmark() {
  console.log('🎯 === QUICK BENCHMARK ELECTRON + NEXT.JS ===');
  console.log('📝 Note: Pre-built app (realistic usage scenario)');
  console.log(`📊 ${config.iterations} iterations\n`);
  
  const allResults = [];
  
  for (let i = 1; i <= config.iterations; i++) {
    console.log(`--- Test ${i}/${config.iterations} ---`);
    
    const result = await runQuickBenchmark();
    allResults.push(result);
    
    // Pause between tests
    if (i < config.iterations) {
      console.log('⏸️ Pause 2s...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // === RESULTS ANALYSIS ===
  const validResults = allResults.filter(r => r.success);
  
  if (validResults.length === 0) {
    console.log('\n❌ FAILURE: No successful tests');
    return;
  }
  
  const avgAppStart = validResults.reduce((sum, r) => sum + r.appStartTime, 0) / validResults.length;
  const avgServerStart = validResults.reduce((sum, r) => sum + r.serverStartTime, 0) / validResults.length;
  const avgMemory = validResults.reduce((sum, r) => sum + r.memoryUsage, 0) / validResults.length;
  
  console.log('\n🎯 === FINAL RESULTS ===');
  console.log(`✅ Successful tests: ${validResults.length}/${config.iterations}`);
  console.log(`⚡ Electron Startup: ${formatTime(avgAppStart)}`);
  console.log(`🚀 Server Startup: ${formatTime(avgServerStart)}`);
  console.log(`📊 Average Memory: ${formatMemory(avgMemory)}`);
  
  // === CRITERIA VALIDATION ===
  console.log('\n📋 === OBJECTIVES VALIDATION ===');
  const appOK = avgAppStart < 5000;
  const serverOK = avgServerStart < 10000;  
  const memoryOK = avgMemory < 200 * 1024 * 1024;
  
  console.log(`${appOK ? '✅' : '❌'} Electron Startup < 5s: ${appOK ? 'PASS' : 'FAIL'}`);
  console.log(`${serverOK ? '✅' : '❌'} Server Startup < 10s: ${serverOK ? 'PASS' : 'FAIL'}`);
  console.log(`${memoryOK ? '✅' : '❌'} Memory < 200MB: ${memoryOK ? 'PASS' : 'FAIL'}`);
  
  const score = [appOK, serverOK, memoryOK].filter(Boolean).length;
  console.log(`\n🏆 Score: ${score}/3 objectives achieved`);
  
  if (score === 3) {
    console.log('🎉 EXCELLENT! All performance criteria are met');
  } else if (score >= 2) {
    console.log('✅ GOOD! Most criteria are met');
  } else {
    console.log('⚠️ NEEDS IMPROVEMENT: Several optimizations required');
  }
}

// === EXECUTION ===
if (require.main === module) {
  runFullQuickBenchmark().catch(console.error);
}

module.exports = { runQuickBenchmark, runFullQuickBenchmark }; 