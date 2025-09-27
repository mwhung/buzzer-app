// Import Modal 導入模式模態框組件

import React from 'react';
import { useBuzzerApp } from '../../../../../hooks/useBuzzerApp';
import { Button } from '../../../common/Button';
import { Modal } from '../../../common/Modal';

export interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

interface ImportState {
  loading: boolean;
  error?: string;
  success?: string;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess
}) => {
  const { appCore } = useBuzzerApp();
  const [importState, setImportState] = React.useState<ImportState>({ loading: false });
  const [importFile, setImportFile] = React.useState<File | null>(null);

  // 重置狀態當模態框關閉時
  React.useEffect(() => {
    if (!isOpen) {
      setImportState({ loading: false });
      setImportFile(null);
    }
  }, [isOpen]);

  // 處理文件選擇
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/json') {
      setImportFile(file);
      setImportState({ loading: false });
    } else {
      setImportState({ loading: false, error: '請選擇JSON文件' });
    }
  };

  // 導入patterns
  const handleImport = async () => {
    if (!importFile || !appCore) return;

    setImportState({ loading: true });

    try {
      const importedPatternId = await appCore.patternManager.importPatternFromFile(importFile);
      setImportState({
        loading: false,
        success: `成功導入模式`
      });
      setImportFile(null);

      setTimeout(() => {
        onClose();
        setImportState({ loading: false });
        onImportSuccess();
      }, 2000);

    } catch (error) {
      setImportState({
        loading: false,
        error: error instanceof Error ? error.message : '導入失敗'
      });
    }
  };

  const handleClose = () => {
    onClose();
    setImportFile(null);
    setImportState({ loading: false });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="導入模式"
      size="md"
      actions={
        <div className="flex space-x-3">
          <Button
            onClick={handleClose}
            variant="secondary"
          >
            取消
          </Button>
          <Button
            onClick={handleImport}
            disabled={!importFile || importState.loading}
            loading={importState.loading}
            variant="primary"
          >
            導入
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* 文件選擇 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            選擇模式文件 (JSON格式)
          </label>
          <input
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          />
        </div>

        {/* 選中的文件信息 */}
        {importFile && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm font-medium text-blue-900">{importFile.name}</span>
              <span className="text-sm text-blue-600">({(importFile.size / 1024).toFixed(1)}KB)</span>
            </div>
          </div>
        )}

        {/* 狀態消息 */}
        {importState.error && (
          <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
            <span className="text-sm text-red-800">{importState.error}</span>
          </div>
        )}

        {importState.success && (
          <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
            <span className="text-sm text-green-800">{importState.success}</span>
          </div>
        )}
      </div>
    </Modal>
  );
};