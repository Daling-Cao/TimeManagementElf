import React, { useEffect, useState } from 'react';
import {
  computeTaskTimeStats,
  formatMinutes,
  isAiConfigured,
  summarizeTaskWithAi,
  type TaskAiSummary,
  type WorkNote,
} from '../core/ai';
import { readTasks, writeTasks } from '../core/dailyPlan';

interface Props {
  task: {
    id: string;
    title: string;
    type: string;
    status: string;
    summaries?: WorkNote[];
    aiSummary?: TaskAiSummary;
  };
}

function shortDate(date: string): string {
  const [, m, d] = date.split('-');
  return `${Number(m)}/${Number(d)}`;
}

/**
 * 任务详情里的“用时与工作总结”：按天的用时统计在本地计算，
 * 配置了 AI 时可以把所有工作笔记交给 AI 写成一份总结，并保存在任务上。
 */
const TaskSummaryPanel: React.FC<Props> = ({ task }) => {
  const notes = task.summaries ?? [];
  const stats = computeTaskTimeStats(notes);
  const [aiReady, setAiReady] = useState(false);
  const [summary, setSummary] = useState<TaskAiSummary | undefined>(task.aiSummary);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    isAiConfigured().then(setAiReady);
  }, []);

  const generate = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await summarizeTaskWithAi({
        title: task.title,
        type: task.type,
        status: task.status,
        notes,
      });
      // 保存到任务上，下次打开详情还能看到
      const tasks = readTasks();
      const index = tasks.findIndex((t) => t.id === task.id);
      if (index !== -1) {
        tasks[index] = { ...tasks[index], aiSummary: result };
        writeTasks(tasks);
      }
      setSummary(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const maxDayMinutes = Math.max(1, ...stats.days.map((d) => d.minutes));
  const outdated = summary && summary.notesCount < notes.length;

  const listBlock = (title: string, items: string[], color: string) =>
    items.length > 0 && (
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color }}>{title}</div>
        <ul style={{ margin: '4px 0 0', paddingLeft: 20, fontSize: 14, color: '#374151', lineHeight: 1.6 }}>
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>
    );

  return (
    <div style={{ marginBottom: 24 }}>
      <h4 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 12px' }}>用时与工作总结</h4>

      {stats.sessions === 0 ? (
        <div style={{ fontSize: 14, color: '#6b7280' }}>还没有番茄钟记录，完成几个番茄钟后这里会出现用时统计。</div>
      ) : (
        <>
          <div style={{ fontSize: 14, color: '#374151' }}>
            共 <strong>{formatMinutes(stats.totalMinutes)}</strong>，{stats.sessions} 个番茄钟
            {stats.interruptedSessions > 0 && `（中断 ${stats.interruptedSessions} 个）`}，跨 {stats.days.length} 天
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
            {stats.days.map((day) => (
              <div key={day.date} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <span style={{ width: 40, color: '#6b7280' }}>{shortDate(day.date)}</span>
                <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 4, height: 10 }}>
                  <div
                    style={{
                      width: `${(day.minutes / maxDayMinutes) * 100}%`,
                      minWidth: 4,
                      height: '100%',
                      borderRadius: 4,
                      background: '#0284c7',
                    }}
                  />
                </div>
                <span style={{ width: 110, color: '#374151', textAlign: 'right' }}>
                  {formatMinutes(day.minutes)} · {day.sessions} 个
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {window.aiAPI && notes.length > 0 && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 10,
            background: '#f5f3ff',
            border: '1px solid #ddd6fe',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <strong style={{ flex: 1, fontSize: 14, color: '#5b21b6' }}>🤖 AI 工作笔记总结</strong>
            {aiReady ? (
              <button
                onClick={generate}
                disabled={busy}
                style={{
                  padding: '4px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: busy ? '#c4b5fd' : '#7c3aed',
                  color: 'white',
                  cursor: busy ? 'wait' : 'pointer',
                  fontSize: 13,
                }}
              >
                {busy ? '总结中…' : summary ? '重新生成' : '生成总结'}
              </button>
            ) : (
              <span style={{ fontSize: 12, color: '#6b7280' }}>在每日规划的「AI 设置」里配置后可用</span>
            )}
          </div>

          {error && <div style={{ marginTop: 8, fontSize: 13, color: '#b91c1c' }}>{error}</div>}

          {summary ? (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 14, color: '#111827', lineHeight: 1.6 }}>{summary.overview}</div>
              {listBlock('✅ 成果', summary.achievements, '#047857')}
              {listBlock('⚠️ 问题与卡点', summary.problems, '#b45309')}
              {listBlock('👉 下一步', summary.nextSteps, '#1d4ed8')}
              <div style={{ marginTop: 8, fontSize: 12, color: '#9ca3af' }}>
                基于 {summary.notesCount} 条笔记，生成于{' '}
                {new Date(summary.generatedAt).toLocaleString('zh-CN', { hour12: false })}
                {outdated && <span style={{ color: '#b45309' }}>（之后又有新笔记，可以重新生成）</span>}
              </div>
            </div>
          ) : (
            aiReady &&
            !busy && (
              <div style={{ marginTop: 6, fontSize: 13, color: '#6b7280' }}>
                把这个任务的 {notes.length} 条工作笔记整理成进展、成果、问题和下一步。
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default TaskSummaryPanel;
