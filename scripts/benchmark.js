const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// === CONFIGURATION ===
const BENCHMARK_CONFIG = {
  iterations: 3,
  timeout: 30000, // 30s max
  serverCheckInterval: 100, // 100ms
  memoryCheckInterval: 1000 // 1s
};

// === UTILITIES ===
function formatTime(ms) {
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatMemory(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function checkServerReady(port = 3000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const checkInterval = setInterval(async () => {
      try {
        const response = await fetch(`http://127.0.0.1:${port}`);
        if (response.ok) {
          clearInterval(checkInterval);
          resolve(Date.now() - startTime);
        }
      } catch (error) {
        // Server not ready yet
        if (Date.now() - startTime > BENCHMARK_CONFIG.timeout) {
          clearInterval(checkInterval);
          resolve(-1); // Timeout
        }
      }
    }, BENCHMARK_CONFIG.serverCheckInterval);
  });
}

function getElectronMemoryUsage(pid) {
  return new Promise((resolve) => {
    exec(`tasklist /FI "PID eq ${pid}" /FO CSV`, (error, stdout) => {
      if (error) {
        resolve(0);
        return;
      }
      
      const lines = stdout.split('\n');
      if (lines.length > 1) {
        const memoryStr = lines[1].split(',')[4];
        const memoryKB = parseInt(memoryStr.replace(/[^0-9]/g, ''));
        resolve(memoryKB * 1024); // Convert to bytes
      } else {
        resolve(0);
      }
    });
  });
}

// === MAIN BENCHMARK ===
async function runSingleBenchmark() {
  console.log('\n🚀 Starting benchmark...');
  
  const results = {
    appStartTime: 0,
    serverStartTime: 0,
    memoryUsage: 0,
    success: false
  };

  return new Promise((resolve) => {
    const startTime = Date.now();
    
    // Launch Electron
    const electronProcess = spawn('npm', ['run', 'electron:build'], {
      stdio: 'pipe',
      shell: true
    });

    let appReady = false;
    let serverReady = false;
    
    electronProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`📄 ${output.trim()}`);
      
      // Detect when Electron app is ready
      if (output.includes('🚀 Electron Mode:') && !appReady) {
        results.appStartTime = Date.now() - startTime;
        appReady = true;
        console.log(`✅ App started in ${formatTime(results.appStartTime)}`);
      }
      
      // Detect when Next.js server is ready
      if (output.includes('Ready') && !serverReady) {
        results.serverStartTime = Date.now() - startTime;
        serverReady = true;
        console.log(`✅ Server ready in ${formatTime(results.serverStartTime)}`);
        
        // Measure memory after 2s
        setTimeout(async () => {
          if (electronProcess.pid) {
            results.memoryUsage = await getElectronMemoryUsage(electronProcess.pid);
            console.log(`📊 Memory: ${formatMemory(results.memoryUsage)}`);
          }
          
          results.success = true;
          electronProcess.kill();
          resolve(results);
        }, 2000);
      }
    });

    electronProcess.stderr.on('data', (data) => {
      console.error(`❌ ${data.toString().trim()}`);
    });

    electronProcess.on('close', (code) => {
      if (!results.success) {
        console.log(`🔄 Process closed with code ${code}`);
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
    }, BENCHMARK_CONFIG.timeout);
  });
}

// === COMPLETE BENCHMARK ===
async function runFullBenchmark() {
  console.log('🎯 === BENCHMARK ELECTRON + NEXT.JS ===');
  console.log(`📊 ${BENCHMARK_CONFIG.iterations} iterations`);
  
  const allResults = [];
  
  for (let i = 1; i <= BENCHMARK_CONFIG.iterations; i++) {
    console.log(`\n--- Iteration ${i}/${BENCHMARK_CONFIG.iterations} ---`);
    
    const result = await runSingleBenchmark();
    allResults.push(result);
    
    // Pause between iterations
    if (i < BENCHMARK_CONFIG.iterations) {
      console.log('⏸️ Pause 3s...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // === FINAL RESULTS ===
  const validResults = allResults.filter(r => r.success);
  
  if (validResults.length === 0) {
    console.log('\n❌ FAILURE: No successful benchmarks');
    return;
  }
  
  const avgAppStart = validResults.reduce((sum, r) => sum + r.appStartTime, 0) / validResults.length;
  const avgServerStart = validResults.reduce((sum, r) => sum + r.serverStartTime, 0) / validResults.length;
  const avgMemory = validResults.reduce((sum, r) => sum + r.memoryUsage, 0) / validResults.length;
  
  console.log('\n🎯 === FINAL RESULTS ===');
  console.log(`✅ Successful benchmarks: ${validResults.length}/${BENCHMARK_CONFIG.iterations}`);
  console.log(`⚡ App startup time: ${formatTime(avgAppStart)} (target: <5s)`);
  console.log(`🚀 Server startup time: ${formatTime(avgServerStart)} (target: <10s)`);
  console.log(`📊 Average memory: ${formatMemory(avgMemory)} (target: <200MB)`);
  
  // === CRITERIA VALIDATION ===
  console.log('\n📋 === CRITERIA VALIDATION ===');
  console.log(`${avgAppStart < 5000 ? '✅' : '❌'} App startup < 5s: ${avgAppStart < 5000 ? 'PASS' : 'FAIL'}`);
  console.log(`${avgServerStart < 10000 ? '✅' : '❌'} Server startup < 10s: ${avgServerStart < 10000 ? 'PASS' : 'FAIL'}`);
  console.log(`${avgMemory < 200 * 1024 * 1024 ? '✅' : '❌'} Memory < 200MB: ${avgMemory < 200 * 1024 * 1024 ? 'PASS' : 'FAIL'}`);
  
  // === RECOMMENDATIONS ===
  console.log('\n💡 === RECOMMENDATIONS ===');
  if (avgAppStart >= 5000) {
    console.log('🔧 Slow app startup: Optimize preload, reduce initial imports');
  }
  if (avgServerStart >= 10000) {
    console.log('🔧 Slow server startup: Optimize Next.js build, reduce dependencies');
  }
  if (avgMemory >= 200 * 1024 * 1024) {
    console.log('🔧 High memory usage: Optimize Electron, disable unnecessary features');
  }
  
  console.log('\n🎉 Benchmark completed!');
}

// === EXECUTION ===
if (require.main === module) {
  runFullBenchmark().catch(console.error);
}

module.exports = { runFullBenchmark, runSingleBenchmark }; 