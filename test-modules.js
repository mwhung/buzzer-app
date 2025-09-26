// 簡單的模組測試腳本
// 由於我們沒有完整的構建工具鏈，這個腳本模擬測試模組的基本功能

const fs = require('fs');
const path = require('path');

console.log('🧪 模組整合測試開始...\n');

// 模擬測試結果
const tests = [
  {
    name: '📁 文件結構檢查',
    test: () => {
      const fs = require('fs');
      const path = require('path');

      const requiredFiles = [
        'src/types/index.ts',
        'src/modules/music/MusicTheory.ts',
        'src/modules/audio/AudioEngine.ts',
        'src/modules/profile/ProfileManager.ts',
        'src/modules/pattern/PatternManager.ts',
        'src/modules/export/ExportEngine.ts',
        'src/modules/workflow/WorkflowManager.ts',
        'src/modules/core/BuzzerAppCore.ts',
        'src/modules/index.ts'
      ];

      let allExist = true;
      let missingFiles = [];

      requiredFiles.forEach(file => {
        if (!fs.existsSync(path.join(__dirname, file))) {
          allExist = false;
          missingFiles.push(file);
        }
      });

      return {
        passed: allExist,
        message: allExist
          ? '所有必需文件都存在'
          : `缺少文件: ${missingFiles.join(', ')}`
      };
    }
  },

  {
    name: '🎼 TypeScript語法檢查',
    test: () => {
      // 簡單的語法檢查 - 檢查文件是否包含基本的TypeScript結構
      const fs = require('fs');

      try {
        const musicTheoryContent = fs.readFileSync('src/modules/music/MusicTheory.ts', 'utf8');
        const hasClass = musicTheoryContent.includes('export class MusicTheory');
        const hasInterface = fs.readFileSync('src/types/index.ts', 'utf8').includes('export interface');

        return {
          passed: hasClass && hasInterface,
          message: `類定義: ${hasClass}, 接口定義: ${hasInterface}`
        };
      } catch (error) {
        return {
          passed: false,
          message: `文件讀取錯誤: ${error.message}`
        };
      }
    }
  },

  {
    name: '🔗 模組依賴檢查',
    test: () => {
      const fs = require('fs');

      try {
        // 檢查核心模組是否正確導入其他模組
        const coreContent = fs.readFileSync('src/modules/core/BuzzerAppCore.ts', 'utf8');

        const imports = [
          'AudioEngine',
          'MusicTheory',
          'ProfileManager',
          'PatternManager',
          'ExportEngine',
          'WorkflowManager'
        ];

        let importCount = 0;
        imports.forEach(imp => {
          if (coreContent.includes(imp)) {
            importCount++;
          }
        });

        const allImported = importCount === imports.length;

        return {
          passed: allImported,
          message: `導入模組: ${importCount}/${imports.length}`
        };
      } catch (error) {
        return {
          passed: false,
          message: `依賴檢查錯誤: ${error.message}`
        };
      }
    }
  },

  {
    name: '📊 代碼規模統計',
    test: () => {
      const fs = require('fs');
      const path = require('path');

      try {
        let totalLines = 0;
        let totalFiles = 0;

        const moduleFiles = [
          'src/modules/music/MusicTheory.ts',
          'src/modules/audio/AudioEngine.ts',
          'src/modules/profile/ProfileManager.ts',
          'src/modules/pattern/PatternManager.ts',
          'src/modules/export/ExportEngine.ts',
          'src/modules/workflow/WorkflowManager.ts',
          'src/modules/core/BuzzerAppCore.ts'
        ];

        moduleFiles.forEach(file => {
          if (fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf8');
            const lines = content.split('\n').length;
            totalLines += lines;
            totalFiles++;
          }
        });

        return {
          passed: totalFiles === moduleFiles.length && totalLines > 100,
          message: `${totalFiles} 個文件，共 ${totalLines} 行代碼`
        };
      } catch (error) {
        return {
          passed: false,
          message: `統計錯誤: ${error.message}`
        };
      }
    }
  },

  {
    name: '🎯 核心功能覆蓋',
    test: () => {
      const fs = require('fs');

      try {
        const coreContent = fs.readFileSync('src/modules/core/BuzzerAppCore.ts', 'utf8');

        const requiredMethods = [
          'initialize',
          'playCurrentPattern',
          'exportCurrentPattern',
          'getAppState',
          'dispose'
        ];

        let methodCount = 0;
        requiredMethods.forEach(method => {
          if (coreContent.includes(method)) {
            methodCount++;
          }
        });

        const allMethods = methodCount === requiredMethods.length;

        return {
          passed: allMethods,
          message: `核心方法: ${methodCount}/${requiredMethods.length}`
        };
      } catch (error) {
        return {
          passed: false,
          message: `功能檢查錯誤: ${error.message}`
        };
      }
    }
  }
];

// 執行測試
let passed = 0;
let failed = 0;

console.log('執行測試項目:\n');

tests.forEach((testItem, index) => {
  try {
    const result = testItem.test();
    const status = result.passed ? '✅' : '❌';

    console.log(`${index + 1}. ${status} ${testItem.name}`);
    console.log(`   ${result.message}\n`);

    if (result.passed) {
      passed++;
    } else {
      failed++;
    }
  } catch (error) {
    console.log(`${index + 1}. ❌ ${testItem.name}`);
    console.log(`   測試執行錯誤: ${error.message}\n`);
    failed++;
  }
});

// 輸出結果
console.log('='.repeat(50));
console.log('📊 測試結果摘要:');
console.log(`總計: ${tests.length} 項測試`);
console.log(`通過: ${passed} 項`);
console.log(`失敗: ${failed} 項`);

const passRate = ((passed / tests.length) * 100).toFixed(1);
console.log(`通過率: ${passRate}%`);

if (failed === 0) {
  console.log('\n🎉 所有基礎測試通過！模組結構正確。');
  console.log('✨ 後端模組已準備好進行UI集成。');
} else {
  console.log(`\n⚠️  有 ${failed} 項測試失敗，建議檢查相關模組。`);
}

console.log('\n📝 下一步建議:');
console.log('1. 打開 src/tests/test.html 進行瀏覽器測試');
console.log('2. 檢查各模組的TypeScript編譯');
console.log('3. 開始UI組件開發');

console.log('\n模組整合測試完成！');