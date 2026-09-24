import { GeminiProvider } from './gemini.provider';
import { FallbackParser } from './fallback-parser';
import { AGENT_TOOLS } from './tools';
import { ChatMessage, ToolCall, ToolResult } from './types';
import { TaskService } from '../services/task.service';
import { ProjectService } from '../services/project.service';
import { CalendarService } from '../services/calendar.service';
import { AuditService } from '../services/audit.service';
import { MemoryService } from '../services/memory.service';
import { PriorityService } from '../services/priority.service';
import { AnalyticsService } from '../services/analytics.service';
import { NaturalSearchService } from '../services/natural-search.service';
import { GoalService } from '../services/goal.service';

const geminiProvider = new GeminiProvider();

export class AgentExecutor {
  private static readonly MAX_STEPS = 5;

  static async processMessage(
    userMessage: string,
    history: ChatMessage[],
    confirmedToolCall?: ToolCall
  ): Promise<ChatMessage> {
    const apiKey = localStorage.getItem('gemini_api_key');
    const memories = await MemoryService.getAll();
    const memoryContext = memories.map(m => `${m.key}: ${m.value}`).join(', ');

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const currentDayName = dayNames[today.getDay()];

    const systemInstruction = `
Bạn là Personal Productivity Agent — trợ lý năng suất cá nhân thông minh trên máy tính cá nhân.
Thời gian hiện tại: Hôm nay là ${currentDayName}, ngày ${todayStr} (YYYY-MM-DD).

Nhiệm vụ cốt lõi:
1. Quản lý công việc (Todo), theo dõi dự án (Project), xem và sắp xếp lịch làm việc (Calendar).
2. Tự động tìm khoảng thời gian trống (free time) và đề xuất hoặc xếp lịch hợp lý.
3. Tham khảo thói quen cá nhân của người dùng đã lưu trong Memory: [${memoryContext}].
4. Trả lời súc tích, thân thiện bằng tiếng Việt, dùng icon và định dạng markdown rõ ràng.
5. Khi người dùng yêu cầu, hãy gọi tool phù hợp:
   - Gợi ý ưu tiên hôm nay: suggest_daily_priorities (kèm giải thích lý do vì sao làm trước).
   - Tóm tắt tiến độ, kiểm tra việc trễ: summarize_work.
   - Tìm kiếm bằng ngôn ngữ tự nhiên: natural_search_tasks (như "mấy việc liên quan đến khách hàng tháng trước").
   - Phân rã mục tiêu lớn theo tuần: breakdown_goal.
   - Việc khẩn cấp, việc gấp 3 ngày tới: get_urgent_tasks.
   - Dời việc tồn, dời việc chưa xong sang ngày mai: reschedule_overdue_tasks.
   - Tra cứu chung: get_tasks, get_calendar_range, find_free_time, get_projects.
   - Thao tác: create_task, update_task, schedule_task, complete_task, delete_task, create_project, delete_project.
6. QUY TẮC CHỐNG TRÙNG LẶP: Không gọi lại create_task cho các việc đã có sẵn trong lịch sử trò chuyện.
7. GIẢI THÍCH RÕ RÀNG: Luôn kèm lý do logic ngắn gọn khi gợi ý thứ tự làm việc (dựa vào Deadline, Priority HIGH, hoặc thời lượng 15-30 phút).
`.trim();

    // 1. If there is a confirmed tool call (e.g. from confirmation dialog)
    if (confirmedToolCall) {
      const res = await this.executeSingleTool(confirmedToolCall);
      return {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        role: 'assistant',
        content: res.result?.summary || `Đã thực hiện thao tác: ${confirmedToolCall.name}`,
        timestamp: new Date().toISOString(),
        toolCalls: [confirmedToolCall],
        toolResults: [res],
        actionId: res.actionId,
      };
    }

    const executedToolCalls: ToolCall[] = [];
    const allToolResults: ToolResult[] = [];
    let assistantMessageText = '';
    let pendingConfirmation: ChatMessage['pendingConfirmation'] = undefined;
    let lastActionId: string | undefined = undefined;

    // 2. Check if Gemini API key exists
    if (apiKey) {
      try {
        // Build initial conversation contents
        const contents: any[] = [];
        for (const m of history.slice(-5)) {
          if (m.role === 'user' && m.content) {
            contents.push({ role: 'user', parts: [{ text: m.content }] });
          } else if (m.role === 'assistant' && m.content) {
            contents.push({ role: 'model', parts: [{ text: m.content }] });
          }
        }
        contents.push({
          role: 'user',
          parts: [{ text: userMessage }],
        });

        // Multi-turn Agent Loop (ReAct)
        for (let step = 0; step < this.MAX_STEPS; step++) {
          const response = await geminiProvider.generate({
            contents,
            systemInstruction,
            tools: AGENT_TOOLS,
            apiKey,
          });

          const toolCalls = response.toolCalls;

          // If no tool calls, model finished its reasoning and generated final response
          if (!toolCalls || toolCalls.length === 0) {
            if (response.content) {
              assistantMessageText = response.content;
            }
            break;
          }

          // Check dangerous actions requiring confirmation
          let requiresConfirmation = false;
          for (const call of toolCalls) {
            if (call.name === 'delete_task') {
              const task = await TaskService.getById(call.args.id);
              const taskTitle = task ? task.title : call.args.id;
              const targetId = task ? task.id : call.args.id;
              pendingConfirmation = {
                actionType: 'DELETE_TASK',
                entityId: targetId,
                title: taskTitle,
                toolCall: {
                  ...call,
                  args: {
                    ...call.args,
                    id: targetId,
                  },
                },
              };
              assistantMessageText = `⚠️ **Yêu cầu xác nhận**: Bạn có chắc chắn muốn xóa công việc **"${taskTitle}"** không?`;
              requiresConfirmation = true;
              break;
            }
            if (call.name === 'delete_project') {
              const project = await ProjectService.getById(call.args.id);
              const projectName = project ? project.name : call.args.id;
              const targetId = project ? project.id : call.args.id;
              pendingConfirmation = {
                actionType: 'DELETE_PROJECT',
                entityId: targetId,
                title: projectName,
                toolCall: {
                  ...call,
                  args: {
                    ...call.args,
                    id: targetId,
                  },
                },
              };
              assistantMessageText = `⚠️ **Yêu cầu xác nhận**: Bạn có chắc chắn muốn xóa dự án / mục tiêu **"${projectName}"** không? (Các công việc bên trong sẽ được giữ lại an toàn)`;
              requiresConfirmation = true;
              break;
            }
          }

          if (requiresConfirmation) {
            break; // Pause loop, wait for user confirmation
          }

          // Append model turn with functionCall parts
          const modelParts: any[] = [];
          if (response.rawParts && response.rawParts.length > 0) {
            modelParts.push(...response.rawParts);
          } else {
            if (response.content) modelParts.push({ text: response.content });
            for (const call of toolCalls) {
              modelParts.push({ functionCall: { name: call.name, args: call.args } });
            }
          }
          contents.push({
            role: 'model',
            parts: modelParts,
          });

          // Execute each tool in this step
          const stepToolResults: ToolResult[] = [];
          for (const call of toolCalls) {
            executedToolCalls.push(call);
            const res = await this.executeSingleTool(call);
            stepToolResults.push(res);
            allToolResults.push(res);
            if (res.actionId) lastActionId = res.actionId;
          }

          // FAST-PATH: If step 0 only called mutation actions (create_task, complete_task, schedule_task, etc.)
          // and no query tools were requested, the action is complete. Return immediately for near-instant response!
          const hasQueryTool = toolCalls.some((c) => {
            const toolDef = AGENT_TOOLS.find((t) => t.name === c.name);
            return toolDef?.category === 'query';
          });
          if (step === 0 && !hasQueryTool) {
            assistantMessageText = stepToolResults
              .map((r) => r.result?.summary)
              .filter(Boolean)
              .join('\n\n');
            break;
          }

          // Format function responses back to Gemini (Gemini API requires role: 'user' for function responses)
          const functionResponseParts = stepToolResults.map((tr) => ({
            functionResponse: {
              name: tr.name,
              response: typeof tr.result === 'object' && tr.result !== null ? tr.result : { output: tr.result },
            },
          }));

          contents.push({
            role: 'user',
            parts: functionResponseParts,
          });

          // If response had partial content, keep as fallback
          if (response.content) {
            assistantMessageText = response.content;
          }
        }
      } catch (err: any) {
        console.warn('Gemini API call failed, falling back to local parser:', err);
        if (allToolResults.length > 0) {
          // If tools were already executed, show their summary instead of raw error
          const executedSummary = allToolResults.map((r) => r.result?.summary).filter(Boolean).join('\n\n');
          assistantMessageText = `${executedSummary}\n\n*(Lưu ý: Phản hồi tiếp theo từ Gemini gặp gián đoạn: ${err.message || 'Lỗi kết nối'})*`;
        } else {
          const fallback = await FallbackParser.parseIntent(userMessage);
          if (fallback && fallback.toolCalls.length > 0) {
            for (const call of fallback.toolCalls) {
              executedToolCalls.push(call);
              const res = await this.executeSingleTool(call);
              allToolResults.push(res);
              if (res.actionId) lastActionId = res.actionId;
              if (res.result?.summary) assistantMessageText = res.result.summary;
            }
          } else {
            assistantMessageText = `⚠️ Không thể kết nối với Gemini (${err.message || 'Lỗi mạng'}). Đang dùng chế độ offline.`;
          }
        }
      }
    } else {
      // Offline fallback when no API key
      const fallback = await FallbackParser.parseIntent(userMessage);
      if (fallback && fallback.toolCalls.length > 0) {
        for (const call of fallback.toolCalls) {
          executedToolCalls.push(call);
          const res = await this.executeSingleTool(call);
          allToolResults.push(res);
          if (res.actionId) lastActionId = res.actionId;
          if (res.result?.summary) assistantMessageText = res.result.summary;
        }
      } else {
        assistantMessageText = `Chào bạn! Tôi đang chạy ở chế độ offline (chưa cấu hình Gemini API Key). Bạn có thể thử các lệnh nhanh như:\n- "Mai tôi có gì phải làm?"\n- "Tối mai tôi rảnh lúc nào?"\n- "Xếp [tên việc] vào lúc 19:00"\n- "Tạo việc [tên việc]"\n- Hoặc vào Cài đặt để nhập Gemini API Key cho AI thông minh hơn!`;
      }
    }

    // If assistant text is still empty, synthesize from tool summaries
    if (!assistantMessageText) {
      if (allToolResults.length > 0) {
        assistantMessageText = allToolResults.map((r) => r.result?.summary).filter(Boolean).join('\n\n');
      } else {
        assistantMessageText = 'Đã hoàn thành các yêu cầu của bạn.';
      }
    }

    return {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      role: 'assistant',
      content: assistantMessageText,
      timestamp: new Date().toISOString(),
      toolCalls: executedToolCalls.length > 0 ? executedToolCalls : undefined,
      toolResults: allToolResults.length > 0 ? allToolResults : undefined,
      pendingConfirmation,
      actionId: lastActionId,
    };
  }

  private static async executeSingleTool(call: ToolCall): Promise<ToolResult> {
    const { name, args } = call;

    switch (name) {
      case 'get_tasks': {
        const tasks = await TaskService.getAll(args);
        let summary = `📋 Tìm thấy **${tasks.length}** công việc:\n`;
        if (tasks.length === 0) {
          summary = `✨ Không có công việc nào theo điều kiện tìm kiếm.`;
        } else {
          summary += tasks.slice(0, 5).map(t => `- [${t.status === 'DONE' ? 'x' : ' '}] **${t.title}** (${t.priority}) ${t.startTime ? `[${t.startTime}]` : ''}`).join('\n');
          if (tasks.length > 5) summary += `\n... và ${tasks.length - 5} việc khác.`;
        }
        return { name, result: { tasks, summary } };
      }

      case 'create_task': {
        // Deduplication Guard: If exact same task title and startTime already exists on that date, do not duplicate
        if (args.title) {
          const targetDate = args.startDate || new Date().toISOString().split('T')[0];
          const existing = await TaskService.getAll({
            startDate: targetDate,
            endDate: targetDate,
          });
          const cleanTitle = args.title.trim().toLowerCase();
          const duplicate = existing.find(
            (t) =>
              t.title.trim().toLowerCase() === cleanTitle &&
              (!args.startTime || t.startTime === args.startTime)
          );
          if (duplicate) {
            return {
              name,
              result: {
                task: duplicate,
                summary: `ℹ️ Công việc **"${duplicate.title}"** ${duplicate.startTime ? `(lúc ${duplicate.startTime})` : ''} đã có sẵn trong lịch trình, không tạo trùng lặp.`,
              },
            };
          }
        }

        const newTask = await TaskService.create(args);
        const action = await AuditService.log({
          actionType: 'CREATE_TASK',
          targetEntity: 'TASK',
          entityId: newTask.id,
          newState: JSON.stringify(newTask),
          description: `Tạo công việc "${newTask.title}"`,
          source: 'AGENT',
        });
        return {
          name,
          result: {
            task: newTask,
            summary: `✅ Đã tạo thành công công việc: **${newTask.title}** ${newTask.startDate ? `(Ngày: ${newTask.startDate}${newTask.startTime ? ` lúc ${newTask.startTime}` : ''})` : ''}`,
          },
          actionId: action.id,
        };
      }

      case 'update_task': {
        const task = await TaskService.getById(args.id);
        if (!task) {
          return {
            name,
            result: { error: 'Không tìm thấy công việc', summary: `❌ Không tìm thấy công việc ID: ${args.id}` },
          };
        }
        const prevJson = JSON.stringify(task);
        const updated = await TaskService.update(args.id, args);
        const action = await AuditService.log({
          actionType: 'UPDATE_TASK',
          targetEntity: 'TASK',
          entityId: task.id,
          previousState: prevJson,
          newState: JSON.stringify(updated),
          description: `Cập nhật công việc "${task.title}"`,
          source: 'AGENT',
        });

        return {
          name,
          result: {
            task: updated,
            summary: `✏️ Đã cập nhật công việc: **${updated.title}** ${updated.startDate ? `(Ngày: ${updated.startDate}${updated.startTime ? ` lúc ${updated.startTime}` : ''})` : ''}`,
          },
          actionId: action.id,
        };
      }

      case 'schedule_task': {
        const task = await TaskService.getById(args.id);
        if (!task) {
          return { name, result: { error: 'Không tìm thấy công việc', summary: `❌ Không tìm thấy công việc ID: ${args.id}` } };
        }
        const prevJson = JSON.stringify(task);
        const updated = await TaskService.schedule(args.id, args.date, args.startTime, args.endTime);
        const action = await AuditService.log({
          actionType: 'SCHEDULE_TASK',
          targetEntity: 'TASK',
          entityId: task.id,
          previousState: prevJson,
          newState: JSON.stringify(updated),
          description: `Xếp lịch "${task.title}" vào ${args.date} lúc ${args.startTime}`,
          source: 'AGENT',
        });

        return {
          name,
          result: {
            task: updated,
            summary: `📅 Đã xếp **"${updated.title}"** vào lịch ngày **${args.date}** lúc **${args.startTime}** - **${updated.endTime}**.`,
          },
          actionId: action.id,
        };
      }

      case 'complete_task': {
        const task = await TaskService.getById(args.id);
        if (!task) return { name, result: { error: 'Task not found' } };
        const prevJson = JSON.stringify(task);
        const updated = await TaskService.complete(args.id, args.isDone !== false);
        const action = await AuditService.log({
          actionType: 'COMPLETE_TASK',
          targetEntity: 'TASK',
          entityId: task.id,
          previousState: prevJson,
          newState: JSON.stringify(updated),
          description: `Đánh dấu hoàn thành "${task.title}"`,
          source: 'AGENT',
        });

        return {
          name,
          result: {
            task: updated,
            summary: `🎉 Đã hoàn thành công việc: **${updated.title}**! Làm tốt lắm.`,
          },
          actionId: action.id,
        };
      }

      case 'delete_task': {
        const task = await TaskService.getById(args.id);
        const targetId = task ? task.id : args.id;
        const prevJson = task ? JSON.stringify(task) : undefined;
        await TaskService.delete(targetId);
        const action = await AuditService.log({
          actionType: 'DELETE_TASK',
          targetEntity: 'TASK',
          entityId: targetId,
          previousState: prevJson,
          description: `Xóa công việc "${task?.title || targetId}"`,
          source: 'AGENT',
        });
        return {
          name,
          result: {
            summary: `🗑️ Đã xóa công việc **"${task?.title || targetId}"**.`,
          },
          actionId: action.id,
        };
      }

      case 'delete_project': {
        const project = await ProjectService.getById(args.id);
        const targetId = project ? project.id : args.id;
        const prevJson = project ? JSON.stringify(project) : undefined;
        await ProjectService.delete(targetId);
        const action = await AuditService.log({
          actionType: 'DELETE_PROJECT',
          targetEntity: 'PROJECT',
          entityId: targetId,
          previousState: prevJson,
          description: `Xóa dự án / mục tiêu "${project?.name || targetId}"`,
          source: 'AGENT',
        });
        return {
          name,
          result: {
            summary: `🗑️ Đã xóa dự án / mục tiêu **"${project?.name || targetId}"**. Các công việc thuộc dự án này đã được chuyển về tự do.`,
          },
          actionId: action.id,
        };
      }

      case 'get_calendar_range': {
        const tasks = await CalendarService.getEventsForRange(args.startDate, args.endDate);
        const scheduled = tasks.filter(t => t.startTime);
        let summary = `📅 **Lịch từ ${args.startDate} đến ${args.endDate}:**\n`;
        if (scheduled.length === 0) {
          summary += `Bạn chưa có lịch trình nào trong khoảng thời gian này. Thoải mái sắp xếp nhé!`;
        } else {
          summary += scheduled.map(t => `• **${t.startTime} - ${t.endTime || ''}**: ${t.title} [${t.status}]`).join('\n');
        }
        return { name, result: { tasks, summary } };
      }

      case 'find_free_time': {
        const duration = args.durationMinutes || 45;
        const slots = await CalendarService.findFreeSlots(args.date, duration);
        let summary = `🕒 **Khoảng thời gian trống ngày ${args.date} (tối thiểu ${duration} phút):**\n`;
        if (slots.length === 0) {
          summary += `Ngày này lịch của bạn đã kín, không có khoảng trống đủ ${duration} phút.`;
        } else {
          summary += slots.map(s => `• Từ **${s.startTime}** đến **${s.endTime}** (${s.durationMinutes} phút trống)`).join('\n');
          summary += `\n💡 Bạn có muốn tôi xếp công việc vào một trong các khung giờ trên không?`;
        }
        return { name, result: { slots, summary } };
      }

      case 'get_projects': {
        const projects = await ProjectService.getAll();
        let summary = `🚀 **Danh sách Dự Án hiện tại:**\n`;
        summary += projects.map(p => `• **${p.name}** — Tiến độ: **${p.progress}%** (${p.status})`).join('\n');
        return { name, result: { projects, summary } };
      }

      case 'create_project': {
        const newProj = await ProjectService.create(args);
        return {
          name,
          result: {
            project: newProj,
            summary: `✨ Đã tạo dự án mới: **${newProj.name}**`,
          },
        };
      }

      case 'suggest_daily_priorities': {
        const energy = args.energyPreference || 'BALANCED';
        const prioritized = await PriorityService.suggestDailyPriorities(args.date, energy);
        let summary = `🎯 **Gợi ý công việc nên làm trước (Chiến lược: ${energy}):**\n\n`;
        if (prioritized.length === 0) {
          summary += `✨ Tuyệt vời! Hiện tại bạn không có công việc tồn đọng nào cần xử lý.`;
        } else {
          const topList = prioritized.slice(0, 5);
          summary += topList
            .map((item, idx) => {
              const diffText = item.task.difficulty ? `[Độ khó: ${item.task.difficulty}]` : '';
              const estText = item.task.estimatedMinutes ? `(~${item.task.estimatedMinutes}p)` : '';
              return `**${idx + 1}. ${item.badge} ${item.task.title}** ${diffText} ${estText}\n   *Lý do:* ${item.reason}`;
            })
            .join('\n\n');
          if (prioritized.length > 5) {
            summary += `\n\n*(... và ${prioritized.length - 5} công việc khác có độ ưu tiên thấp hơn)*`;
          }
        }
        return { name, result: { prioritized, summary } };
      }

      case 'summarize_work': {
        const timeFrame = args.timeFrame || 'this_week';
        const report = await AnalyticsService.getWorkSummary(timeFrame);
        let summary = `📊 **Báo cáo tiến độ: ${report.timeFrame}**\n\n`;
        summary += `• ✅ **Đã hoàn thành:** ${report.completedCount} việc (${report.completionRatePercent}% tỷ lệ hoàn thành)\n`;
        summary += `• ⏳ **Còn dở dang/chưa xong:** ${report.pendingCount} việc\n`;
        summary += `• ⚠️ **Bị trễ hạn (Overdue):** ${report.overdueCount} việc\n\n`;

        if (report.overdueTasks.length > 0) {
          summary += `🚨 **Các việc trễ hạn cần chú ý gấp:**\n`;
          summary += report.overdueTasks
            .slice(0, 4)
            .map(t => `- **${t.title}** (Hạn chót: ${t.dueDate || 'Hôm qua'})`)
            .join('\n');
          summary += `\n\n💡 Bạn có thể nói *"Dời các việc trễ sang ngày mai"* để tôi xếp lại lịch giúp bạn!\n\n`;
        }

        if (report.completedTasks.length > 0) {
          summary += `🎉 **Một số việc nổi bật bạn đã hoàn thành:**\n`;
          summary += report.completedTasks
            .slice(0, 3)
            .map(t => `- [x] **${t.title}**`)
            .join('\n');
        }

        return { name, result: { report, summary } };
      }

      case 'natural_search_tasks': {
        const res = await NaturalSearchService.search(args.query || '');
        let summary = res.summary + '\n';
        if (res.tasks.length > 0) {
          summary += res.tasks
            .slice(0, 5)
            .map(t => `- [${t.status === 'DONE' ? 'x' : ' '}] **${t.title}** (${t.priority}) ${t.startDate ? `[${t.startDate}]` : ''}`)
            .join('\n');
          if (res.tasks.length > 5) summary += `\n... và ${res.tasks.length - 5} việc khác.`;
        }
        return { name, result: { tasks: res.tasks, summary } };
      }

      case 'breakdown_goal': {
        const goalTitle = args.goalTitle || 'Mục tiêu mới';
        const duration = args.durationMonths || 6;
        const hours = args.hoursPerWeek || 5;
        const plan = await GoalService.planGoalDecomposition(goalTitle, duration, hours);
        const committed = await GoalService.commitGoalRoadmap(plan);

        let summary = `🚀 **Đã thiết lập mục tiêu: "${goalTitle}"**\n\n`;
        summary += `• Thời hạn: **${duration} tháng** (~${hours} giờ/tuần)\n`;
        summary += `• Đã tạo dự án mới: **${committed.project.name}**\n`;
        summary += `• Đã phân rã và khởi tạo: **${committed.taskCount} công việc** chia theo từng tuần.\n\n`;
        summary += `📋 **Lộ trình các mốc tiêu biểu:**\n`;
        summary += plan.milestones
          .slice(0, 4)
          .map(m => `• **${m.title}**: ${m.tasks.length} task (vd: *${m.tasks[0]?.title || ''}*)`)
          .join('\n');

        return { name, result: { plan, committed, summary } };
      }

      case 'get_urgent_tasks': {
        const days = args.days || 3;
        const tasks = await TaskService.getUrgentTasks(days);
        let summary = `🔥 **Công việc khẩn cấp (Hạn trong ${days} ngày hoặc ưu tiên HIGH):**\n\n`;
        if (tasks.length === 0) {
          summary += `✨ Không có công việc nào khẩn cấp trong ${days} ngày tới. Bạn đang kiểm soát tiến độ rất tốt!`;
        } else {
          summary += tasks
            .slice(0, 6)
            .map(t => {
              const due = t.dueDate ? `[Hạn: ${t.dueDate}]` : '[Chưa đặt hạn]';
              return `• **${t.title}** (${t.priority}) — ${due}`;
            })
            .join('\n');
          if (tasks.length > 6) summary += `\n... và ${tasks.length - 6} việc khác.`;
        }
        return { name, result: { tasks, summary } };
      }

      case 'reschedule_overdue_tasks': {
        const targetDate = args.targetDate || (() => {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          return tomorrow.toISOString().split('T')[0];
        })();
        const startTime = args.startTime || '09:00';

        // Lấy tất cả việc trễ hạn hoặc việc hôm nay chưa xong
        const todayStr = new Date().toISOString().split('T')[0];
        const overdue = await TaskService.getOverdueTasks(todayStr);
        const todayPending = await TaskService.getAll({
          startDate: todayStr,
          status: 'TODO',
        });

        const toReschedule = Array.from(new Set([...overdue.map(t => t.id), ...todayPending.map(t => t.id)]));

        if (toReschedule.length === 0) {
          return {
            name,
            result: {
              summary: `✨ Không có công việc tồn đọng nào cần dời lịch. Tất cả đều đã xong hoặc đúng tiến độ!`,
            },
          };
        }

        const count = await TaskService.batchReschedule(toReschedule, targetDate, startTime);
        return {
          name,
          result: {
            rescheduledCount: count,
            summary: `🗓️ **Đã dời ${count} công việc tồn đọng** sang ngày **${targetDate}** lúc **${startTime}**. Bạn có thể yên tâm nghỉ ngơi hôm nay!`,
          },
        };
      }

      default:
        return { name, result: { error: 'Unknown tool' } };
    }
  }
}
