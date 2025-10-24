import React, { useState } from 'react';
import { Task } from '../core/types';
import TaskItem from './TaskItem';
import TaskEditor from './TaskEditor';
import TaskFilter from './TaskFilter';

interface TaskListProps {
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskCreate: (task: Omit<Task, 'task_id' | 'created_at' | 'updated_at' | 'version'>) => void;
}

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onTaskUpdate,
  onTaskDelete,
  onTaskCreate,
}) => {
  const [showEditor, setShowEditor] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState({
    status: 'all' as 'all' | 'todo' | 'in_progress' | 'done',
    priority: 'all' as 'all' | 'low' | 'medium' | 'high',
    type: 'all' as string,
  });

  const filteredTasks = tasks.filter(task => {
    if (filter.status !== 'all' && task.status !== filter.status) return false;
    if (filter.priority !== 'all' && task.priority !== filter.priority) return false;
    if (filter.type !== 'all' && task.task_type !== filter.type) return false;
    return true;
  });

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowEditor(true);
  };

  const handleCreateTask = () => {
    setEditingTask(null);
    setShowEditor(true);
  };

  const handleSaveTask = (taskData: any) => {
    if (editingTask) {
      onTaskUpdate(editingTask.task_id, taskData);
    } else {
      onTaskCreate(taskData);
    }
    setShowEditor(false);
    setEditingTask(null);
  };

  const handleCancelEdit = () => {
    setShowEditor(false);
    setEditingTask(null);
  };

  return (
    <div className="task-list-container">
      <div className="task-list-header">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">任务列表</h2>
        <div className="flex justify-between items-center mb-4">
          <TaskFilter filter={filter} onFilterChange={setFilter} />
          <button
            onClick={handleCreateTask}
            className="btn-primary"
          >
            + 新建任务
          </button>
        </div>
      </div>

      {showEditor && (
        <div className="mb-4">
          <TaskEditor
            task={editingTask}
            onSave={handleSaveTask}
            onCancel={handleCancelEdit}
          />
        </div>
      )}

      <div className="task-list">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {tasks.length === 0 ? '还没有任务，创建一个开始吧！' : '没有符合条件的任务'}
          </div>
        ) : (
          filteredTasks.map(task => (
            <TaskItem
              key={task.task_id}
              task={task}
              onEdit={handleEditTask}
              onUpdate={onTaskUpdate}
              onDelete={onTaskDelete}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default TaskList;
