import React, { useState } from 'react';
import { Task } from '../core/types';

interface TaskItemProps {
  task: Task;
  onEdit: (task: Task) => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onEdit,
  onUpdate,
  onDelete,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'text-green-600 bg-green-50';
      case 'in_progress': return 'text-blue-600 bg-blue-50';
      case 'todo': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const handleStatusChange = (newStatus: string) => {
    onUpdate(task.task_id, { status: newStatus as any });
  };

  const handlePriorityChange = (newPriority: string) => {
    onUpdate(task.task_id, { priority: newPriority as any });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="task-item card mb-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              checked={task.status === 'done'}
              onChange={(e) => handleStatusChange(e.target.checked ? 'done' : 'todo')}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <h3 className={`font-medium ${task.status === 'done' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
              {task.title}
            </h3>
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
              {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}优先级
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
              {task.status === 'done' ? '已完成' : task.status === 'in_progress' ? '进行中' : '待办'}
            </span>
            <span className="text-xs text-gray-500">
              {task.task_type}
            </span>
          </div>

          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {task.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {task.estimate_minutes && (
            <div className="text-sm text-gray-500 mb-2">
              预估时间: {task.estimate_minutes} 分钟
            </div>
          )}

          <div className="text-xs text-gray-400">
            创建于: {formatDate(task.created_at)}
            {task.updated_at !== task.created_at && (
              <span> • 更新于: {formatDate(task.updated_at)}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <select
            value={task.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1"
          >
            <option value="todo">待办</option>
            <option value="in_progress">进行中</option>
            <option value="done">已完成</option>
          </select>

          <select
            value={task.priority}
            onChange={(e) => handlePriorityChange(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1"
          >
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>

          <button
            onClick={() => onEdit(task)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            编辑
          </button>
          <button
            onClick={() => onDelete(task.task_id)}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskItem;
