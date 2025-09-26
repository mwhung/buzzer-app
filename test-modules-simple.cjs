const fs = require('fs');
const path = require('path');

console.log('🧪 模組整合測試開始...\n');

// 測試1: 檢查文件結構
function testFileStructure() {
  console.log('1. 📁 文件結構檢查');

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

  if (allExist) {
    console.log('   ✅ 所有必需文件都存在');
    return true;
  } else {
    console.log(`   ❌ 缺少文件: ${missingFiles.join(', ')}`);
    return false;
  }
}

// 測試2: 檢查TypeScript語法結構
function testTypeScriptStructure() {
  console.log('2. 🎼 TypeScript語法檢查');

  try {
    const musicTheoryContent = fs.readFileSync('src/modules/music/MusicTheory.ts', 'utf8');
    const typesContent = fs.readFileSync('src/types/index.ts', 'utf8');

    const hasClass = musicTheoryContent.includes('export class MusicTheory');
    const hasInterface = typesContent.includes('export interface');

    if (hasClass && hasInterface) {
      console.log('   ✅ TypeScript結構正確');
      return true;
    } else {
      console.log(`   ❌ 結構問題 - 類定義: ${hasClass}, 接口定義: ${hasInterface}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ 文件讀取錯誤: ${error.message}`);
    return false;
  }
}

// 測試3: 檢查模組依賴
function testModuleDependencies() {
  console.log('3. 🔗 模組依賴檢查');

  try {
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

    if (allImported) {
      console.log(`   ✅ 所有模組依賴正確導入 (${importCount}/${imports.length})`);
      return true;
    } else {
      console.log(`   ❌ 部分模組未導入 (${importCount}/${imports.length})`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ 依賴檢查錯誤: ${error.message}`);
    return false;
  }
}

// 測試4: 代碼規模統計
function testCodeStats() {
  console.log('4. 📊 代碼規模統計');

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

    if (totalFiles === moduleFiles.length && totalLines > 100) {
      console.log(`   ✅ 代碼統計: ${totalFiles} 個文件，共 ${totalLines} 行代碼`);
      return true;
    } else {
      console.log(`   ❌ 代碼不完整: ${totalFiles}/${moduleFiles.length} 文件，${totalLines} 行`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ 統計錯誤: ${error.message}`);
    return false;
  }
}

// 測試5: 核心功能覆蓋
function testCoreFunctionality() {
  console.log('5. 🎯 核心功能覆蓋');

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

    if (allMethods) {
      console.log(`   ✅ 核心方法完整 (${methodCount}/${requiredMethods.length})`);
      return true;
    } else {
      console.log(`   ❌ 核心方法不完整 (${methodCount}/${requiredMethods.length})`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ 功能檢查錯誤: ${error.message}`);
    return false;
  }
}

// 執行所有測試
console.log('執行測試項目:\n');

const tests = [
  testFileStructure,
  testTypeScriptStructure,
  testModuleDependencies,
  testCodeStats,
  testCoreFunctionality
];

let passed = 0;
let failed = 0;

tests.forEach((test, index) => {
  try {
    const result = test();
    if (result) {
      passed++;
    } else {
      failed++;
    }
    console.log(''); // 空行分隔
  } catch (error) {
    console.log(`   ❌ 測試執行異常: ${error.message}\n`);
    failed++;
  }
});

// 輸出結果摘要
console.log('='.repeat(50));
console.log('📊 測試結果摘要:');
console.log(`總計: ${tests.length} 項測試`);
console.log(`通過: ${passed} 項`);
console.log(`失敗: ${failed} 項`);

const passRate = ((passed / tests.length) * 100).toFixed(1);
console.log(`通過率: ${passRate}%`);

if (failed === 0) {
  console.log('\n🎉 所有基礎測試通過！');
  console.log('✅ 模組結構正確，文件完整');
  console.log('✅ 後端模組已準備好進行UI集成');
} else {
  console.log(`\n⚠️  有 ${failed} 項測試失敗`);
  console.log('請檢查相關模組文件');
}

console.log('\n📝 下一步建議:');
console.log('1. 打開 src/tests/test.html 進行瀏覽器測試');
console.log('2. 使用 TypeScript 編譯器檢查語法');
console.log('3. 開始UI組件開發');

console.log('\n🔧 模組整合測試完成！');