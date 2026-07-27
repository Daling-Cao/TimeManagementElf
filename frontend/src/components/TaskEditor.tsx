import React, { useState, useEffect } from 'react';
import type { Task } from '../core/types';

export interface TaskFormData {
  title: string;
  task_type: string;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  estimate_minutes: number;
  summary: string;
}

interface TaskEditorProps {
  task?: Task | null;
  onSave: (taskData: TaskFormData) => void;
  onCancel: () => void;
}

const TaskEditor: React.FC<TaskEditorProps> = ({ task, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    task_type: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    tags: [] as string[],
    estimate_minutes: 0,
    summary: '',
  });

  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        task_type: task.task_type,
        priority: task.priority,
        tags: task.tags || [],
        estimate_minutes: task.estimate_minutes || 0,
        summary: task.summary || '',
      });
    }
  }, [task]);

  const handleInputChange = (
    field: keyof TaskFormData,
    value: string | number | string[],
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('请输入任务标题');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="task-editor card">
      <h3 className="text-lg font-semibold mb-4">
        {task ? '编辑任务' : '新建任务'}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            任务标题 *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className="input-field"
            placeholder="输入任务标题"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            任务类型
          </label>
          <input
            type="text"
            value={formData.task_type}
            onChange={(e) => handleInputChange('task_type', e.target.value)}
            className="input-field"
            placeholder="例如：工作、学习、生活"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            优先级
          </label>
          <select
            value={formData.priority}
            onChange={(e) => handleInputChange('priority', e.target.value)}
            className="input-field"
          >
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            预估时间（分钟）
          </label>
          <input
            type="number"
            value={formData.estimate_minutes}
            onChange={(e) => handleInputChange('estimate_minutes', parseInt(e.target.value) || 0)}
            className="input-field"
            min="0"
            placeholder="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            标签
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              className="input-field flex-1"
              placeholder="输入标签"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="btn-secondary"
            >
              添加
            </button>
          </div>
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {formData.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            备注
          </label>
          <textarea
            value={formData.summary}
            onChange={(e) => handleInputChange('summary', e.target.value)}
            className="input-field"
            rows={3}
            placeholder="任务备注或描述"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
          >
            取消
          </button>
          <button
            type="submit"
            className="btn-primary"
          >
            {task ? '保存' : '创建'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TaskEditor;
