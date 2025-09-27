// Export Modal 批量導出模態框組件

import React from 'react';
import { Pattern } from '../../../../../types';
import { useBuzzerApp } from '../../../../../hooks/useBuzzerApp';
import { Button } from '../../../common/Button';
import { Modal } from '../../../common/Modal';

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPatterns: Set<string>;
  patterns: Pattern[];
  onExportSuccess: () => void;
}

interface ExportState {
  loading: boolean;
  error?: string;
  success?: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  selectedPatterns,
  patterns,
  onExportSuccess
}) => {
  const { appCore } = useBuzzerApp();
  const [exportState, setExportState] = React.useState<ExportState>({ loading: false });

  // 重置狀態當模態框關閉時
  React.useEffect(() => {
    if (!isOpen) {
      setExportState({ loading: false });
    }
  }, [isOpen]);

  // 批量導出
  const handleBatchExport = async () => {
    if (!appCore || selectedPatterns.size === 0) return;

    setExportState({ loading: true });

    try {
      const patternsToExport = patterns.filter(p => selectedPatterns.has(p.id));
      const exported = await appCore.exportEngine.exportPatterns(patternsToExport, 'json');

      if (exported) {
        setExportState({
          loading: false,
          success: `成功導出 ${patternsToExport.length} 個模式`
        });

        setTimeout(() => {
          onClose();
          setExportState({ loading: false });
          onExportSuccess();
        }, 2000);
      } else {
        throw new Error('導出失敗');
      }
    } catch (error) {
      setExportState({
        loading: false,
        error: error instanceof Error ? error.message : '導出失敗'
      });
    }
  };

  const handleClose = () => {
    onClose();
    setExportState({ loading: false });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="批量導出模式"
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
            onClick={handleBatchExport}
            disabled={selectedPatterns.size === 0 || exportState.loading}
            loading={exportState.loading}
            variant="primary"
          >
            導出
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-gray-600">
          即將導出 {selectedPatterns.size} 個選中的模式為 JSON 文件。
        </p>

        {/* 狀態消息 */}
        {exportState.error && (
          <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
            <span className="text-sm text-red-800">{exportState.error}</span>
          </div>
        )}

        {exportState.success && (
          <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
            <span className="text-sm text-green-800">{exportState.success}</span>
          </div>
        )}
      </div>
    </Modal>
  );
};