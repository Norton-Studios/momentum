import { E2EEnvironment } from './environment.ts';

async function runBootstrap() {
  const environment = await E2EEnvironment.getInstance();
  
  try {
    const state = await environment.start({ keepAlive: true });
    
    console.log('\n🎯 Environment Details:');
    console.log(`🔑 System Admin Token: ${state.systemAdminToken}`);
    console.log('\nPress Ctrl+C to stop...');
    
    // Keep process alive
    return new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Bootstrap failed:', error);
    await environment.stop();
    process.exit(1);
  }
}

runBootstrap().catch(console.error);