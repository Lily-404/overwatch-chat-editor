'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import TemplateManager from '@/components/TemplateManager';
import HeroManager from '@/components/HeroManager';
import HeroTalentManager from '@/components/HeroTalentManager';
import HeroResourceManager from '@/components/HeroResourceManager';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import { getTextureName, clearTextureDataCache } from '@/data/textureNames';
import { getTextureCategory, getAllCategoriesAsync, clearCategoryDataCache } from '@/data/textureCategories';
import { loadTexturesWithCache, clearTextureCache, getCacheInfo } from '@/utils/textureCache';

interface TextureInfo {
  name: string;
  category: string;
}

interface TextureData {
  textures: Record<string, TextureInfo>;
  categories: string[];
}

interface Texture {
  id: string;
  fileName: string;
  imagePath: string;
  txCode: string;
  name: string;
  category: string;
}

interface EditModalProps {
  texture: Texture | null;
  categories: string[];
  onSave: (textureId: string, name: string, category: string) => void;
  onClose: () => void;
}

const EditModal: React.FC<EditModalProps> = ({ texture, categories, onSave, onClose }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [useNewCategory, setUseNewCategory] = useState(false);
  const { toast, showWarning } = useToast();

  useEffect(() => {
    if (texture) {
      setName(texture.name);
      setCategory(texture.category);
      setUseNewCategory(false);
      setNewCategory('');
    }
  }, [texture]);

  const handleSave = () => {
    if (!texture) return;
    
    const finalCategory = useNewCategory ? newCategory : category;
    if (!name.trim() || !finalCategory.trim()) {
      showWarning('请填写名称和分类');
      return;
    }
    
    onSave(texture.id, name.trim(), finalCategory.trim());
    onClose();
  };

  if (!texture) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
        <h2 className="text-xl font-bold mb-4">编辑纹理信息</h2>
        
        <div className="mb-4 text-center">
          <div className="w-16 h-16 mx-auto mb-2 bg-gray-100 rounded flex items-center justify-center">
            <Image
              src={texture.imagePath}
              alt={texture.id}
              width={64}
              height={64}
              className="object-contain"
            />
          </div>
          <p className="text-sm text-gray-600">{texture.id}</p>
          <p className="text-xs text-gray-500">{texture.txCode}</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            纹理名称
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="输入纹理名称"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            分类
          </label>
          <div className="space-y-2">
            <div>
              <input
                type="radio"
                id="existing-category"
                name="category-type"
                checked={!useNewCategory}
                onChange={() => setUseNewCategory(false)}
                className="mr-2"
              />
              <label htmlFor="existing-category" className="text-sm">选择现有分类</label>
            </div>
            {!useNewCategory && (
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择分类</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}
            
            <div>
              <input
                type="radio"
                id="new-category"
                name="category-type"
                checked={useNewCategory}
                onChange={() => setUseNewCategory(true)}
                className="mr-2"
              />
              <label htmlFor="new-category" className="text-sm">创建新分类</label>
            </div>
            {useNewCategory && (
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="输入新分类名称"
              />
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            保存
          </button>
        </div>
        
        {/* Toast 组件 */}
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={() => {}}
        />
      </div>
    </div>
  );
};

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'textures' | 'templates' | 'heroes' | 'talents' | 'resources'>('textures');
  const [textures, setTextures] = useState<Texture[]>([]);
  const [textureData, setTextureData] = useState<TextureData>({ textures: {}, categories: [] });
  const [loading, setLoading] = useState(true);
  const [editingTexture, setEditingTexture] = useState<Texture | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const [isDev, setIsDev] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<any>(null);
  const { toast, showSuccess, showError } = useToast();

  // 更新缓存信息
  const updateCacheInfo = () => {
    const info = getCacheInfo();
    setCacheInfo(info);
  };

  // 手动清除缓存
  const handleClearCache = async () => {
    clearTextureCache();
    clearTextureDataCache();
    clearCategoryDataCache();
    updateCacheInfo();
    showSuccess('缓存已清除');
    // 重新加载数据
    await loadData(true);
  };
  


  const TEXTURES_PER_PAGE = 60; // 能被5、8、10、12整除，确保在所有屏幕尺寸下都能填满整页

  useEffect(() => {
    // 检查是否为开发环境
    setIsDev(process.env.NODE_ENV === 'development');
    
    if (process.env.NODE_ENV === 'development') {
      loadData();
      updateCacheInfo();
    }
  }, []);

  const loadData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      
      if (forceRefresh) {
        // 强制刷新时清除所有缓存
        clearTextureCache();
        clearTextureDataCache();
        clearCategoryDataCache();
      }
      
      // 使用缓存工具加载纹理数据
      const mergedTextures = await loadTexturesWithCache();
      setTextures(mergedTextures);
      
      // 单独加载纹理数据用于管理
      const dataResponse = await fetch('/api/texture-data');
      const data = await dataResponse.json();
      setTextureData(data);
      
      // 更新缓存信息
      updateCacheInfo();
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTexture = async (textureId: string, name: string, category: string) => {
    try {
      const response = await fetch('/api/texture-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ textureId, name, category }),
      });
      
      if (response.ok) {
        // 清除所有缓存以确保数据同步
        clearTextureCache();
        clearTextureDataCache();
        clearCategoryDataCache();
        
        // 强制重新加载数据
        await loadData(true);
        showSuccess('保存成功！');
      } else {
        showError('保存失败！');
      }
    } catch (error) {
      console.error('Error saving texture:', error);
      showError('保存失败！');
    }
  };



  // 筛选纹理
  const filteredTextures = textures.filter(texture => {
    const matchesSearch = !searchTerm || 
      texture.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      texture.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      texture.txCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === '全部' || texture.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // 分页
  const totalPages = Math.ceil(filteredTextures.length / TEXTURES_PER_PAGE);
  const startIndex = (currentPage - 1) * TEXTURES_PER_PAGE;
  const currentTextures = filteredTextures.slice(startIndex, startIndex + TEXTURES_PER_PAGE);

  if (!isDev) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">访问受限</h1>
          <p className="text-gray-600">此页面仅在开发环境下可用</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">管理后台 (开发模式)</h1>
        
        {/* 选项卡 */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('textures')}
              className={`px-6 py-3 text-sm font-medium transition-all duration-200 border-b-2 ${
                activeTab === 'textures'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              纹理管理
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-6 py-3 text-sm font-medium transition-all duration-200 border-b-2 ${
                activeTab === 'templates'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              模板管理
            </button>
            <button
              onClick={() => setActiveTab('heroes')}
              className={`px-6 py-3 text-sm font-medium transition-all duration-200 border-b-2 ${
                activeTab === 'heroes'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              英雄管理
            </button>
            <button
              onClick={() => setActiveTab('talents')}
              className={`px-6 py-3 text-sm font-medium transition-all duration-200 border-b-2 ${
                activeTab === 'talents'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              天赋管理
            </button>
            <button
              onClick={() => setActiveTab('resources')}
              className={`px-6 py-3 text-sm font-medium transition-all duration-200 border-b-2 ${
                activeTab === 'resources'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              资源管理
            </button>
          </div>
        </div>
        
        {/* 纹理管理 */}
        {activeTab === 'textures' && (
          <>
            {/* 搜索和筛选 */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-4 mb-4">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="全部">全部分类</option>
              {textureData.categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            
            <input
              type="text"
              placeholder="搜索纹理名称、ID或TXC代码..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <button
              onClick={handleClearCache}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
            >
              清除缓存
            </button>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              共 {filteredTextures.length} 个纹理，第 {currentPage} / {totalPages} 页
            </div>
            
            {/* 缓存状态显示 */}
            {cacheInfo && (
              <div className="text-sm text-gray-500">
                缓存状态: 
                <span className={`ml-1 px-2 py-1 rounded text-xs ${
                  cacheInfo.hasMemoryCache || cacheInfo.hasLocalStorageCache 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {cacheInfo.hasMemoryCache ? '内存缓存' : 
                   cacheInfo.hasLocalStorageCache ? '本地缓存' : '无缓存'}
                </span>
                {cacheInfo.lastUpdated && (
                  <span className="ml-2 text-xs text-gray-400">
                    更新于: {new Date(cacheInfo.lastUpdated).toLocaleTimeString()}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

            {/* 纹理网格 */}
            <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-5 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-4">
            {currentTextures.map((texture) => (
              <div
                key={texture.id}
                className="border border-gray-200 rounded-lg p-2 hover:border-blue-300 cursor-pointer transition-colors"
                onClick={() => setEditingTexture(texture)}
              >
                <div className="w-16 h-16 mx-auto mb-2 bg-gray-100 rounded flex items-center justify-center">
                  <Image
                    src={texture.imagePath}
                    alt={texture.name}
                    width={64}
                    height={64}
                    className="object-contain"
                  />
                </div>
                <div className="text-xs text-center">
                  <div className="font-medium text-gray-800 truncate" title={texture.name}>
                    {texture.name}
                  </div>
                  <div className="text-gray-500 truncate" title={texture.category}>
                    {texture.category}
                  </div>
                  <div className="text-gray-400 truncate" title={texture.id}>
                    {texture.id.slice(-4)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* 分页控件 */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-6 space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
              >
                上一页
              </button>
              
              <div className="flex space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 rounded ${
                        currentPage === pageNum
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
              >
                下一页
              </button>
            </div>
          )}
            </div>
          </>
        )}

        {/* 模板管理 */}
        {activeTab === 'templates' && (
          <TemplateManager />
        )}

        {/* 英雄管理 */}
        {activeTab === 'heroes' && (
          <HeroManager />
        )}

        {/* 英雄天赋管理 */}
        {activeTab === 'talents' && (
          <HeroTalentManager />
        )}

        {/* 英雄资源管理 */}
        {activeTab === 'resources' && (
          <HeroResourceManager />
        )}
      </div>

      {/* 编辑模态框 */}
      <EditModal
        texture={editingTexture}
        categories={textureData.categories}
        onSave={handleSaveTexture}
        onClose={() => setEditingTexture(null)}
      />
      
      {/* Toast 组件 */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => {}}
      />
    </div>
  );
};

export default AdminPage;