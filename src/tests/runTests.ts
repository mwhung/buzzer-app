// 測試執行器 - 執行模組整合測試

import { ModuleIntegrationTest } from './ModuleIntegrationTest';

/**
 * 執行所有整合測試
 */
async function runIntegrationTests() {
  console.log('🚀 啟動模組整合測試...\n');

  const testRunner = new ModuleIntegrationTest();

  try {
    const results = await testRunner.runAllTests();

    console.log('\n' + testRunner.getDetailedReport());

    if (results.failed === 0) {
      console.log('🎉 所有測試通過！後端模組協同工作正常。');
      return true;
    } else {
      console.log(`⚠️  有 ${results.failed} 項測試失敗，需要修復。`);
      return false;
    }

  } catch (error) {
    console.error('❌ 測試執行失敗:', error);
    return false;
  }
}

// 執行測試
runIntegrationTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('測試執行異常:', error);
    process.exit(1);
  });