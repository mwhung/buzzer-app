// Profile管理界面組件

import { useState, useEffect } from 'react';
import { Buzzer } from '../../../types';
import { useBuzzerApp } from '../../../hooks/useBuzzerApp';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';

export interface ProfileManagerUIProps {
  className?: string;
}

export const ProfileManagerUI: React.FC<ProfileManagerUIProps> = ({
  className = ''
}) => {
  const { appCore } = useBuzzerApp();
  const [profiles, setProfiles] = useState<Array<{ id: string; profile: Buzzer }>>([]);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<{
    loading: boolean;
    error?: string;
    success?: string;
  }>({ loading: false });

  // 載入profiles
  useEffect(() => {
    if (!appCore) return;

    const loadProfiles = () => {
      const allProfiles = appCore.profileManager.getAllProfiles();
      const current = appCore.profileManager.getCurrentProfileId();

      setProfiles(allProfiles);
      setCurrentProfileId(current);
    };

    loadProfiles();

    // 監聽profile變更事件
    const handleProfileEvent = () => {
      loadProfiles();
    };

    appCore.profileManager.addEventListener('create', handleProfileEvent);
    appCore.profileManager.addEventListener('select', handleProfileEvent);
    appCore.profileManager.addEventListener('import', handleProfileEvent);

    return () => {
      appCore.profileManager.removeEventListener('create', handleProfileEvent);
      appCore.profileManager.removeEventListener('select', handleProfileEvent);
      appCore.profileManager.removeEventListener('import', handleProfileEvent);
    };
  }, [appCore]);

  // 選擇profile
  const handleSelectProfile = (profileId: string) => {
    if (!appCore) return;

    const success = appCore.profileManager.setCurrentProfile(profileId);
    if (!success) {
      alert('選擇Profile失敗');
    }
  };

  // 處理文件選擇
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/json') {
      setImportFile(file);
      setImportStatus({ loading: false });
    } else {
      setImportStatus({ loading: false, error: '請選擇JSON文件' });
    }
  };

  // 導入profile
  const handleImport = async () => {
    if (!importFile || !appCore) return;

    setImportStatus({ loading: true });

    try {
      const profileId = await appCore.profileManager.importProfileFromFile(importFile);
      setImportStatus({
        loading: false,
        success: `成功導入Profile: ${profileId}`
      });
      setImportFile(null);

      // 延遲關閉模態框
      setTimeout(() => {
        setIsImportModalOpen(false);
        setImportStatus({ loading: false });
      }, 1500);

    } catch (error) {
      setImportStatus({
        loading: false,
        error: error instanceof Error ? error.message : '導入失敗'
      });
    }
  };

  // 獲取profile統計信息
  const getProfileStats = (profileId: string) => {
    if (!appCore) return null;
    return appCore.profileManager.getProfileStats(profileId);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 標題區域 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Buzzer Profile 管理</h2>
          <p className="text-gray-600 mt-1">選擇或導入Buzzer音頻特性檔案</p>
        </div>
        <Button
          onClick={() => setIsImportModalOpen(true)}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          }
        >
          導入Profile
        </Button>
      </div>

      {/* Profile列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {profiles.map(({ id, profile }) => {
          const isSelected = id === currentProfileId;
          const stats = getProfileStats(id);

          return (
            <Card
              key={id}
              variant={isSelected ? 'highlighted' : 'default'}
              className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
              }`}
              onClick={() => handleSelectProfile(id)}
            >
              <div className="space-y-4">
                {/* Profile名稱和狀態 */}
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {profile.buzzer_name}
                  </h3>
                  {isSelected && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                      使用中
                    </span>
                  )}
                </div>

                {/* Profile統計 */}
                {stats && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="font-medium text-gray-900">{stats.totalPoints}</div>
                      <div className="text-gray-500">頻率點數</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="font-medium text-gray-900">
                        {stats.avgSPL.toFixed(1)}dB
                      </div>
                      <div className="text-gray-500">平均音量</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg col-span-2">
                      <div className="font-medium text-gray-900">
                        {stats.frequencyRange[0]}Hz - {stats.frequencyRange[1]}Hz
                      </div>
                      <div className="text-gray-500">頻率範圍</div>
                    </div>
                  </div>
                )}

                {/* 選擇按鈕 */}
                <Button
                  onClick={() => handleSelectProfile(id)}
                  variant={isSelected ? 'success' : 'primary'}
                  size="sm"
                  className="w-full"
                  disabled={isSelected}
                >
                  {isSelected ? '已選擇' : '選擇此Profile'}
                </Button>
              </div>
            </Card>
          );
        })}

        {/* 空狀態 */}
        {profiles.length === 0 && (
          <Card className="col-span-full">
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">尚無Profile</h3>
              <p className="text-gray-500">點擊「導入Profile」開始使用</p>
            </div>
          </Card>
        )}
      </div>

      {/* 導入Profile模態框 */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportFile(null);
          setImportStatus({ loading: false });
        }}
        title="導入Buzzer Profile"
        size="md"
        actions={
          <div className="flex space-x-3">
            <Button
              onClick={() => {
                setIsImportModalOpen(false);
                setImportFile(null);
                setImportStatus({ loading: false });
              }}
              variant="secondary"
            >
              取消
            </Button>
            <Button
              onClick={handleImport}
              disabled={!importFile || importStatus.loading}
              loading={importStatus.loading}
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
              選擇Profile文件 (JSON格式)
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
          {importStatus.error && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-red-800">{importStatus.error}</span>
              </div>
            </div>
          )}

          {importStatus.success && (
            <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-green-800">{importStatus.success}</span>
              </div>
            </div>
          )}

          {/* 說明文字 */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Profile文件格式說明：</h4>
            <pre className="text-xs text-gray-600 bg-white p-3 rounded border overflow-x-auto">
{`{
  "buzzer_name": "My Buzzer",
  "frequencies": [440, 880, 1320, ...],
  "spl_values": [60, 55, 50, ...]
}`}
            </pre>
            <p className="text-xs text-gray-500 mt-2">
              frequencies和spl_values數組長度必須相同
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};