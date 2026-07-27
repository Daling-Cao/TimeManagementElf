import React from 'react';

export interface TaskFilterState {
  status: 'all' | 'todo' | 'in_progress' | 'done';
  priority: 'all' | 'low' | 'medium' | 'high';
  type: string;
}

interface TaskFilterProps {
  filter: TaskFilterState;
  onFilterChange: (filter: TaskFilterState) => void;
}

const TaskFilter: React.FC<TaskFilterProps> = ({ filter, onFilterChange }) => {
  const handleFilterChange = (field: keyof TaskFilterState, value: string) => {
    onFilterChange({
      ...filter,
      [field]: value,
    } as TaskFilterState);
  };

  return (
    <div className="flex gap-4 items-center">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          状态
        </label>
        <select
          value={filter.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="text-sm border border-gray-300 rounded px-2 py-1"
        >
          <option value="all">全部</option>
          <option value="todo">待办</option>
          <option value="in_progress">进行中</option>
          <option value="done">已完成</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          优先级
        </label>
        <select
          value={filter.priority}
          onChange={(e) => handleFilterChange('priority', e.target.value)}
          className="text-sm border border-gray-300 rounded px-2 py-1"
        >
          <option value="all">全部</option>
          <option value="high">高</option>
          <option value="medium">中</option>
          <option value="low">低</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          类型
        </label>
        <input
          type="text"
          value={filter.type}
          onChange={(e) => handleFilterChange('type', e.target.value)}
          className="text-sm border border-gray-300 rounded px-2 py-1"
          placeholder="筛选类型"
        />
      </div>

      <button
        onClick={() => onFilterChange({
          status: 'all',
          priority: 'all',
          type: 'all',
        })}
        className="text-sm text-gray-600 hover:text-gray-800 underline"
      >
        清除筛选
      </button>
    </div>
  );
};

export default TaskFilter;
